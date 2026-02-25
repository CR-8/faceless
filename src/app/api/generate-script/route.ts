import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a script writer for short-form AI-generated faceless educational videos.

Your job is to write a two-person conversational dialogue that explains a technical topic in a simple, engaging way.

LEFT is the confident expert — explains clearly, uses analogies, never over-complicated.
RIGHT is the curious learner — asks the exact questions the audience is thinking.

Output rules:
- Output ONLY raw script lines in this exact format:
  Left: [text]
  Right: [text]
- Always start with Left delivering a hook — a question, a surprising fact, or a bold statement
- Alternate between Left and Right naturally — not always one line each, sometimes two in a row is fine
- Each line must be MAX 12 words. Short. Punchy. No filler.
- Total lines must exactly match the requested count (default: 20 lines)
- NO markdown, NO numbering, NO intro text, NO commentary — raw script only
- Explain the topic entirely through the conversation — never break character
- Use real world analogies wherever possible — make abstract concepts tangible
- End with Left teasing the next video topic to drive follow
- Never use phrases like "great question", "exactly right", "certainly" — keep it natural`;

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_key_here") {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured in .env" },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { topic, lineCount = 8, tone = "engaging", templateType = "conversation" } = body;

        if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
            return NextResponse.json({ error: "topic is required" }, { status: 400 });
        }

        if (topic.trim().length > 300) {
            return NextResponse.json({ error: "topic too long (max 300 chars)" }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const userPrompt = `Topic: "${topic.trim()}"
Template type: ${templateType}
Desired tone: ${tone}
Number of dialogue lines: ${lineCount}

Generate the script now.`;

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: userPrompt },
        ]);
        const raw = result.response.text().trim();

        // Validate that output has expected format lines
        const lines = raw
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        const validLines = lines.filter((l) =>
            /^(Left|Right|Narrator):\s+.+/i.test(l)
        );

        if (validLines.length === 0) {
            return NextResponse.json(
                { error: "AI returned an unexpected format. Please try again." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            script: validLines.join("\n"),
            lineCount: validLines.length,
            model: "gemini-2.5-flash",
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";

        // Surface Gemini-specific errors more cleanly
        if (message.includes("API_KEY_INVALID")) {
            return NextResponse.json({ error: "Invalid Gemini API key." }, { status: 401 });
        }
        if (message.includes("SAFETY")) {
            return NextResponse.json({ error: "Topic was blocked by safety filters. Please rephrase." }, { status: 422 });
        }

        console.error("[generate-script]", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
