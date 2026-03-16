"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { 
  StepId, Format, Speaker, ScriptLine, BgAsset, CharAsset, JobPoll, Metadata,
  BG_ASSETS, CHAR_ASSETS, VOICES, EXAMPLE 
} from "./constants";

interface StudioState {
  step: StepId;
  setStep: (s: StepId) => void;
  bg: BgAsset | null;
  setBg: (b: BgAsset | null) => void;
  leftChar: CharAsset | null;
  setLeftChar: (c: CharAsset | null) => void;
  rightChar: CharAsset | null;
  setRightChar: (c: CharAsset | null) => void;
  script: string;
  setScript: (s: string) => void;
  format: Format;
  setFormat: (f: Format) => void;
  duration: number;
  setDuration: (d: number) => void;
  voiceL: string;
  setVoiceL: (v: string) => void;
  voiceR: string;
  setVoiceR: (v: string) => void;
  subAlign: string;
  setSubAlign: (a: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  aiLoading: boolean;
  setAiLoading: (l: boolean) => void;
  aiError: string | null;
  setAiError: (e: string | null) => void;
  job: JobPoll;
  setJob: React.Dispatch<React.SetStateAction<JobPoll>>;
  showModal: boolean;
  setShowModal: (s: boolean) => void;
  previewLineIdx: number;
  previewWordIdx: number;
  subSize: number;
  setSubSize: (s: number) => void;
  subPos: number;
  setSubPos: (s: number) => void;
  subColor: string;
  setSubColor: (s: string) => void;
  subFont: string;
  setSubFont: (s: string) => void;
  charSize: number;
  setCharSize: (s: number) => void;
  charPosV: number;
  setCharPosV: (s: number) => void;
  parsedScript: ScriptLine[];
  canGenerate: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isDone: boolean;
  stepDone: Record<StepId, boolean>;
  startPoll: (jobId: string) => void;
  handleGenerate: () => Promise<void>;
  handleAIScript: () => Promise<void>;
  handleCancel: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
}

const StudioContext = createContext<StudioState | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<StepId>("background");
  const [bg, setBg] = useState<BgAsset | null>(BG_ASSETS[0]);
  const [leftChar, setLeftChar] = useState<CharAsset | null>(null);
  const [rightChar, setRightChar] = useState<CharAsset | null>(null);
  const [script, setScript] = useState(EXAMPLE);
  const [format, setFormat] = useState<Format>("9:16");
  const [duration, setDuration] = useState(60);
  const [voiceL, setVoiceL] = useState("voice-ben");
  const [voiceR, setVoiceR] = useState("voice-gojo");
  const [subAlign, setSubAlign] = useState("center");
  const [topic, setTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [job, setJob] = useState<JobPoll>({ id: null, status: "idle", progress: 0, phase: "", outputUrl: null, error: null });
  const [showModal, setShowModal] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previewLineIdx, setPreviewLineIdx] = useState(0);
  const [previewWordIdx, setPreviewWordIdx] = useState(0);

  const [subSize, setSubSize] = useState(56);
  const [subPos, setSubPos] = useState(50);
  const [subColor, setSubColor] = useState("#44f321ff");
  const [subFont, setSubFont] = useState("Arial");
  const [charSize, setCharSize] = useState(50);
  const [charPosV, setCharPosV] = useState(0);

  const parsedScript: ScriptLine[] = script.trim().split("\n").filter(Boolean).map((l) => {
    const m = l.match(/^(left|right):\s*(.+)/i);
    return m
      ? { speaker: m[1].toLowerCase() as Speaker, text: m[2].trim() }
      : { speaker: "left" as Speaker, text: l.trim() };
  }).filter(line => line.text.length > 0);

  const isRunning = job.status === "processing" || job.status === "queued";
  const isPaused = job.status === "paused";
  const isDone = job.status === "completed";

  const stepDone: Record<StepId, boolean> = {
    background: !!bg,
    characters: !!leftChar && !!rightChar,
    script: parsedScript.length > 0,
    settings: true,
    generate: isDone,
  };

