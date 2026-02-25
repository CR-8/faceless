"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Film, Users, FileText, Settings2, Zap, Check, Download,
  Wand2, Loader2, Play, ChevronRight, Copy, RefreshCw, X, Tag, Captions,
} from "lucide-react";
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "@/components/kibo-ui/video-player";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type StepId = "background" | "characters" | "script" | "settings" | "generate";
type Format = "9:16" | "16:9" | "1:1";
type Speaker = "left" | "right";
interface ScriptLine { speaker: Speaker; text: string }
interface BgAsset { id: string; name: string; tag: string; primaryColor: string; videoUrl: string }
interface CharAsset { id: string; name: string; tag: string; accentColor: string; imgUrl: string }
interface JobPoll { id: string | null; status: "idle" | "queued" | "processing" | "completed" | "failed"; progress: number; phase: string; outputUrl: string | null; error: string | null }
interface Metadata { title: string; caption: string; description: string; tags: { youtube: string[]; tiktok: string[]; instagram: string[] } }

/* ─── Real Base Assets ───────────────────────────────────────────────────── */
const BG_ASSETS: BgAsset[] = [
  { id: 'mine-1', name: 'Minecraft #1', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-1.mp4' },
  { id: 'mine-2', name: 'Minecraft #2', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-2.mp4' },
  { id: 'mine-3', name: 'Minecraft #3', tag: 'Minecraft', primaryColor: '#33691e', videoUrl: '/background/Minecraft/mine-3.mp4' },
  { id: 'mine-4', name: 'Minecraft #4', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-4.mp4' },
  { id: 'mine-5', name: 'Minecraft #5', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-5.mp4' },
  { id: 'mine-6', name: 'Minecraft #6', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-6.mp4' },
  { id: 'mine-7', name: 'Minecraft #7', tag: 'Minecraft', primaryColor: '#2e7d32', videoUrl: '/background/Minecraft/mine-7.mp4' },
  { id: 'mine-8', name: 'Minecraft #8', tag: 'Minecraft', primaryColor: '#33691e', videoUrl: '/background/Minecraft/mine-8.mp4' },
  { id: 'mine-9', name: 'Minecraft #9', tag: 'Minecraft', primaryColor: '#1b5e20', videoUrl: '/background/Minecraft/mine-9.mp4' },
  { id: 'ss-1', name: 'Subway Surfers #1', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-1.mp4' },
  { id: 'ss-2', name: 'Subway Surfers #2', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-2.mp4' },
  { id: 'ss-3', name: 'Subway Surfers #3', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-3.mp4' },
  { id: 'ss-4', name: 'Subway Surfers #4', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-4.mp4' },
  { id: 'ss-5', name: 'Subway Surfers #5', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-5.mp4' },
  { id: 'ss-6', name: 'Subway Surfers #6', tag: 'Subway Surfers', primaryColor: '#bf360c', videoUrl: '/background/Subway Surfers/ss-vid-6.mp4' },
  { id: 'ss-7', name: 'Subway Surfers #7', tag: 'Subway Surfers', primaryColor: '#c62828', videoUrl: '/background/Subway Surfers/ss-vid-7.mp4' },
  { id: 'other-1', name: 'Cinematic #1', tag: 'Other', primaryColor: '#311b92', videoUrl: '/background/Other/other-1.mp4' },
  { id: 'other-2', name: 'Cinematic #2', tag: 'Other', primaryColor: '#0f3460', videoUrl: '/background/Other/other-2.mp4' },
  { id: 'other-3', name: 'Cinematic #3', tag: 'Other', primaryColor: '#006994', videoUrl: '/background/Other/other-3.mp4' },
  { id: 'other-4', name: 'Cinematic #4', tag: 'Other', primaryColor: '#1a237e', videoUrl: '/background/Other/other-4.mp4' },
  { id: 'other-5', name: 'Cinematic #5', tag: 'Other', primaryColor: '#0d0d2b', videoUrl: '/background/Other/other-5.mp4' },
];

const CHAR_ASSETS: CharAsset[] = [
  { id: 'ben-shapiro', name: 'Ben Shapiro', tag: 'Pundit', accentColor: '#2196f3', imgUrl: '/character/Ben Shapiro.webp' },
  { id: 'gojo', name: 'Gojo', tag: 'Anime', accentColor: '#9c27b0', imgUrl: '/character/Gojo.webp' },
  { id: 'joe-biden', name: 'Joe Biden', tag: 'Pundit', accentColor: '#1565c0', imgUrl: '/character/Joe Biden.webp' },
  { id: 'obama', name: 'Obama', tag: 'Pundit', accentColor: '#ef6c00', imgUrl: '/character/Obama.webp' },
  { id: 'peter-griffin', name: 'Peter Griffin', tag: 'Cartoon', accentColor: '#795548', imgUrl: '/character/Peter Griffin.webp' },
  { id: 'spongebob', name: 'Spongebob', tag: 'Cartoon', accentColor: '#fdd835', imgUrl: '/character/Spongebob.webp' },
  { id: 'squidward', name: 'Squidward', tag: 'Cartoon', accentColor: '#00897b', imgUrl: '/character/Squiward.webp' },
  { id: 'stewie-griffin', name: 'Stewie Griffin', tag: 'Cartoon', accentColor: '#e53935', imgUrl: '/character/Stewie Griffin.webp' },
  { id: 'sukuna', name: 'Sukuna', tag: 'Anime', accentColor: '#b71c1c', imgUrl: '/character/Sukuna.webp' },
  { id: 'trump', name: 'Trump', tag: 'Pundit', accentColor: '#ff6f00', imgUrl: '/character/Trump.webp' },
];

const VOICES = [
  { id: "en-US-Wavenet-D", name: "David (US ♂)" },
  { id: "en-US-Wavenet-F", name: "Fiona (US ♀)" },
  { id: "en-US-Wavenet-A", name: "Alex (US ♂)" },
  { id: "en-US-Wavenet-C", name: "Clara (US ♀)" },
  { id: "en-GB-Wavenet-B", name: "Ben (UK ♂)" },
  { id: "en-GB-Wavenet-C", name: "Charlotte (UK ♀)" },
];

const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: "background", label: "Background", icon: Film },
  { id: "characters", label: "Characters", icon: Users },
  { id: "script", label: "Script", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "generate", label: "Generate", icon: Zap },
];

const EXAMPLE = `Left: Have you tried this new AI video tool yet?
Right: Not yet — I heard it generates everything automatically.
Left: Exactly. You type a script, it handles voice, subtitles, everything.
Right: Even the characters and background?
Left: Yep. Fully automated. Zero manual editing.
Right: That's actually unbelievable.`;


/* ─── Timeline track ───────────────────────────────────────────────────── */
function TimelineTrack({ label, color, blocks }: {
  label: string; color: string;
  blocks: { widthPct: number; label?: string; offset: number }[]
}) {
  return (
    <div className="flex items-center gap-2 h-[26px]">
      <span className="w-[52px] font-mono text-[9px] text-[var(--text-muted)] text-right shrink-0">{label}</span>
      <div className="flex-1 h-[18px] bg-[var(--bg-raised)] rounded relative overflow-hidden">
        {blocks.map((b, i) => (
          <div key={i} className="absolute h-full rounded-[3px] flex items-center pl-1 opacity-80"
            style={{ left: `${b.offset}%`, width: `${b.widthPct}%`, background: color }}>
            {b.label && <span className="font-mono text-[7px] text-black/70 whitespace-nowrap overflow-hidden">{b.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function StudioPage() {
  const [step, setStep] = useState<StepId>("background");
  const [bg, setBg] = useState<BgAsset | null>(BG_ASSETS[0]); // Default to first BG
  const [leftChar, setLeftChar] = useState<CharAsset | null>(null);
  const [rightChar, setRightChar] = useState<CharAsset | null>(null);
  const [script, setScript] = useState(EXAMPLE);
  const [format, setFormat] = useState<Format>("9:16");
  const [duration, setDuration] = useState(60);
  const [voiceL, setVoiceL] = useState("en-US-Wavenet-D");
  const [voiceR, setVoiceR] = useState("en-US-Wavenet-F");
  const [subAlign, setSubAlign] = useState("center");
  const [topic, setTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [job, setJob] = useState<JobPoll>({ id: null, status: "idle", progress: 0, phase: "", outputUrl: null, error: null });
  const [showModal, setShowModal] = useState(false);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<"youtube" | "tiktok" | "instagram">("tiktok");
  const [copied, setCopied] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previewLineIdx, setPreviewLineIdx] = useState(0);
  const [previewWordIdx, setPreviewWordIdx] = useState(0); // for reel word-highlight animation

  // Subtitle Customizations
  const [subSize, setSubSize] = useState(56);
  const [subPos, setSubPos] = useState(50); // percentage string conceptually
  const [subColor, setSubColor] = useState("#2196f3");
  const [subFont, setSubFont] = useState("Arial");

  // Character Customizations
  const [charSize, setCharSize] = useState(50); // percentage of height
  const [charPosV, setCharPosV] = useState(0); // 0 = Bottom, 100 = Top

  const parsedScript: ScriptLine[] = script.trim().split("\n").filter(Boolean).map((l) => {
    const m = l.match(/^(left|right|Left|Right):\s*(.+)/i);
    return m ? { speaker: m[1].toLowerCase() as Speaker, text: m[2].trim() } : { speaker: "left", text: l };
  });

  /* ── Live Preview Line Cycle ──────────────────────────────────────── */
  useEffect(() => {
    if (parsedScript.length === 0) return;
    const interval = setInterval(() => {
      setPreviewLineIdx(p => (p + 1) % parsedScript.length);
      setPreviewWordIdx(0); // reset word on new line
    }, 2800);
    return () => clearInterval(interval);
  }, [parsedScript.length]);

  /* ── Reel Word Highlight Cycle (faster tick) ──────────────────────── */
  useEffect(() => {
    const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
    if (!activeLine) return;
    const wordCount = activeLine.text.split(' ').filter(Boolean).length;
    const interval = setInterval(() => {
      setPreviewWordIdx(p => (p + 1) % wordCount);
    }, 320);
    return () => clearInterval(interval);
  }, [previewLineIdx, parsedScript.length]); // eslint-disable-line

  /* ── AI Script ─────────────────────────────────────────────────────── */
  const handleAIScript = async () => {
    if (!topic.trim()) return;
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, lineCount: 8, tone: "engaging", templateType: "conversation" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setScript(d.script);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Error"); }
    finally { setAiLoading(false); }
  };

  /* ── Polling ────────────────────────────────────────────────────────── */
  const startPoll = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const d = await res.json();
        setJob({ id: jobId, status: d.status, progress: d.progress, phase: d.phase, outputUrl: d.outputUrl, error: d.error });
        if (d.status === "completed" || d.status === "failed") {
          clearInterval(pollRef.current!);
          if (d.status === "completed") setShowModal(true);
        }
      } catch { /* ignore */ }
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  /* ── Submit Job ─────────────────────────────────────────────────────── */
  const handleGenerate = async () => {
    setJob({ id: null, status: "processing", progress: 2, phase: "Submitting…", outputUrl: null, error: null });
    try {
      const res = await fetch("/api/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: parsedScript, bgId: bg?.id ?? "space",
          leftCharId: leftChar?.id ?? "char-a", rightCharId: rightChar?.id ?? "char-b",
          format, duration, voiceLeft: voiceL, voiceRight: voiceR,
          subAlign, topic,
          subSize, subPos, subColor, subFont, charSize, charPosV
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setJob((p) => ({ ...p, id: d.jobId }));
      startPoll(d.jobId);
    } catch (e: unknown) {
      setJob((p) => ({ ...p, status: "failed", error: e instanceof Error ? e.message : "Error" }));
    }
  };

  /* ── Metadata ───────────────────────────────────────────────────────── */
  const handleMetadata = async () => {
    if (!job.id) return;
    setMetaLoading(true); setMetaError(null);
    try {
      const res = await fetch("/api/generate-metadata", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMetadata(d.metadata);
    } catch (e: unknown) { setMetaError(e instanceof Error ? e.message : "Error"); }
    finally { setMetaLoading(false); }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(null), 2000);
  };

  const isRunning = job.status === "processing" || job.status === "queued";
  const isDone = job.status === "completed";

  /* ── Timeline blocks from script ────────────────────────────────────── */
  const totalLines = Math.max(parsedScript.length, 1);
  const lineBlocks = parsedScript.map((l, i) => ({
    widthPct: 100 / totalLines,
    offset: (i / totalLines) * 100,
    label: l.text.slice(0, 12),
    speaker: l.speaker,
  }));

  /* ── Step completion ─────────────────────────────────────────────────── */
  const stepDone: Record<StepId, boolean> = {
    background: !!bg,
    characters: !!leftChar && !!rightChar,
    script: parsedScript.length > 0,
    settings: true,
    generate: isDone,
  };

  const canGenerate = !!bg && parsedScript.length > 0 && !isRunning;

  /* ─── Format preview dimensions ────────────────────────────────────── */
  const previewDims: Record<Format, { w: number; h: number }> = {
    "9:16": { w: 202, h: 360 }, "16:9": { w: 426, h: 240 }, "1:1": { w: 300, h: 300 }
  };
  const pd = previewDims[format];

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0c] font-sans text-[var(--text-primary)] overflow-hidden">
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes glowPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .fade-up{animation:fadeUp .3s ease forwards}
        textarea,input,select{outline:none}
        textarea::placeholder,input::placeholder{color:var(--text-disabled)}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0a0a0c}
        ::-webkit-scrollbar-thumb{background:#232329;border-radius:9999px}
      `}</style>

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="h-[48px] flex items-center gap-3 px-[18px] border-b border-[var(--border-subtle)] bg-black/90 backdrop-blur-md shrink-0 z-20">
        <div className="w-7 h-7 rounded-lg bg-[var(--accent-lime)] flex items-center justify-center">
          <Film size={14} color="#0f0f11" strokeWidth={2.5} />
        </div>
        <span className="font-display font-bold text-[15px] tracking-tight">
          faceless<span className="text-[var(--accent-lime)]">video</span>
        </span>
        <ChevronRight size={13} className="text-[var(--text-disabled)]" />
        <span className="font-mono text-[11px] text-[var(--text-muted)]">New Project</span>

        <Link href="/projects" className="ml-[30px] no-underline flex items-center gap-1.5 text-[var(--text-secondary)] font-mono text-[11px] px-3 py-1 bg-[var(--bg-raised)] rounded-md border border-[var(--border-subtle)] transition-all hover:bg-white/5">
          View Projects Dashboard
        </Link>

        {/* Step breadcrumb */}
        <div className="flex gap-1 items-center ml-auto">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <button onClick={() => setStep(s.id)} className={`flex items-center gap-1 px-2 py-[3px] rounded-md border-none cursor-pointer transition-all ${step === s.id ? "bg-[rgba(201,255,71,0.1)] text-[var(--accent-lime)]" : stepDone[s.id] ? "bg-transparent text-[var(--text-secondary)]" : "bg-transparent text-[var(--text-disabled)]"}`}>
                {stepDone[s.id] && step !== s.id ? <Check size={10} className="text-[var(--accent-lime)]" /> : <span className="font-mono text-[9px]">0{i + 1}</span>}
                <span className="font-mono text-[10px]">{s.label}</span>
              </button>
              {i < 4 && <ChevronRight size={10} className="text-[var(--text-disabled)]" />}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        {isRunning && (
          <Badge variant="outline" style={{ fontFamily: "var(--font-mono)", fontSize: 10, gap: 5, background: "rgba(79,110,247,.08)", borderColor: "rgba(79,110,247,.25)", color: "var(--accent-blue)" }}>
            <Loader2 size={9} className="animate-spin" />{job.phase} · {job.progress}%
          </Badge>
        )}
        <Button disabled={!canGenerate} onClick={() => { setStep("generate"); handleGenerate(); }}
          style={{ height: 30, fontSize: 12, fontWeight: 600, gap: 6, background: canGenerate ? "var(--accent-lime)" : "var(--bg-raised)", color: canGenerate ? "#0f0f11" : "var(--text-disabled)", border: "none", boxShadow: canGenerate ? "var(--shadow-lime)" : "none" }}>
          <Zap size={13} /> Generate
        </Button>
      </header>

      {/* ── Main 3-column area ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — Step wizard content (240px) */}
        <div className="w-[240px] border-r border-[var(--border-subtle)] flex flex-col overflow-hidden bg-[var(--bg-surface)] shrink-0">
          {/* Step nav */}
          <div className="p-2 border-b border-[var(--border-subtle)] flex flex-col gap-0.5">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              return (
                <button key={s.id} onClick={() => setStep(s.id)} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-none cursor-pointer text-left transition-all ${active ? "bg-[rgba(201,255,71,0.08)] text-[var(--accent-lime)]" : stepDone[s.id] ? "bg-transparent text-[var(--text-secondary)]" : "bg-transparent text-[var(--text-muted)]"}`}>
                  <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
                  <span className={`font-sans text-[12px] ${active ? "font-semibold" : "font-normal"}`}>{s.label}</span>
                  {stepDone[s.id] && !active && <Check size={10} className="ml-auto text-[var(--accent-lime)]" />}
                </button>
              );
            })}
          </div>

          {/* Step panel content */}
          <div className="flex-1 overflow-auto p-3">

            {/* BACKGROUND */}
            {step === "background" && (
              <div>
                <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] mb-2">Choose Background</p>
                {bg && (
                  <div className="px-2.5 py-2 rounded-lg mb-2 bg-[#111] border border-white/10">
                    <p className="font-display font-bold text-[12px] text-white m-0">{bg.name}</p>
                    <p className="font-mono text-[9px] text-white/70 m-0">{bg.tag}</p>
                  </div>
                )}
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Select a background from the panel on the right. The player in the center will preview the selected video in loops.</p>
              </div>
            )}

            {/* CHARACTERS */}
            {step === "characters" && (
              <div className="flex flex-col gap-2.5">
                <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] m-0">Assign Characters</p>
                {(["left", "right"] as Speaker[]).map(side => {
                  const sel = side === "left" ? leftChar : rightChar;
                  return (
                    <div key={side}>
                      <p className="font-mono text-[9px] text-[var(--text-muted)] mb-1 uppercase">{side} speaker</p>
                      <div className="p-2 rounded-lg bg-[var(--bg-raised)] flex items-center gap-2" style={{ border: `1px solid ${sel ? sel.accentColor + "40" : "var(--border-card)"}` }}>
                        {sel ? (
                          <>
                            <img src={sel.imgUrl} alt={sel.name} className="w-6 h-9 object-cover rounded-sm" />
                            <span className="text-[12px] text-[var(--text-primary)]">{sel.name}</span>
                          </>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">Select from right →</span>
                        )}
                        {sel && <button onClick={() => side === "left" ? setLeftChar(null) : setRightChar(null)} className="ml-auto bg-transparent border-none cursor-pointer text-[var(--text-muted)]"><X size={12} /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SCRIPT */}
            {step === "script" && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] m-0">AI Script Generator</p>
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !aiLoading) handleAIScript(); }}
                  placeholder="Topic (press Enter)"
                  className="w-full px-2.5 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-sans text-[12px] text-[var(--text-primary)] box-border outline-none focus:border-[var(--accent-lime)] transition-colors placeholder:text-[var(--text-disabled)]" />
                <Button onClick={handleAIScript} disabled={!topic.trim() || aiLoading}
                  className={`w-full h-8 gap-1.5 text-[12px] border-none ${topic.trim() && !aiLoading ? "bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640]" : "bg-[var(--bg-raised)] text-[var(--text-disabled)]"}`}>
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {aiLoading ? "Writing…" : "Generate with AI"}
                </Button>
                {aiError && <p className="font-mono text-[10px] text-red-500 m-0">{aiError}</p>}
                <Separator className="bg-[var(--border-subtle)] my-1" />
                <textarea value={script} onChange={e => setScript(e.target.value)}
                  className="w-full min-h-[160px] px-2.5 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-mono text-[11px] leading-[1.8] text-[var(--text-primary)] resize-y box-border outline-none focus:border-[var(--accent-lime)] transition-colors caret-[#c9ff47] placeholder:text-[var(--text-disabled)]" />
                <p className="font-mono text-[9px] text-[var(--text-muted)] m-0">{parsedScript.length} lines · Left: / Right: prefix per line</p>
              </div>
            )}

            {/* SETTINGS */}
            {step === "settings" && (
              <div className="flex flex-col gap-2.5">
                <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] m-0">Video Settings</p>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">FORMAT</label>
                <div className="flex gap-1">
                  {(["9:16", "16:9", "1:1"] as Format[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-1.5 rounded-lg border font-mono text-[10px] cursor-pointer transition-colors ${format === f ? "border-[rgba(79,110,247,0.4)] bg-[rgba(79,110,247,0.08)] text-[var(--text-primary)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}>
                      {f}
                    </button>
                  ))}
                </div>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">DURATION (seconds)</label>
                <div className="flex gap-1 flex-wrap">
                  {[30, 60, 90, 120].map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] cursor-pointer transition-colors ${duration === d ? "border-[rgba(201,255,71,0.4)] bg-[rgba(201,255,71,0.08)] text-[var(--accent-lime)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}>
                      {d}s
                    </button>
                  ))}
                </div>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">LEFT VOICE</label>
                <select value={voiceL} onChange={e => setVoiceL(e.target.value)} className="px-2.5 py-1.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-mono text-[11px] text-[var(--text-secondary)] outline-none focus:border-white/20 hover:bg-white/5 cursor-pointer">
                  {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">RIGHT VOICE</label>
                <select value={voiceR} onChange={e => setVoiceR(e.target.value)} className="px-2.5 py-1.5 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-mono text-[11px] text-[var(--text-secondary)] outline-none focus:border-white/20 hover:bg-white/5 cursor-pointer">
                  {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE ALIGNMENT</label>
                <div className="flex gap-1 flex-wrap">
                  {(["left", "center", "right"] as const).map(s => (
                    <button key={s} onClick={() => setSubAlign(s)} className={`flex-1 py-1 rounded-[8px] border font-mono text-[9px] capitalize cursor-pointer transition-colors ${subAlign === s ? "border-[rgba(201,255,71,0.3)] bg-[rgba(201,255,71,0.06)] text-[var(--accent-lime)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}>
                      {s}
                    </button>
                  ))}
                </div>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE SIZE</label>
                <div className="flex items-center gap-2.5">
                  <input type="range" min={30} max={100} value={subSize} onChange={e => setSubSize(Number(e.target.value))} className="flex-1 accent-[var(--accent-lime)] cursor-pointer" />
                  <span className="font-mono text-[10px] text-[var(--text-muted)] w-6 text-right">{subSize}</span>
                </div>

                <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE POSITION Y (%)</label>
                <div className="flex items-center gap-2.5">
                  <input type="range" min={0} max={100} value={subPos} onChange={e => setSubPos(Number(e.target.value))} className="flex-1 accent-[var(--accent-lime)] cursor-pointer" />
                  <span className="font-mono text-[10px] text-[var(--text-muted)] w-6 text-right">{subPos}</span>
                </div>

                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>SUBTITLE FONT</label>
                <select value={subFont} onChange={e => setSubFont(e.target.value)} style={{ padding: "7px 10px", background: "var(--bg-base)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                  {["Arial", "Impact", "Verdana", "Trebuchet MS", "Courier New", "Comic Sans MS"].map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>SUBTITLE HIGHLIGHT COLOR</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{subColor}</span>
                </div>

                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", marginTop: 12 }}>CHARACTER SIZE (%)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="range" min={20} max={100} value={charSize} onChange={e => setCharSize(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", width: 24, textAlign: "right" }}>{charSize}</span>
                </div>

                <label style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>CHARACTER VERTICAL POSITION (0=Bottom, 100=Top)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="range" min={0} max={100} value={charPosV} onChange={e => setCharPosV(Number(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", width: 24, textAlign: "right" }}>{charPosV}</span>
                </div>
              </div>
            )}

            {/* GENERATE */}
            {step === "generate" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>Job Summary</p>
                {[
                  ["Background", bg?.name ?? "-"],
                  ["Format", format],
                  ["Duration", `${duration}s`],
                  ["Lines", `${parsedScript.length}`],
                  ["Left voice", VOICES.find(v => v.id === voiceL)?.name.replace(/\s*\(.*?\)/, "") ?? ""],
                  ["Right voice", VOICES.find(v => v.id === voiceR)?.name.replace(/\s*\(.*?\)/, "") ?? ""]
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>{k}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-secondary)" }}>{v}</span>
                  </div>
                ))}
                <Separator className="my-1 bg-[var(--border-subtle)]" />
                {!isRunning && !isDone && (
                  <Button disabled={!canGenerate} onClick={handleGenerate}
                    className={`w-full gap-1.5 h-9 text-[12px] font-semibold border-none ${canGenerate ? "bg-[var(--accent-lime)] text-[#0f0f11] shadow-[var(--shadow-lime)] hover:bg-[#b5e640]" : "bg-[var(--bg-raised)] text-[var(--text-disabled)]"}`}>
                    <Zap size={13} /> Generate Video
                  </Button>
                )}
                {isRunning && (
                  <div className="text-center py-2">
                    <div className="font-display font-extrabold text-[28px] text-[var(--accent-lime)]">{job.progress}%</div>
                    <div className="font-mono text-[10px] text-[var(--accent-blue)] mt-1">{job.phase}</div>
                    <div className="h-1 bg-[var(--bg-raised)] rounded-full overflow-hidden mt-2.5">
                      <div className="h-full bg-[var(--accent-lime)] rounded-full transition-[width] duration-400 ease-in-out" style={{ width: `${job.progress}%` }} />
                    </div>
                  </div>
                )}
                {isDone && (
                  <Button onClick={() => setShowModal(true)} className="w-full gap-1.5 h-9 text-[12px] font-semibold bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640] border-none shadow-[var(--shadow-lime)]">
                    <Play size={13} /> View Result
                  </Button>
                )}
                {job.error && <p className="font-mono text-[10px] text-red-500 leading-relaxed m-0">{job.error}</p>}
              </div>
            )}
          </div>
        </div>

        {/* CENTER — Preview canvas using real video */}
        {/* CENTER — Preview canvas using real video */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-5 relative overflow-hidden">
          {/* Ambient glow */}
          {bg && <div className="absolute inset-0 pointer-events-none animate-[glowPulse_4s_ease-in-out_infinite]" style={{ background: `radial-gradient(ellipse at 50% 40%, ${bg.primaryColor}33, transparent 60%)` }} />}

          {/* Preview frame container */}
          <div className="rounded-xl overflow-hidden border border-[var(--border-card)] shadow-[0_8px_40px_rgba(0,0,0,0.7)] relative bg-black shrink-0 transition-all duration-300" style={{ width: pd.w, height: pd.h }}>

            {/* Real Background Video Preview */}
            {bg ? (
              <VideoPlayer
                className="overflow-hidden absolute inset-0 w-full h-full"
                style={{ borderRadius: 0, "--media-background-color": "transparent" } as React.CSSProperties}
                muted
                looped
                autoPlay
              >
                <VideoPlayerContent
                  src={bg.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </VideoPlayer>
            ) : (
              <div className="absolute inset-0 w-full h-full bg-[var(--bg-raised)]" />
            )}

            {/* Real Characters overlay (Centered, Active speaker only) */}
            {(() => {
              const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
              const activeChar = activeLine?.speaker === 'left' ? leftChar : rightChar;
              const charHeightPx = pd.h * (charSize / 100);

              return activeChar ? (
                <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-end" style={{ bottom: `${charPosV}%` }}>
                  <img src={activeChar.imgUrl} alt="Speaker" className="object-contain" style={{ height: charHeightPx }} />
                </div>
              ) : null;
            })()}

            {/* Subtitle preview (styled dynamically) */}
            {(() => {
              const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
              if (!activeLine) return null;

              /* ── REEL MODE: micro-chunk, word-by-word color swap ── */
              const allWords = activeLine.text.split(' ').filter(Boolean);
              // Show current micro-chunk of 3 words based on previewWordIdx
              const chunkStart = Math.floor(previewWordIdx / 3) * 3;
              const chunk = allWords.slice(chunkStart, chunkStart + 3);
              const localWordIdx = previewWordIdx % 3;
              const reelFontSize = Math.max((subSize / 100) * (pd.h / 8) + 14, 22);

              const justifyClass = subAlign === 'left' ? 'justify-start' : subAlign === 'right' ? 'justify-end' : 'justify-center';
              const textAlign = subAlign as any;

              return (
                <div className={`absolute left-0 right-0 flex items-center ${justifyClass} px-4`} style={{ bottom: `${subPos}%` }}>
                  <div className="font-black leading-tight w-full" style={{
                    fontFamily: `Impact, ${subFont}, sans-serif`,
                    fontSize: reelFontSize,
                    textAlign,
                    WebkitTextStroke: `${Math.max(1.5, reelFontSize / 18)}px #000`,
                    textShadow: "0 3px 10px rgba(0,0,0,0.9)",
                  }}>
                    {chunk.map((w, i) => {
                      const isActive = i === localWordIdx;
                      return (
                        <span key={`${chunkStart}-${i}`}
                          className="inline-block mx-[2px]"
                          style={{
                            color: isActive ? subColor : '#ffffff',
                            transition: 'color 0.1s ease',
                          }}
                        >{w}</span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}


            {/* Format badge */}
            <div className="absolute top-2.5 left-2.5 bg-black/60 px-2 py-1 rounded-md font-mono text-[9px] text-white/90 backdrop-blur-sm">
              {format} · {duration}s
            </div>

            {/* Play indicator when done */}
            {isDone && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <button className="w-14 h-14 rounded-full bg-[var(--accent-lime)] flex items-center justify-center cursor-pointer border-none shadow-[0_8px_20px_rgba(201,255,71,0.3)] hover:scale-105 transition-transform" onClick={() => setShowModal(true)}>
                <Play size={24} color="#0f0f11" fill="#0f0f11" />
              </button>
            </div>}
          </div>

          {/* Playback bar (visual) */}
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-[var(--text-muted)]">00:00:00</span>
            <div className="h-1 bg-[var(--bg-raised)] rounded-full" style={{ width: Math.min(pd.w, 300) }}>
              <div className="h-full bg-[var(--accent-lime)] rounded-full transition-[width] duration-300" style={{ width: isRunning ? `${job.progress}%` : "0%" }} />
            </div>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">00:{String(duration).padStart(2, "0")}:00</span>
          </div>
        </div>

        {/* RIGHT — Asset browser */}
        <div style={{ width: 256, borderLeft: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", background: "var(--bg-surface)", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
              {step === "background" ? "Video Library" : step === "characters" ? "Character Library" : step === "script" ? "Voice Options" : step === "settings" ? "Format Guide" : "Output"}
            </span>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 8 }}>

            {/* Background video grid */}
            {(step === "background") && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {BG_ASSETS.map(b => (
                  <button key={b.id} onClick={() => setBg(b)} style={{
                    padding: 0, border: `1.5px solid ${bg?.id === b.id ? "var(--accent-lime)" : "var(--border-subtle)"}`,
                    borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "var(--bg-raised)",
                    boxShadow: bg?.id === b.id ? "0 0 12px rgba(201,255,71,.2)" : "none", transition: "all 150ms",
                    textAlign: "left", display: "flex", flexDirection: "column"
                  }}>
                    <div style={{ height: 80, position: "relative", background: "#000", width: "100%" }}>
                      <video src={b.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }} preload="metadata" />
                      {bg?.id === b.id && <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "var(--accent-lime)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} color="#0f0f11" /></div>}
                    </div>
                    <div style={{ padding: "6px 8px" }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{b.name}</p>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", margin: 0 }}>{b.tag}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Character grid */}
            {step === "characters" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", margin: "0 0 4px" }}>Click to assign · Tap again for Right</p>
                {CHAR_ASSETS.map(c => {
                  const isLeft = leftChar?.id === c.id;
                  const isRight = rightChar?.id === c.id;
                  const assignChar = () => {
                    if (!leftChar || leftChar.id === c.id) setLeftChar(isLeft ? null : c);
                    else setRightChar(isRight ? null : c);
                  };
                  return (
                    <button key={c.id} onClick={assignChar} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, border: `1px solid ${isLeft || isRight ? c.accentColor + "60" : "var(--border-subtle)"}`,
                      background: isLeft || isRight ? `${c.accentColor}10` : "var(--bg-raised)", cursor: "pointer", transition: "all 150ms",
                    }}>
                      <img src={c.imgUrl} alt={c.name} style={{ width: 32, height: 48, objectFit: "cover", borderRadius: 4, background: "rgba(0,0,0,0.2)" }} />
                      <div style={{ textAlign: "left" }}>
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{c.name}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", margin: 0 }}>{c.tag}</p>
                      </div>
                      {(isLeft || isRight) && <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${c.accentColor}30`, color: c.accentColor }}>{isLeft ? "LEFT" : "RIGHT"}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Script/voice guide */}
            {step === "script" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>Available voices:</p>
                {VOICES.map(v => (
                  <div key={v.id} style={{ padding: "6px 8px", borderRadius: 8, background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-primary)", margin: 0 }}>{v.name}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--text-muted)", margin: 0 }}>{v.id}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Settings guide */}
            {(step === "settings" || step === "generate") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[{ label: "9:16", desc: "Reels / TikTok / Shorts", icon: "📱" }, { label: "16:9", desc: "YouTube landscape", icon: "🖥️" }, { label: "1:1", desc: "Instagram square", icon: "⬜" }].map(f => (
                  <div key={f.label} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 2px" }}>{f.icon} {f.label}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", margin: 0 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Timeline ──────────────────────────────────────────────── */}
      <div className="h-[152px] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2 px-3 flex flex-col gap-1 shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)]">Timeline</span>
          <span className="font-mono text-[9px] text-[var(--text-disabled)]">{parsedScript.length} segments · {duration}s</span>
          {isRunning && <><div className="flex-1" /><Badge variant="outline" className="font-mono text-[9px] bg-[rgba(79,110,247,0.07)] border-[rgba(79,110,247,0.2)] text-[var(--accent-blue)]"><Loader2 size={8} className="animate-spin mr-1" />{job.phase}</Badge></>}
        </div>
        <TimelineTrack label="BG" color={bg?.primaryColor ?? "#333"} blocks={[{ widthPct: 100, offset: 0, label: bg?.name ?? "No background" }]} />
        <TimelineTrack label="CHAR" color={leftChar?.accentColor ?? "#4f6ef7"} blocks={lineBlocks.filter(b => b.speaker === "left").map(b => ({ widthPct: b.widthPct, offset: b.offset, label: b.label }))} />
        <TimelineTrack label="CHAR" color={rightChar?.accentColor ?? "#9b6dff"} blocks={lineBlocks.filter(b => b.speaker === "right").map(b => ({ widthPct: b.widthPct, offset: b.offset, label: b.label }))} />
        <TimelineTrack label="AUDIO" color="#2dd4bf" blocks={parsedScript.length > 0 ? [{ widthPct: 100, offset: 0, label: "Combined audio" }] : []} />
        <TimelineTrack label="SUBS" color="#52525b" blocks={lineBlocks.map(b => ({ widthPct: b.widthPct * .9, offset: b.offset, label: b.label }))} />
      </div>

      {/* ── Completion Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="fade-up w-full max-w-[800px] max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-2xl overflow-hidden flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.8)]">

            {/* Modal header */}
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[rgba(201,255,71,0.12)] border border-[rgba(201,255,71,0.25)] flex items-center justify-center"><Check size={12} className="text-[var(--accent-lime)]" /></div>
              <span className="font-display font-bold text-[15px] text-[var(--text-primary)]">Video Ready</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">· {format} · {duration}s</span>
              <div className="flex-1" />
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div style={{ overflow: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 0 }}>
                {/* Left: Final rendered video player */}
                <div style={{ padding: 24, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-base)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: 280 }}>
                  {job.outputUrl ? (
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-card)", background: "#000", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", width: "100%" }}>
                      <VideoPlayer className="overflow-hidden w-full block">
                        <VideoPlayerContent
                          crossOrigin=""
                          slot="media"
                          src={job.outputUrl}
                          autoPlay
                        />
                        <VideoPlayerControlBar>
                          <VideoPlayerPlayButton />
                          <VideoPlayerSeekBackwardButton />
                          <VideoPlayerSeekForwardButton />
                          <VideoPlayerTimeRange />
                          <VideoPlayerTimeDisplay showDuration />
                          <VideoPlayerMuteButton />
                          <VideoPlayerVolumeRange />
                        </VideoPlayerControlBar>
                      </VideoPlayer>
                    </div>
                  ) : (
                    <div style={{ width: "100%", aspectRatio: format.replace(':', '/'), borderRadius: 12, background: "var(--bg-raised)", border: "1px solid var(--border-card)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Play size={32} style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                  <a href={job.outputUrl ?? ""} download={`faceless_${job.id}.mp4`} style={{ width: "100%" }}>
                    <Button style={{ width: "100%", gap: 6, height: 36, fontSize: 12, fontWeight: 600, background: "var(--accent-lime)", color: "#0f0f11", border: "none", boxShadow: "var(--shadow-lime)" }}>
                      <Download size={14} /> Download MP4
                    </Button>
                  </a>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textAlign: "center", wordBreak: "break-all", opacity: 0.8 }}>{job.outputUrl}</p>
                </div>

                {/* Right: metadata */}
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tag size={14} style={{ color: "var(--accent-lime)" }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>Platform Metadata</span>
                    <div style={{ flex: 1 }} />
                    {!metadata && (
                      <Button onClick={handleMetadata} disabled={metaLoading} style={{ height: 30, gap: 6, fontSize: 11, background: metaLoading ? "var(--bg-raised)" : "var(--accent-lime)", color: metaLoading ? "var(--text-disabled)" : "#0f0f11", border: "none", padding: "0 12px" }}>
                        {metaLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        {metaLoading ? "Generating…" : "Generate with AI"}
                      </Button>
                    )}
                    {metadata && (
                      <Button onClick={handleMetadata} disabled={metaLoading} style={{ height: 30, gap: 6, fontSize: 11, background: "var(--bg-raised)", color: "var(--text-muted)", border: "1px solid var(--border-card)", padding: "0 12px" }}>
                        <RefreshCw size={11} /> Regenerate
                      </Button>
                    )}
                  </div>

                  {metaError && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f87171" }}>{metaError}</p>}

                  {!metadata && !metaLoading && (
                    <div style={{ padding: "32px 20px", borderRadius: 12, border: "1px dashed var(--border-subtle)", textAlign: "center", background: "var(--bg-raised)" }}>
                      <Wand2 size={24} style={{ color: "var(--text-muted)", margin: "0 auto 12px", display: "block" }} />
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", maxWidth: 300, margin: "0 auto" }}>
                        Click "Generate with AI" to create optimized titles, captions, and hashtags tailored for every platform.
                      </p>
                    </div>
                  )}

                  {metadata && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {/* Title */}
                      <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent-lime)", textTransform: "uppercase", letterSpacing: ".1em" }}>Title</span>
                          <button onClick={() => copyText(metadata.title, "title")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "title" ? "var(--accent-lime)" : "var(--text-muted)" }}>{copied === "title" ? <Check size={12} /> : <Copy size={12} />}</button>
                        </div>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0, lineHeight: 1.4 }}>{metadata.title}</p>
                      </div>

                      {/* Content (Caption + Desc) */}
                      <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: ".1em" }}>Caption & Description</span>
                          <button onClick={() => copyText(`${metadata.caption}\n\n${metadata.description}`, "content")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "content" ? "var(--accent-lime)" : "var(--text-muted)" }}>{copied === "content" ? <Check size={12} /> : <Copy size={12} />}</button>
                        </div>
                        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: 1.6 }}>{metadata.caption}</p>
                        {metadata.description && (
                          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.6, borderTop: "1px solid var(--border-card)", paddingTop: 10 }}>{metadata.description}</p>
                        )}
                      </div>

                      {/* Hashtags */}
                      <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-raised)", border: "1px solid var(--border-subtle)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <Captions size={12} style={{ color: "var(--accent-purple)" }} />
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--accent-purple)", textTransform: "uppercase", letterSpacing: ".1em" }}>Hashtags</span>
                          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                            {(["tiktok", "youtube", "instagram"] as const).map(p => (
                              <button key={p} onClick={() => setActiveTag(p)} style={{
                                padding: "3px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                                fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "capitalize", transition: "all 150ms",
                                background: activeTag === p ? "rgba(155,109,255,.15)" : "transparent",
                                color: activeTag === p ? "var(--accent-purple)" : "var(--text-muted)"
                              }}>{p}</button>
                            ))}
                          </div>
                          <button onClick={() => copyText(metadata.tags[activeTag].map(t => `#${t}`).join(" "), "tags")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "tags" ? "var(--accent-lime)" : "var(--text-muted)", marginLeft: 6 }}>
                            {copied === "tags" ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {metadata.tags[activeTag].map(tag => (
                            <span key={tag} style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 8px", borderRadius: 9999, background: "rgba(155,109,255,.08)", color: "#d8b4fe", border: "1px solid rgba(155,109,255,.2)" }}>#{tag}</span>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
