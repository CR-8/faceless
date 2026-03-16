/**
 * FFmpeg render pipeline — runs entirely locally via child_process.spawn.
 * Output saved to /public/outputs/ → accessible as /outputs/filename.mp4
 *
 * Requirements:
 *   - ffmpeg + ffprobe in PATH (run: ffmpeg -version to verify)
 *   - GOOGLE_API_KEY env var for TTS
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ScriptLine, Format, updateJob } from './job-store';
import { synthesizeSpeech } from './google-tts';

/* ─── Real background video paths (relative to /public) ─────────────────── */
export const BG_VIDEO_MAP: Record<string, string> = {
    'mine-1': 'background/Minecraft/mine-1.mp4',
    'mine-2': 'background/Minecraft/mine-2.mp4',
    'mine-3': 'background/Minecraft/mine-3.mp4',
    'mine-4': 'background/Minecraft/mine-4.mp4',
    'mine-5': 'background/Minecraft/mine-5.mp4',
    'mine-6': 'background/Minecraft/mine-6.mp4',
    'mine-7': 'background/Minecraft/mine-7.mp4',
    'mine-8': 'background/Minecraft/mine-8.mp4',
    'mine-9': 'background/Minecraft/mine-9.mp4',
    'ss-1': 'background/Subway Surfers/ss-vid-1.mp4',
    'ss-2': 'background/Subway Surfers/ss-vid-2.mp4',
    'ss-3': 'background/Subway Surfers/ss-vid-3.mp4',
    'ss-4': 'background/Subway Surfers/ss-vid-4.mp4',
    'ss-5': 'background/Subway Surfers/ss-vid-5.mp4',
    'ss-6': 'background/Subway Surfers/ss-vid-6.mp4',
    'ss-7': 'background/Subway Surfers/ss-vid-7.mp4',
    'other-1': 'background/Other/other-1.mp4',
    'other-2': 'background/Other/other-2.mp4',
    'other-3': 'background/Other/other-3.mp4',
    'other-4': 'background/Other/other-4.mp4',
    'other-5': 'background/Other/other-5.mp4',
};

/* ─── Real character image paths (relative to /public) ───────────────────── */
export const CHAR_IMAGE_MAP: Record<string, string> = {
    'ben-shapiro': 'character/Ben Shapiro.webp',
    'gojo': 'character/Gojo.webp',
    'joe-biden': 'character/Joe Biden.webp',
    'obama': 'character/Obama.webp',
    'peter-griffin': 'character/Peter Griffin.webp',
    'spongebob': 'character/Spongebob.webp',
    'squidward': 'character/Squiward.webp',
    'stewie-griffin': 'character/Stewie Griffin.webp',
    'sukuna': 'character/Sukuna.webp',
    'trump': 'character/Trump.webp',
};

export const CHAR_COLORS_MAP: Record<string, string> = {
    'ben-shapiro': '#2196f3',
    'gojo': '#9c27b0',
    'joe-biden': '#1565c0',
    'obama': '#ef6c00',
    'peter-griffin': '#795548',
    'spongebob': '#fdd835',
    'squidward': '#00897b',
    'stewie-griffin': '#e53935',
    'sukuna': '#b71c1c',
    'trump': '#ff6f00',
};

/* ─── Format dimensions ──────────────────────────────────────────────────── */
const FORMAT_DIMS: Record<Format, { w: number; h: number }> = {
    '9:16': { w: 1080, h: 1920 },
    '16:9': { w: 1920, h: 1080 },
    '1:1': { w: 1080, h: 1080 },
};

/* ─── Alignment mapping: 'left'=1, 'center'=2, 'right'=3 (bottom row in ASS) ──── */
const ASS_ALIGN: Record<string, number> = { left: 1, center: 2, right: 3 };

/* ─── Escape path for FFmpeg on Windows ──────────────────────────────────── */
function ffmpegPath(p: string): string {
    return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1\\:');
}

/* ─── Run a process, stream its output to the terminal ───────────────────── */
function runProcess(cmd: string, args: string[], label: string): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log(`\n══ [${label}] ${cmd} ${args.slice(0, 6).join(' ')} …\n`);
        const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        proc.stdout.on('data', (d: Buffer) => process.stdout.write(d));
        proc.stderr.on('data', (d: Buffer) => process.stderr.write(d));
        proc.on('error', (e) => reject(new Error(`${label}: ${e.message}`)));
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`${label} exited ${code}`));
        });
    });
}

