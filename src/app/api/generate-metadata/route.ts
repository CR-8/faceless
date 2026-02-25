import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getJob } from '@/lib/job-store';

/**
 * POST /api/generate-metadata
 * Given a completed job ID, use Gemini to generate:
 *  - Optimized title
 *  - Caption / hook
 *  - Hashtags for YouTube, TikTok, Instagram
 */
export async function POST(req: NextRequest) {
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key || key === 'your_key_here') {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        const { jobId } = await req.json();
        if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 });

        const job = getJob(jobId);
        if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

        const scriptText = job.script.map((l) => `${l.speaker}: ${l.text}`).join('\n');
        const topic = job.topic || 'general topic';
        const platform = job.format === '9:16' ? 'TikTok/Reels/Shorts' : job.format === '16:9' ? 'YouTube' : 'Instagram';

        const prompt = `You are a YouTube growth strategist specializing in educational faceless channels.

        Video details:
        - Topic: "${topic}"
        - Primary platform: ${platform}
        - Format: ${job.format}
        - Duration: ${job.duration}s
        - Script:
        ${scriptText}

        Rules:
        - Return pure JSON only. Zero markdown. Zero explanation. Zero commentary.
        - Do not wrap in backticks or code blocks.
        - All hashtags must be lowercase, no # symbol, no spaces within a tag
        - Title must create curiosity without being clickbait
        - Caption first line must work as a standalone hook even without the video

        Return this exact JSON structure:
        {
        "title": "Curiosity-driven title under 70 chars, includes the core keyword, no ALL CAPS, no clickbait",
        "caption": "First line is a standalone hook. 3 sentences max. Conversational tone. 2 relevant emojis only.",
        "tags": {
            "youtube": ["10 tags, mix of broad and specific, ranked by relevance"],
            "tiktok": ["12 tags, mix of trending general tags and niche topic tags"],
            "instagram": ["15 tags, mix of high volume and low competition tags"]
        },
        "description": "2 sentences. First sentence states what the viewer will learn. Second sentence includes 3 natural keywords and ends with a call to action."
        }`;

        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();

        // Extract JSON from response (handle possible markdown wrapping)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 });
        }

        const metadata = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ metadata });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
