"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, ChevronRight, Check, Zap, Loader2 } from "lucide-react";
import { useStudio } from "./StudioContext";
import { STEPS } from "./constants";

export function StudioHeader() {
  const { step, setStep, stepDone, isRunning, job, canGenerate, handleGenerate } = useStudio();

  return (
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

      <div className="flex gap-1 items-center">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1 px-2 py-[3px] rounded-md border-none cursor-pointer transition-all ${step === s.id ? "bg-[rgba(201,255,71,0.1)] text-[var(--accent-lime)]" : stepDone[s.id] ? "bg-transparent text-[var(--text-secondary)]" : "bg-transparent text-[var(--text-disabled)]"}`}
            >
              {stepDone[s.id] && step !== s.id ? <Check size={10} className="text-[var(--accent-lime)]" /> : <span className="font-mono text-[9px]">0{i + 1}</span>}
              <span className="font-mono text-[10px]">{s.label}</span>
            </button>
            {i < 4 && <ChevronRight size={10} className="text-[var(--text-disabled)]" />}
          </div>
        ))}
      </div>

      <div className="flex-1" />
      {isRunning && (
        <Badge
          variant="outline"
          className="font-mono bg-[rgba(79,110,247,.08)] border-[rgba(79,110,247,.25)] text-[var(--accent-blue)] text-[10px] gap-1 flex items-center"
        >
          <Loader2 size={9} className="animate-spin" />
          {job.phase} · {job.progress}%
        </Badge>
      )}
      <Button
        disabled={!canGenerate}
        onClick={() => { setStep("generate"); handleGenerate(); }}
        className="h-[30px] text-[12px] font-semibold gap-[6px]"
        style={{
          background: canGenerate ? "var(--accent-lime)" : "var(--bg-raised)",
          color: canGenerate ? "#0f0f11" : "var(--text-disabled)",
          boxShadow: canGenerate ? "var(--shadow-lime)" : "none",
        }}
      >
        <Zap size={13} />
        Generate
      </Button>
    </header>
  );
}