/* ─── Get audio duration via ffprobe ─────────────────────────────────────── */
function getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const p = spawn('ffprobe', [
            '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
        ]);
        let out = '';
        p.stdout.on('data', (d: Buffer) => (out += d.toString()));
        p.on('error', reject);
        p.on('close', (code) => {
            if (code === 0) resolve(parseFloat(out.trim()) || 0);
            else reject(new Error(`ffprobe failed (${code})`));
        });
    });
}

/* ─── ASS builder ────────────────────────────────────────────────────────── */
function toAssTime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function hexToAssColor(hex: string): string {
    // #RRGGBB -> &HBBGGRR&
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
        return `&H00${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}&`;
    }
    return `&H00FFFFFF&`;
}

interface AssConfig {
    w: number;
    h: number;
    fontSize: number;
    posV: number;      // bottom margin in pixels (from posV %)
    color: string;     // accent hex
    fontFamily: string;
    subAlign: string;  // 'left' | 'center' | 'right'
}

export interface WordTiming {
    word: string;
    start: number;
    end: number;
    speaker: string;
}

/* ─── Reel ASS builder ────────────────────────────────────────────────────────
   Micro-chunks of 3 words. Active word = accent color.
   All other words = pure white. No scale, no dimming. ─────────────────── */
function buildAss(wordsData: WordTiming[], config: AssConfig): string {
    const { w, h, fontSize, posV, color, fontFamily, subAlign } = config;
    const accentAss = hexToAssColor(color);
    const whiteAss = '&H00FFFFFF&';
    const reelFontSize = Math.max(fontSize, 60);
    const marginV = Math.round(h * (posV / 100));
    const alignment = ASS_ALIGN[subAlign] ?? 2; // default center-bottom

    const out = [`[Script Info]`,
        `ScriptType: v4.00+`,
        `PlayResX: ${w}`,
        `PlayResY: ${h}`,
        `WrapStyle: 1`,
        ``,
        `[V4+ Styles]`,
        `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`,
        `Style: Reel,${fontFamily},${reelFontSize},${whiteAss},&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,${alignment},30,30,${marginV},1`,
        ``,
        `[Events]`,
        `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,
    ].join('\r\n') + '\r\n';

    // Micro-chunks of 3 words
    const CHUNK = 3;
    const chunks: WordTiming[][] = [];
    for (let i = 0; i < wordsData.length; i += CHUNK) {
        chunks.push(wordsData.slice(i, i + CHUNK));
    }

    let events = '';
    chunks.forEach(chunk => {
        if (!chunk.length) return;
        chunk.forEach((activeWord, wIdx) => {
            // Build styled text: accent for active word, white for rest
            const styledLine = chunk.map((wt, idx) => {
                if (idx === wIdx) {
                    return `{\\1c${accentAss}}${wt.word}{\\1c${whiteAss}}`;
                }
                return `{\\1c${whiteAss}}${wt.word}`;
            }).join(' ');

            events += `Dialogue: 0,${toAssTime(activeWord.start)},${toAssTime(activeWord.end)},Reel,,0,0,0,,${styledLine}\n`;
        });
    });

    return out + events;
}


/* ─── Main render pipeline ──────────────────────────────────────────────── */
export interface RenderParams {
    jobId: string;
    script: ScriptLine[];
    bgId: string;
    leftCharId: string;
    rightCharId: string;
    format: Format;
    duration: number;
    voiceLeft: string;
    voiceRight: string;
    subAlign: string;
    subSize: number;
    subPos: number;
    subColor: string;
    subFont: string;
    charSize: number;
    charPosV: number;
}

export async function runRenderPipeline(params: RenderParams): Promise<string> {
    const { jobId, script, bgId, leftCharId, rightCharId, format, duration, voiceLeft, voiceRight, subSize, subPos, subColor, subFont, charSize, charPosV } = params;
    const { w, h } = FORMAT_DIMS[format];

    const publicDir = path.join(process.cwd(), 'public');
    const tmpDir = path.join(os.tmpdir(), 'facelessvideo', jobId);
    const outDir = path.join(publicDir, 'outputs');
    const outFile = path.join(outDir, `${jobId}.mp4`);

    await fs.mkdir(tmpDir, { recursive: true });
    await fs.mkdir(outDir, { recursive: true });

    try {
        /* ═══ Phase 1: TTS ═══ */
        updateJob(jobId, { phase: 'Voice Generation (TTS)', progress: 5 });
        console.log(`\n╔══ [${jobId}] Phase 1 — TTS (${script.length} lines)\n`);

        const audioPaths: string[] = [];
        for (let i = 0; i < script.length; i++) {
            const line = script[i];
            const p = path.join(tmpDir, `line_${i}.mp3`);
            await synthesizeSpeech(
                { text: line.text, voiceName: line.speaker === 'left' ? voiceLeft : voiceRight },
                p
            );
            audioPaths.push(p);
            updateJob(jobId, { progress: 5 + Math.round((i / script.length) * 18) });
            console.log(`  [TTS] line ${i + 1}/${script.length} [${line.speaker}]: "${line.text.slice(0, 50)}"`);
        }

        /* ═══ Phase 2: Measure durations ═══ */
        updateJob(jobId, { phase: 'Measuring Durations', progress: 24 });
        console.log(`\n╠══ [${jobId}] Phase 2 — ffprobe\n`);

        const durations: number[] = [];
        for (const ap of audioPaths) {
            const d = await getAudioDuration(ap);
            durations.push(d);
            console.log(`  ${path.basename(ap)} → ${d.toFixed(3)}s`);
        }

        const timings: { start: number; end: number }[] = [];
        let cursor = 0;
        for (const d of durations) {
            timings.push({ start: cursor, end: cursor + d });
            cursor += d;
        }
        const audioDuration = cursor;
        const videoDuration = Math.max(audioDuration + 0.5, 5);
        const clampedDuration = duration;

        /* ═══ Phase 3: Merge audio ═══ */
        updateJob(jobId, { phase: 'Merging Audio', progress: 33 });
        console.log(`\n╠══ [${jobId}] Phase 3 — Audio merge\n`);

        const concatList = path.join(tmpDir, 'concat.txt');
        await fs.writeFile(concatList, audioPaths.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'\n`).join(''), 'utf-8');

        const mergedAudio = path.join(tmpDir, 'audio.mp3');
        await runProcess('ffmpeg', [
            '-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', mergedAudio,
        ], `${jobId}/merge-audio`);

        /* ═══ Phase 4: ASS generation ═══ */
        updateJob(jobId, { phase: 'Generating Subtitles', progress: 42 });
        const assPath = path.join(tmpDir, 'subs.ass');

        // Map line-level audio timings into true word-level precision mapping for our ASS generator
        const allWordsTiming: WordTiming[] = [];
        script.forEach((line, i) => {
            const lineStart = timings[i].start;
            const lineEnd = timings[i].end;
            const lineDuration = lineEnd - lineStart;

            const words = line.text.trim().split(/\s+/).filter(Boolean);
            if (words.length === 0) return;

            const totalChars = words.join('').length;
            let currentWordStart = lineStart;

            words.forEach(w => {
                const wordDuration = (w.length / Math.max(1, totalChars)) * lineDuration;
                allWordsTiming.push({
                    word: w,
                    start: currentWordStart,
                    end: currentWordStart + wordDuration,
                    speaker: line.speaker
                });
                currentWordStart += wordDuration;
            });
        });

        const assData = buildAss(allWordsTiming, {
            w, h,
            fontSize: subSize,
            posV: subPos,
            color: subColor,
            fontFamily: subFont,
            subAlign: params.subAlign,
        });
        await fs.writeFile(assPath, assData, 'utf-8');
        console.log(`\n╠══ [${jobId}] Phase 4 — ASS written: ${assPath}\n`);

        /* ═══ Phase 5: FFmpeg render ═══ */
        updateJob(jobId, { phase: 'FFmpeg Render', progress: 50 });
        console.log(`\n╠══ [${jobId}] Phase 5 — FFmpeg render  (${w}x${h} ${format} ${clampedDuration.toFixed(1)}s)\n`);

        // Resolve real paths
        const bgRelPath = BG_VIDEO_MAP[bgId];
        const leftImgRel = CHAR_IMAGE_MAP[leftCharId];
        const rightImgRel = CHAR_IMAGE_MAP[rightCharId];
        const bgPath = bgRelPath ? path.join(publicDir, bgRelPath) : null;
        const leftPath = leftImgRel ? path.join(publicDir, leftImgRel) : null;
        const rightPath = rightImgRel ? path.join(publicDir, rightImgRel) : null;

        // Character position and size
        // charSize is a percentage of height (e.g. 50 = 50% of height)
        const charH = Math.round(h * (charSize / 100));
        // charPosV is 0 (bottom) to 100 (top)
        const charY = Math.round((h - charH) * ((100 - charPosV) / 100));
        const overlayX = '(W-w)/2';
        const overlayY = charY.toString();

        // Build inputs array
        const ffArgs: string[] = ['-y'];

        // Input 0: background (loop to cover duration)
        if (bgPath) {
            ffArgs.push('-stream_loop', '-1', '-i', bgPath);
        } else {
            ffArgs.push('-f', 'lavfi', '-i', `color=c=0x111111:s=${w}x${h}:r=30`);
        }

        // Input 1: merged audio
        ffArgs.push('-i', mergedAudio);

        // Inputs 2+: character images
        let charInputIdx = 2;
        const leftIdx = leftPath ? charInputIdx++ : -1;
        const rightIdx = rightPath ? charInputIdx : -1;
        if (leftPath) ffArgs.push('-loop', '1', '-i', leftPath);
        if (rightPath) ffArgs.push('-loop', '1', '-i', rightPath);

        // Build filter_complex
        const filterParts: string[] = [];
        let prevLabel = '0:v';

        // Scale/crop background to target resolution
        filterParts.push(`[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}[bg]`);
        prevLabel = 'bg';

        // Evaluate timing expressions for each character
        const leftExprs = script.map((line, i) => line.speaker === 'left' ? `between(t,${timings[i].start.toFixed(3)},${timings[i].end.toFixed(3)})` : null).filter(Boolean);
        const rightExprs = script.map((line, i) => line.speaker === 'right' ? `between(t,${timings[i].start.toFixed(3)},${timings[i].end.toFixed(3)})` : null).filter(Boolean);

        // Compute enable expressions using + (logical OR)
        const leftEnable = leftExprs.length > 0 ? leftExprs.join('+') : '0';
        const rightEnable = rightExprs.length > 0 ? rightExprs.join('+') : '0';

        // Apply Left character if present 
        if (leftPath && leftIdx >= 0 && leftExprs.length > 0) {
            filterParts.push(`[${leftIdx}:v]scale=-1:${charH},setsar=1[cl]`);
            filterParts.push(`[${prevLabel}][cl]overlay=x=${overlayX}:y=${overlayY}:enable='${leftEnable}'[ovL]`);
            prevLabel = 'ovL';
        }

        // Apply Right character if present
        if (rightPath && rightIdx >= 0 && rightExprs.length > 0) {
            filterParts.push(`[${rightIdx}:v]scale=-1:${charH},setsar=1[cr]`);
            filterParts.push(`[${prevLabel}][cr]overlay=x=${overlayX}:y=${overlayY}:enable='${rightEnable}'[ovR]`);
            prevLabel = 'ovR';
        }

        // Burn subtitles using ASS filter (native formatting)
        const escapedAss = ffmpegPath(assPath);
        filterParts.push(`[${prevLabel}]ass='${escapedAss}'[vout]`);

        ffArgs.push('-filter_complex', filterParts.join(';'));
        ffArgs.push('-map', '[vout]', '-map', '1:a');
        ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
        ffArgs.push('-c:a', 'aac', '-b:a', '128k');
        ffArgs.push('-t', String(clampedDuration));
        ffArgs.push(outFile);

        await runProcess('ffmpeg', ffArgs, `${jobId}/render`);

        console.log(`\n╚══ [${jobId}] ✓ Complete → /outputs/${jobId}.mp4\n`);
        updateJob(jobId, { progress: 98 });
        return `/outputs/${jobId}.mp4`;

    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { });
    }
}
