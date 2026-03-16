import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a script writer for short-form AI-generated faceless videos.

Your job is to write a two-person conversational dialogue that explains a topic in an engaging way.

Output rules:
- Output ONLY raw script lines in this exact format:
  Left: [text]
  Right: [text]
- Characters must act naturally according to their given personas.
- Each line must be MAX 15 words. Short. Punchy. No filler.
- Total lines must exactly match the requested count.
- NO markdown, NO numbering, NO intro text, NO commentary — raw script only.
- Explain the topic entirely through the conversation — never break character.
- End with a teaser to drive followers.
- Never use generic phrases like "great question", "exactly right", "certainly" — keep it natural.`;

/** Maps a tone label to a Gemini temperature value */
function toneToTemperature(tone: string): number {
  const map: Record<string, number> = {
    engaging: 0.8,
    funny: 1.0,
    serious: 0.4,
    educational: 0.5,
    dramatic: 0.9,
  };
  return map[tone.toLowerCase()] ?? 0.8;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_key_here") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env" },
        { status: 500 }
      );
    }

    // ── Parse & validate body ────────────────────────────────────────────────
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
    } = body as Record<string, unknown>;

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "topic is required." }, { status: 400 });
    }
    if (topic.trim().length > 900) {
      return NextResponse.json({ error: "topic too long (max 300 chars)." }, { status: 400 });
    }

    const parsedLineCount = Number(lineCount);
    if (!Number.isInteger(parsedLineCount) || parsedLineCount < 2 || parsedLineCount > 40) {
      return NextResponse.json(
        { error: "lineCount must be an integer between 2 and 40." },
        { status: 400 }
      );
    }

    // ── Build Gemini client ──────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Proper way to supply a system instruction in the Gemini SDK
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: toneToTemperature(String(tone)),
        maxOutputTokens: 1024,
        // candidateCount defaults to 1 — explicit for clarity
        candidateCount: 1,
      },
      // Relax safety thresholds just enough for creative content
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

    // ── Build user prompt ────────────────────────────────────────────────────
    const userPrompt = `Topic: "${topic.trim()}"
Template type: ${templateType}
Desired tone: ${tone}
Number of dialogue lines: ${parsedLineCount}
Left Character Persona: ${leftCharName}
Right Character Persona: ${rightCharName}

IMPORTANT: Embody the specific personas of ${leftCharName} and ${rightCharName}. Use their defining quirks, mannerisms, and catchphrases in the dialogue. Keep it entertaining and true to character! Note: Continue prefixing the lines with "Left:" and "Right:".

Generate the script now.`;

    // ── Call Gemini ──────────────────────────────────────────────────────────
    const result = await model.generateContent(userPrompt);
    const raw = result.response.text().trim();

    if (!raw) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    // ── Parse & validate output ──────────────────────────────────────────────
    const validLines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^(Left|Right|Narrator):\s*.+/i.test(l));

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
      tone,
      topic: topic.trim(),
    });
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