  const canGenerate = !!bg && parsedScript.length > 0 && !isRunning && !isPaused;

  useEffect(() => {
    if (leftChar?.voiceId) setVoiceL(leftChar.voiceId);
  }, [leftChar?.voiceId]);

  useEffect(() => {
    if (rightChar?.voiceId) setVoiceR(rightChar.voiceId);
  }, [rightChar?.voiceId]);

  // Preview animation: ~400ms per word, 300ms gap between lines
  const MS_PER_WORD = 400;
  const LINE_GAP_MS = 300;

  useEffect(() => {
    if (parsedScript.length === 0) return;
    let lineIdx = 0;
    let wordIdx = 0;
    let cancelled = false;

    setPreviewLineIdx(0);
    setPreviewWordIdx(0);

    function scheduleNext() {
      if (cancelled) return;
      const line = parsedScript[lineIdx];
      const words = line.text.split(' ').filter(Boolean);
      const isLastWord = wordIdx >= words.length - 1;

      if (isLastWord) {
        setTimeout(() => {
          if (cancelled) return;
          lineIdx = (lineIdx + 1) % parsedScript.length;
          wordIdx = 0;
          setPreviewLineIdx(lineIdx);
          setPreviewWordIdx(0);
          scheduleNext();
        }, MS_PER_WORD + LINE_GAP_MS);
      } else {
        setTimeout(() => {
          if (cancelled) return;
          wordIdx += 1;
          setPreviewWordIdx(wordIdx);
          scheduleNext();
        }, MS_PER_WORD);
      }
    }

    scheduleNext();
    return () => { cancelled = true; };
  }, [parsedScript.length]); // eslint-disable-line

  const handleAIScript = async () => {
    if (!topic.trim()) return;
    setAiLoading(true); setAiError(null);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          lineCount: Math.max(8, Math.round(duration / 3)),
          tone: "engaging",
          templateType: "conversation",
          leftCharName: leftChar?.name || "Person A",
          rightCharName: rightChar?.name || "Person B"
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setScript(d.script);
    } catch (e: unknown) { setAiError(e instanceof Error ? e.message : "Error"); }
    finally { setAiLoading(false); }
  };

  const startPoll = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const d = await res.json();
        setJob({ id: jobId, status: d.status, progress: d.progress, phase: d.phase, outputUrl: d.outputUrl, error: d.error });
        if (d.status === "completed" || d.status === "failed" || d.status === "cancelled") {
          clearInterval(pollRef.current!);
          if (d.status === "completed") setShowModal(true);
        }
      } catch { /* ignore */ }
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleCancel = async () => {
    if (!job.id) return;
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
    if (pollRef.current) clearInterval(pollRef.current);
    setJob(p => ({ ...p, status: 'cancelled', phase: 'Cancelled', progress: 0 }));
  };

  const handlePause = async () => {
    if (!job.id) return;
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    setJob(p => ({ ...p, status: 'paused', phase: 'Paused' }));
  };

  const handleResume = async () => {
    if (!job.id) return;
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    setJob({ id: null, status: "processing", progress: 2, phase: "Submitting...", outputUrl: null, error: null });
  };

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

  return (
    <StudioContext.Provider value={{
      step, setStep, bg, setBg, leftChar, setLeftChar, rightChar, setRightChar,
      script, setScript, format, setFormat, duration, setDuration,
      voiceL, setVoiceL, voiceR, setVoiceR, subAlign, setSubAlign,
      topic, setTopic, aiLoading, setAiLoading, aiError, setAiError,
      job, setJob, showModal, setShowModal,
      previewLineIdx, previewWordIdx,
      subSize, setSubSize, subPos, setSubPos, subColor, setSubColor, subFont, setSubFont,
      charSize, setCharSize, charPosV, setCharPosV,
      parsedScript, canGenerate, isRunning, isPaused, isDone, stepDone,
      startPoll, handleGenerate, handleAIScript, handleCancel, handlePause, handleResume
    }}>
      {children}
    </StudioContext.Provider>
  );
}
