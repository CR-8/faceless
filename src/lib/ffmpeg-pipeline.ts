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
import { consola } from 'consola';
import { ScriptLine, Format, updateJob, getJob, waitIfPaused } from './job-store';
import { synthesizeSpeech } from './google-tts';

import { BG_ASSETS, CHAR_ASSETS } from '@/data/data';

/* ─── Real background video paths (relative to /public) ─────────────────── */
export const BG_VIDEO_MAP: Record<string, string> = Object.fromEntries(
    BG_ASSETS.map(asset => [asset.id, asset.videoUrl.replace(/^\//, '')])
);

/* ─── Real character image paths (relative to /public) ───────────────────── */
export const CHAR_IMAGE_MAP: Record<string, string> = Object.fromEntries(
    CHAR_ASSETS.map(asset => [asset.id, asset.imgUrl.replace(/^\//, '')])
);

export const CHAR_COLORS_MAP: Record<string, string> = Object.fromEntries(
    CHAR_ASSETS.map(asset => [asset.id, asset.accentColor])
);

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
        consola.start(`[${label}] Running ${cmd} ${args.slice(0, 6).join(' ')}...`);
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
   Words are chunked PER LINE (never crossing speaker boundaries).
   Each chunk is 3-5 words, sized by character length (max 18 chars).
   Active word = accent color, rest = white. ──────────────────────────── */
function buildAss(wordsData: WordTiming[], config: AssConfig): string {
    const { w, h, fontSize, posV, color, fontFamily, subAlign } = config;
    const accentAss = hexToAssColor(color);
    const whiteAss = '&H00FFFFFF&';
    const reelFontSize = Math.max(fontSize, 60);
    const marginV = Math.round(h * (posV / 100));
    const alignment = ASS_ALIGN[subAlign] ?? 2;

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

    // Group words back into their original lines by detecting speaker changes.
    // We use the speaker field on WordTiming to detect line boundaries.
    const lines: WordTiming[][] = [];
    let currentLine: WordTiming[] = [];
    let currentSpeaker = wordsData[0]?.speaker ?? '';

    for (const wt of wordsData) {
        if (wt.speaker !== currentSpeaker && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentSpeaker = wt.speaker;
        }
        currentLine.push(wt);
    }
    if (currentLine.length > 0) lines.push(currentLine);

    // For each line, split into chunks of max 4 words OR 18 chars — whichever hits first.
    // This keeps subtitles clean and never bleeds across speaker turns.
    const MAX_WORDS = 4;
    const MAX_CHARS = 18;

    let events = '';

    for (const lineWords of lines) {
        const chunks: WordTiming[][] = [];
        let chunk: WordTiming[] = [];
        let chunkChars = 0;

        for (const wt of lineWords) {
            const addLen = chunk.length === 0 ? wt.word.length : wt.word.length + 1;
            if (chunk.length > 0 && (chunk.length >= MAX_WORDS || chunkChars + addLen > MAX_CHARS)) {
                chunks.push(chunk);
                chunk = [];
                chunkChars = 0;
            }
            chunk.push(wt);
            chunkChars += addLen;
        }
        if (chunk.length > 0) chunks.push(chunk);

        // Emit one ASS dialogue event per word, showing the full chunk with active word highlighted.
        // The event's time window is exactly that word's duration — no overlap with next line.
        for (const ch of chunks) {
            ch.forEach((activeWord, wIdx) => {
                const styledLine = ch.map((wt, idx) =>
                    idx === wIdx
                        ? `{\\1c${accentAss}}${wt.word}{\\1c${whiteAss}}`
                        : `{\\1c${whiteAss}}${wt.word}`
                ).join(' ');
                events += `Dialogue: 0,${toAssTime(activeWord.start)},${toAssTime(activeWord.end)},Reel,,0,0,0,,${styledLine}\n`;
            });
        }
    }

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
        consola.info(`[${jobId}] Phase 1 — TTS (${script.length} lines)`);

        // Dynamically compute the TTS speaking rate to match the target video duration
        let estimatedNaturalMs = 0;
        for (const line of script) {
            const words = line.text.split(/\s+/).filter(Boolean).length;
            estimatedNaturalMs += (words / 2.5) * 1000; // ~150 words per minute naturally
            estimatedNaturalMs += (line.text.match(/[\.\!\?]/g) || []).length * 500;
            estimatedNaturalMs += (line.text.match(/[,]/g) || []).length * 200;
            estimatedNaturalMs += 400; // implicit newline break
        }
        
        const estimatedNaturalSecs = estimatedNaturalMs / 1000;
        
        // Ratio = Natural / Target.
        // edge-tts reliably fails above +40% — cap there.
        // If the script is too long for the target, we accept the natural pace
        // rather than pushing rate to unsafe territory. The video will just be
        // longer than requested, which is better than a crash.
        let ratio = estimatedNaturalSecs / duration;
        let ratePercent = Math.round((ratio - 1) * 100);
        ratePercent = Math.max(-40, Math.min(40, ratePercent));
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

        consola.info(`[${jobId}] Estimated script duration: ${estimatedNaturalSecs.toFixed(1)}s for ${duration}s target. Set TTS rate to: ${rateStr}`);

        const audioPaths: string[] = [];
        for (let i = 0; i < script.length; i++) {
            // Check cancel/pause before each TTS line
            if (!(await waitIfPaused(jobId))) throw new Error('Job cancelled');
            const line = script[i];
            const p = path.join(tmpDir, `line_${i}.mp3`);
            
            await synthesizeSpeech(
                { text: line.text, voiceName: line.speaker === 'left' ? voiceLeft : voiceRight, rate: rateStr },
                p
            );
            audioPaths.push(p);
            updateJob(jobId, { progress: 5 + Math.round((i / script.length) * 18) });
            consola.success(`[TTS] line ${i + 1}/${script.length} [${line.speaker}]: "${line.text.slice(0, 50)}"`);
        }

        /* ═══ Phase 2: Measure durations ═══ */
        if (!(await waitIfPaused(jobId))) throw new Error('Job cancelled');
        updateJob(jobId, { phase: 'Measuring Durations', progress: 24 });
        consola.info(`[${jobId}] Phase 2 — Measuring via ffprobe`);

        const durations: number[] = [];
        for (const ap of audioPaths) {
            const d = await getAudioDuration(ap);
            durations.push(d);
            consola.ready(`${path.basename(ap)} length: ${d.toFixed(3)}s`);
        }

        const timings: { start: number; end: number }[] = [];
        let cursor = 0;
        for (const d of durations) {
            timings.push({ start: cursor, end: cursor + d });
            cursor += d;
        }
        const audioDuration = cursor;
        // Use actual audio duration (+ small tail) as the video length.
        // The user's `duration` only influenced TTS rate — we never pad with silence.
        const videoDuration = Math.max(audioDuration + 0.3, 5);

        /* ═══ Phase 3: Merge audio ═══ */
        if (!(await waitIfPaused(jobId))) throw new Error('Job cancelled');
        updateJob(jobId, { phase: 'Merging Audio', progress: 33 });
        consola.info(`[${jobId}] Phase 3 — Audio Merge`);

        const concatList = path.join(tmpDir, 'concat.txt');
        await fs.writeFile(concatList, audioPaths.map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'\n`).join(''), 'utf-8');

        const mergedAudio = path.join(tmpDir, 'audio.wav');
        await runProcess('ffmpeg', [
            '-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', mergedAudio,
        ], `${jobId}/merge-audio`);

        /* ═══ Phase 4: ASS generation ═══ */
        if (!(await waitIfPaused(jobId))) throw new Error('Job cancelled');
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
        consola.success(`[${jobId}] Phase 4 — ASS written: ${assPath}`);

        /* ═══ Phase 5: FFmpeg render ═══ */
        if (!(await waitIfPaused(jobId))) throw new Error('Job cancelled');
        updateJob(jobId, { phase: 'FFmpeg Render', progress: 50 });
        consola.info(`[${jobId}] Phase 5 — FFmpeg Final Render (${w}x${h} ${format} ${videoDuration.toFixed(1)}s)`);

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
        ffArgs.push('-t', videoDuration.toFixed(3));
        ffArgs.push(outFile);

        await runProcess('ffmpeg', ffArgs, `${jobId}/render`);

        consola.box(`[${jobId}] ✓ Complete → /outputs/${jobId}.mp4`);
        updateJob(jobId, { progress: 98 });
        return `/outputs/${jobId}.mp4`;

    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => { });
    }
}
