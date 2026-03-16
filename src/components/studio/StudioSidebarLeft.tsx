"use client";

import { useStudio } from "./StudioContext";
import Image from "next/image";
import { STEPS, Format, VOICES } from "./constants";
import { Check, Wand2, Loader2, Play, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudioSidebarLeft() {
  const {
    step, setStep, stepDone, bg, leftChar, setLeftChar, rightChar, setRightChar,
    topic, setTopic, handleAIScript, aiLoading, aiError, script, setScript, parsedScript,
    format, setFormat, duration, setDuration, voiceL, setVoiceL, voiceR, setVoiceR, subAlign, setSubAlign,
    subSize, setSubSize, subPos, setSubPos, subFont, setSubFont, subColor, setSubColor,
    charSize, setCharSize, charPosV, setCharPosV,
    isRunning, isPaused, isDone, canGenerate, handleGenerate, setShowModal, job,
    handleCancel, handlePause, handleResume
  } = useStudio();

  return (
    <div className="w-[240px] border-r border-[var(--border-subtle)] flex flex-col overflow-hidden bg-[var(--bg-surface)] shrink-0">
      <div className="p-2 border-b border-[var(--border-subtle)] flex flex-col gap-0.5">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-none cursor-pointer text-left transition-all ${active ? "bg-[rgba(201,255,71,0.08)] text-[var(--accent-lime)]" : stepDone[s.id] ? "bg-transparent text-[var(--text-secondary)]" : "bg-transparent text-[var(--text-muted)]"}`}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`font-sans text-[12px] ${active ? "font-semibold" : "font-normal"}`}>{s.label}</span>
              {stepDone[s.id] && !active && <Check size={10} className="ml-auto text-[var(--accent-lime)]" />}
            </button>
          );
        })}
      </div>

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
            {(["left", "right"] as const).map(side => {
              const sel = side === "left" ? leftChar : rightChar;
              return (
                <div key={side}>
                  <p className="font-mono text-[9px] text-[var(--text-muted)] mb-1 uppercase">{side} speaker</p>
                  <div className="p-2 rounded-lg bg-[var(--bg-raised)] flex items-center gap-2" style={{ border: `1px solid ${sel ? sel.accentColor + "40" : "var(--border-card)"}` }}>
                    {sel ? (
                      <>
                        <div className="relative w-6 h-9 overflow-hidden rounded-sm shrink-0">
                          <Image src={sel.imgUrl} alt={sel.name} fill className="object-cover object-top" />
                        </div>
                        <span className="text-[12px] text-[var(--text-primary)]">{sel.name}</span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">Select from right </span>
                    )}
                    {sel && (
                      <button onClick={() => side === "left" ? setLeftChar(null) : setRightChar(null)} className="ml-auto bg-transparent border-none cursor-pointer text-[var(--text-muted)]">
                        <X size={12} />
                      </button>
                    )}
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
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !aiLoading) handleAIScript(); }}
              placeholder="Topic (press Enter)"
              className="w-full px-2.5 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-sans text-[12px] text-[var(--text-primary)] box-border outline-none focus:border-[var(--accent-lime)] transition-colors placeholder:text-[var(--text-disabled)]"
            />
            <Button
              onClick={handleAIScript}
              disabled={!topic.trim() || aiLoading}
              className={`w-full h-8 gap-1.5 text-[12px] border-none ${topic.trim() && !aiLoading ? "bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640]" : "bg-[var(--bg-raised)] text-[var(--text-disabled)]"}`}
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {aiLoading ? "Writing" : "Generate with AI"}
            </Button>
            {aiError && <p className="font-mono text-[10px] text-red-500 m-0">{aiError}</p>}
            <Separator className="my-1 bg-[var(--border-subtle)]" />
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              className="w-full min-h-[160px] px-2.5 py-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg font-mono text-[11px] leading-[1.8] text-[var(--text-primary)] resize-y box-border outline-none focus:border-[var(--accent-lime)] transition-colors caret-[#c9ff47] placeholder:text-[var(--text-disabled)]"
            />
            <p className="font-mono text-[9px] text-[var(--text-muted)] m-0">{parsedScript.length} lines  Left: / Right: prefix per line</p>
          </div>
        )}

        {/* SETTINGS */}
        {step === "settings" && (
          <div className="flex flex-col gap-2.5">
            <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] m-0">Video Settings</p>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">FORMAT</label>
            <div className="flex gap-1">
              {(["9:16", "16:9", "1:1"] as Format[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-1.5 rounded-lg border font-mono text-[10px] cursor-pointer transition-colors ${format === f ? "border-[rgba(79,110,247,0.4)] bg-[rgba(79,110,247,0.08)] text-[var(--text-primary)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">DURATION (seconds)</label>
            <div className="flex gap-1 flex-wrap">
              {[30, 60, 90, 120].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] cursor-pointer transition-colors ${duration === d ? "border-[rgba(201,255,71,0.4)] bg-[rgba(201,255,71,0.08)] text-[var(--accent-lime)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}
                >
                  {d}s
                </button>
              ))}
            </div>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">LEFT VOICE</label>
            <Select value={voiceL} onValueChange={setVoiceL}>
              <SelectTrigger className="h-8 text-[11px] bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">RIGHT VOICE</label>
            <Select value={voiceR} onValueChange={setVoiceR}>
              <SelectTrigger className="h-8 text-[11px] bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE ALIGNMENT</label>
            <div className="flex gap-1 flex-wrap">
              {(["left", "center", "right"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSubAlign(s)}
                  className={`flex-1 py-1 rounded-[8px] border font-mono text-[9px] capitalize cursor-pointer transition-colors ${subAlign === s ? "border-[rgba(201,255,71,0.3)] bg-[rgba(201,255,71,0.06)] text-[var(--accent-lime)]" : "border-[var(--border-subtle)] bg-transparent text-[var(--text-muted)] hover:bg-white/5"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="font-mono text-[9px] text-[var(--text-muted)] mt-2">SUBTITLE SIZE</label>
            <Slider
              min={30}
              max={100}
              step={1}
              value={[subSize]}
              onValueChange={([v]) => setSubSize(v)}
              className="py-1"
            />

            <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE POSITION Y (%)</label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[subPos]}
              onValueChange={([v]) => setSubPos(v)}
              className="py-1"
            />

            <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE FONT</label>
            <Select value={subFont} onValueChange={setSubFont}>
              <SelectTrigger className="h-8 text-[11px] bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-primary)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Arial", "Impact", "Verdana", "Trebuchet MS", "Courier New", "Comic Sans MS"].map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="font-mono text-[9px] text-[var(--text-muted)]">SUBTITLE HIGHLIGHT COLOR</label>
            <div className="flex items-center gap-2">
              <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }} />
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{subColor}</span>
            </div>

            <label className="font-mono text-[9px] text-[var(--text-muted)] mt-3">CHARACTER SIZE (%)</label>
            <Slider
              min={20}
              max={100}
              step={1}
              value={[charSize]}
              onValueChange={([v]) => setCharSize(v)}
              className="py-1"
            />

            <label className="font-mono text-[9px] text-[var(--text-muted)]">CHARACTER VERTICAL POSITION (%)</label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[charPosV]}
              onValueChange={([v]) => setCharPosV(v)}
              className="py-1"
            />
          </div>
        )}

        {/* GENERATE */}
        {step === "generate" && (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--text-muted)] m-0">Job Summary</p>
            {[
              ["Background", bg?.name ?? "-"],
              ["Format", format],
              ["Duration", `${duration}s`],
              ["Lines", `${parsedScript.length}`],
              ["Left voice", VOICES.find(v => v.id === voiceL)?.name.replace(/\s*\(.*?\)/, "") ?? ""],
              ["Right voice", VOICES.find(v => v.id === voiceR)?.name.replace(/\s*\(.*?\)/, "") ?? ""]
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="font-mono text-[9px] text-[var(--text-muted)]">{k}</span>
                <span className="font-mono text-[9px] text-[var(--text-secondary)]">{v}</span>
              </div>
            ))}
            <Separator className="my-1 bg-[var(--border-subtle)]" />
            {!isRunning && !isPaused && !isDone && (
              <Button
                disabled={!canGenerate}
                onClick={handleGenerate}
                className={`w-full gap-1.5 h-9 text-[12px] font-semibold border-none ${canGenerate ? "bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640] shadow-[var(--shadow-lime)]" : "bg-[var(--bg-raised)] text-[var(--text-disabled)]"}`}
              >
                <Zap size={13} /> Generate Video
              </Button>
            )}
            {(isRunning || isPaused) && (
              <Button onClick={() => setShowModal(true)} className="w-full gap-1.5 h-9 text-[12px] font-semibold bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640] border-none">
                <Loader2 size={13} className={isRunning ? "animate-spin" : ""} /> View Progress
              </Button>
            )}
            {isDone && (
              <Button
                onClick={() => setShowModal(true)}
                className="w-full gap-1.5 h-9 text-[12px] font-semibold bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640] border-none shadow-[var(--shadow-lime)]"
              >
                <Play size={13} /> View Result
              </Button>
            )}
            {job.error && <p className="font-mono text-[10px] text-red-500 leading-relaxed m-0">{job.error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
