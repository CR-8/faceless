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
  isDone: boolean;
  stepDone: Record<StepId, boolean>;
  startPoll: (jobId: string) => void;
  handleGenerate: () => Promise<void>;
  handleAIScript: () => Promise<void>;
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
  const [voiceL, setVoiceL] = useState("en-US-Wavenet-D");
  const [voiceR, setVoiceR] = useState("en-US-Wavenet-F");
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
  const [subColor, setSubColor] = useState("#2196f3");
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
  const isDone = job.status === "completed";

  const stepDone: Record<StepId, boolean> = {
    background: !!bg,
    characters: !!leftChar && !!rightChar,
    script: parsedScript.length > 0,
    settings: true,
    generate: isDone,
  };

  const canGenerate = !!bg && parsedScript.length > 0 && !isRunning;

  useEffect(() => {
    if (parsedScript.length === 0) return;
    const interval = setInterval(() => {
      setPreviewLineIdx(p => (p + 1) % parsedScript.length);
      setPreviewWordIdx(0);
    }, 2800);
    return () => clearInterval(interval);
  }, [parsedScript.length]); // length is stable enough as dep

  useEffect(() => {
    const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
    if (!activeLine) return;
    const wordCount = activeLine.text.split(' ').filter(Boolean).length;
    const interval = setInterval(() => {
      setPreviewWordIdx(p => (p + 1) % wordCount);
    }, 320);
    return () => clearInterval(interval);
  }, [previewLineIdx, parsedScript.length]); // eslint-disable-line

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
        if (d.status === "completed" || d.status === "failed") {
          clearInterval(pollRef.current!);
          if (d.status === "completed") setShowModal(true);
        }
      } catch { /* ignore */ }
    }, 2000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

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
      step, setStep, bg, setBg, leftChar, setLeftChar, rightChar, setRightChar, script, setScript, format, setFormat, duration, setDuration, voiceL, setVoiceL, voiceR, setVoiceR, subAlign, setSubAlign, topic, setTopic, aiLoading, setAiLoading, aiError, setAiError, job, setJob, showModal, setShowModal, previewLineIdx, previewWordIdx, subSize, setSubSize, subPos, setSubPos, subColor, setSubColor, subFont, setSubFont, charSize, setCharSize, charPosV, setCharPosV, parsedScript, canGenerate, isRunning, isDone, stepDone, startPoll, handleGenerate, handleAIScript
    }}>
      {children}
    </StudioContext.Provider>
  );
}
