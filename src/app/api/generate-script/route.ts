import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are a script writer for short-form AI-generated faceless videos.

You write two-person dialogues that explain topics engagingly.

STRICT OUTPUT FORMAT — no exceptions:
Left: [line]
Right: [line]

RULES:
- Alternate STRICTLY: Left, Right, Left, Right — no two consecutive same-side lines.
- Max 20 words per line. Violating this disqualifies the line entirely.
- Banned filler phrases: "great question", "exactly", "certainly", "absolutely", "indeed".
- End the final exchange with a cliffhanger or teaser to drive followers.
- Never break character. Never add commentary outside the script.
- Output NOTHING except script lines — no blank leading line, no markdown, no numbering.`;

const TONE_TEMPERATURE_MAP: Record<string, number> = {
  engaging: 0.8,
  funny: 1.0,
  serious: 0.4,
  educational: 0.5,
  dramatic: 0.9,
};

const MAX_TOPIC_LENGTH = 300;
const MIN_LINES = 2;
const MAX_LINES = 40;
const TOKENS_PER_LINE = 100;
const TOKEN_BUFFER_MULTIPLIER = 1.3;
const MAX_TOKEN_CAP = 9000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Maps a tone label to a Gemini temperature value */
function toneToTemperature(tone: string): number {
  return TONE_TEMPERATURE_MAP[tone.toLowerCase()] ?? 0.8;
}

/** Builds a system prompt with persona context injected at model-instruction level */
function buildSystemPrompt(leftName: string, rightName: string): string {
  return `${BASE_SYSTEM_PROMPT}

Characters in this script:
- Left = ${leftName}: embody their personality, quirks, and mannerisms in every single line.
- Right = ${rightName}: embody their personality, quirks, and mannerisms in every single line.`;
}

/** Dynamically calculates a token budget based on requested line count */
function calcMaxTokens(lineCount: number): number {
  return Math.min(Math.ceil(lineCount * TOKENS_PER_LINE * TOKEN_BUFFER_MULTIPLIER), MAX_TOKEN_CAP);
}

/**
 * Cleans raw model output:
 * 1. Strips markdown artifacts (**, *, 1., etc.)
 * 2. Filters to valid Left/Right/Narrator lines
 * 3. Enforces the 20-word cap per line (matches system prompt rule)
 */
function parseScriptLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .map((l) => l.replace(/^[\*\d\.\s#`]+/, "").trim()) // strip markdown/numbering artifacts
    .filter((l) => /^(Left|Right|Narrator):\s*.+/i.test(l))
    .map((l) => {
      const colonIdx = l.indexOf(":");
      const prefix = l.slice(0, colonIdx);
      const content = l.slice(colonIdx + 1).trim();
      // Cap at 20 words but never cut mid-sentence — trim to last complete sentence if over limit
      const words = content.split(" ");
      let text = words.slice(0, 20).join(" ");
      // If we truncated, try to end at the last sentence boundary
      if (words.length > 20) {
        const sentenceEnd = text.search(/[.!?][^.!?]*$/);
        if (sentenceEnd > 10) text = text.slice(0, sentenceEnd + 1);
      }
      return `${prefix}: ${text}`;
    });
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── API key guard ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env" },
        { status: 500 }
      );
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const {
      topic,
      lineCount = 8,
      tone = "engaging",
      templateType = "conversation",
      leftCharName = "Person A",
      rightCharName = "Person B",
      stream: shouldStream = false, // opt-in streaming
    } = body as Record<string, unknown>;

    // ── Input validation ───────────────────────────────────────────────────
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "topic is required." }, { status: 400 });
    }
    if (topic.trim().length > MAX_TOPIC_LENGTH) {
      return NextResponse.json(
        { error: `topic too long (max ${MAX_TOPIC_LENGTH} chars).` },
        { status: 400 }
      );
    }

    const parsedLineCount = Number(lineCount);
    if (
      !Number.isInteger(parsedLineCount) ||
      parsedLineCount < MIN_LINES ||
      parsedLineCount > MAX_LINES
    ) {
      return NextResponse.json(
        { error: `lineCount must be an integer between ${MIN_LINES} and ${MAX_LINES}.` },
        { status: 400 }
      );
    }

    const leftName = String(leftCharName).slice(0, 60);
    const rightName = String(rightCharName).slice(0, 60);
    const safeTone = String(tone).toLowerCase();

    // ── Build Gemini client ────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildSystemPrompt(leftName, rightName), // personas at system level
      generationConfig: {
        temperature: toneToTemperature(safeTone),
        maxOutputTokens: calcMaxTokens(parsedLineCount), // dynamic budget = faster
        candidateCount: 1,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // ── Build user prompt ──────────────────────────────────────────────────
    const userPrompt = `Topic: "${topic.trim()}"
Template type: ${templateType}
Desired tone: ${safeTone}
Number of dialogue lines: ${parsedLineCount}

Generate exactly ${parsedLineCount} alternating lines now. Start with Left.`;

    // ── Streaming path ─────────────────────────────────────────────────────
    if (shouldStream) {
      const streamResult = await model.generateContentStream(userPrompt);

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResult.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(encoder.encode(text));
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Topic": encodeURIComponent(topic.trim()),
          "X-Tone": safeTone,
          "X-Requested-Lines": String(parsedLineCount),
        },
      });
    }

    // ── Standard (non-streaming) path ──────────────────────────────────────
    const result = await model.generateContent(userPrompt);
    const raw = result.response.text().trim();
    console.log("[generate-script] Raw model output:", raw);

    if (!raw) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    const validLines = parseScriptLines(raw);

    if (validLines.length === 0) {
      return NextResponse.json(
        { error: "AI returned an unexpected format. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      script: validLines.join("\n"),
      lineCount: validLines.length,
      requestedLineCount: parsedLineCount,
      model: "gemini-2.5-flash",
      tone: safeTone,
      topic: topic.trim(),
    });

    // ── Error handling ─────────────────────────────────────────────────────
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
      return NextResponse.json({ error: "Invalid Gemini API key." }, { status: 401 });
    }
    if (message.includes("SAFETY") || message.includes("recitation")) {
      return NextResponse.json(
        { error: "Topic was blocked by safety filters. Please rephrase." },
        { status: 422 }
      );
    }
    if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { error: "Gemini API quota exceeded. Please try again later." },
        { status: 429 }
      );
    }
    if (message.includes("DEADLINE_EXCEEDED") || message.includes("timeout")) {
      return NextResponse.json(
        { error: "Request timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error("[generate-script]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}