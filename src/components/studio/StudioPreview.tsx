"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useStudio } from "./StudioContext";
import { Copy, Download, RefreshCw, X, Tag, Captions, Check, Play, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function StudioPreview() {
  const {
    bg, leftChar, rightChar, parsedScript, previewLineIdx, previewWordIdx, format,
    subSize, subPos, subFont, subColor, charSize, charPosV, subAlign, step,
    job, isDone, isRunning, isPaused, showModal, setShowModal,
    handleCancel, handlePause, handleResume
  } = useStudio();

  const containerRef = useRef<HTMLDivElement>(null);
  const [pd, setPd] = useState({ w: 0, h: 0 });

  const [metadata, setMetadata] = useState<any>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [copied, setCopied] = useState("");
  const [activeTag, setActiveTag] = useState<"tiktok" | "youtube" | "instagram">("tiktok");

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      if (entries[0]) {
        setPd({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleMetadata = async () => {
    if (!job?.id) return;
    setMetaLoading(true);
    setMetaError("");
    try {
      const res = await fetch("/api/generate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate metadata");
      setMetadata(data.metadata);
    } catch (err: any) {
      setMetaError(err.message);
    } finally {
      setMetaLoading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const getSubAlignValue = () => {
    if (subAlign === "left") return "flex-start";
    if (subAlign === "right") return "flex-end";
    return "center";
  };

  const getTextAlignValue = () => {
    if (subAlign === "left") return "left";
    if (subAlign === "right") return "right";
    return "center";
  };

  return (
    <div className="flex-1 overflow-hidden relative flex flex-col bg-[var(--bg-overlay)] p-12 overflow-y-auto items-center justify-center">
      <div 
        ref={containerRef}
        className="mx-auto rounded-3xl overflow-hidden border-2 border-[var(--border-strong)] shadow-[var(--shadow-lg)] relative bg-black shrink-0 transition-transform hover:scale-[1.01]"
        style={{
          aspectRatio: format === "9:16" ? "9/16" : format === "16:9" ? "16/9" : "1/1",
          height: "100%",
          maxHeight: "max(500px, calc(100vh - 200px))",
          maxWidth: "100%",
        }}
      >
        <div className="absolute inset-0 pointer-events-none z-10 opacity-30 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] mix-blend-overlay" />
        
        {bg ? (
          <video src={bg.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-[var(--text-disabled)] uppercase tracking-widest bg-[var(--bg-base)]">No Background</div>
        )}

        {parsedScript.length > 0 && (
          <>
            {/* Real Characters overlay  mirrors FFmpeg charH / charY math exactly */}
            {(() => {
              const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
              const activeChar = activeLine?.speaker === 'left' ? leftChar : rightChar;
              if (!activeChar || pd.h === 0) return null;

              // FFmpeg: charH = h * (charSize / 100)
              const charHeightPx = pd.h * (charSize / 100);
              // FFmpeg: charY = (h - charH) * ((100 - charPosV) / 100)   top offset
              const charTopPx = (pd.h - charHeightPx) * ((100 - charPosV) / 100);

              return (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10" style={{ top: charTopPx, height: charHeightPx }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeChar.imgUrl} alt="Speaker" className="object-contain h-full" style={{ filter: `drop-shadow(0 0 16px ${activeChar.accentColor}80)` }} />
                </div>
              );
            })()}

            {/* Subtitle preview (styled dynamically) */}
            {(() => {
              const activeLine = parsedScript[previewLineIdx % Math.max(1, parsedScript.length)];
              if (!activeLine) return null;

              const allWords = activeLine.text.split(' ').filter(Boolean);

              // Chunk strictly within this line: max 4 words OR 18 chars
              const MAX_WORDS = 4;
              const MAX_CHARS = 18;
              const chunks: { words: string[], startIndex: number }[] = [];
              let currentWords: string[] = [];
              let currentChars = 0;

              allWords.forEach((word, i) => {
                const addLen = currentWords.length === 0 ? word.length : word.length + 1;
                if (currentWords.length > 0 && (currentWords.length >= MAX_WORDS || currentChars + addLen > MAX_CHARS)) {
                  chunks.push({ words: currentWords, startIndex: i - currentWords.length });
                  currentWords = [];
                  currentChars = 0;
                }
                currentWords.push(word);
                currentChars += addLen;
              });
              if (currentWords.length > 0) {
                chunks.push({ words: currentWords, startIndex: allWords.length - currentWords.length });
              }

              const activeChunk = chunks.find(
                c => previewWordIdx >= c.startIndex && previewWordIdx < c.startIndex + c.words.length
              ) || chunks[0] || { words: [], startIndex: 0 };

              // Scale font relative to container width so text never overflows.
              // Base: 6% of container width, scaled by subSize (default 56  ~1x).
              const baseFontSize = pd.w > 0 ? pd.w * 0.06 * (subSize / 64) : 24;
              const reelFontSize = Math.min(Math.max(baseFontSize, 14), pd.w * 0.12);

              const justifyClass = subAlign === 'left' ? 'justify-start' : subAlign === 'right' ? 'justify-end' : 'justify-center';
              const textAlign = subAlign as any;
              // Horizontal padding scales with font size so words never clip the edge
              const hPad = Math.round(reelFontSize * 0.7);

              return (
                <div className={`absolute flex flex-wrap z-20 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${justifyClass}`}
                     style={{ top: `${subPos}%`, transform: 'translateY(-50%)', textAlign, left: hPad, right: hPad }}>
                  {activeChunk.words.map((word, relIdx) => {
                    const absIdx = activeChunk.startIndex + relIdx;
                    const isActive = absIdx === previewWordIdx;
                    return (
                      <span key={absIdx} className={`inline-block mx-1.5 transition-all duration-300 uppercase ${isActive ? 'scale-[1.05] -translate-y-1' : ''}`}
                            style={{
                              fontFamily: subFont,
                              fontSize: `${reelFontSize}px`,
                              fontWeight: 900,
                              WebkitTextStroke: "2px black",
                              color: isActive ? subColor : "white",
                              textShadow: "0 2px 24px rgba(0,0,0,0.6)",
                              transformOrigin: "bottom center",
                              willChange: "transform, color"
                            }}>
                        {word}
                      </span>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end pointer-events-none opacity-50">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent-lime)]mix-blend-overlay">Preview Matrix</span>
        <span className="font-mono text-[8px] text-[var(--text-disabled)]">{format}  {parsedScript.length} lines</span>
      </div>

      {/*  Render Progress Modal  auto-opens when job starts, stays until done/cancelled */}
      {(isRunning || isPaused) && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-5 backdrop-blur-sm">
          <div className="fade-up w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)]">

            {/* Header */}
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[rgba(201,255,71,0.1)] border border-[rgba(201,255,71,0.2)] flex items-center justify-center shrink-0">
                {isPaused
                  ? <span className="text-[var(--accent-lime)] text-[10px]"></span>
                  : <Loader2 size={13} className="text-[var(--accent-lime)] animate-spin" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[14px] text-[var(--text-primary)] m-0">
                  {isPaused ? "Render Paused" : "Rendering Video"}
                </p>
                <p className="font-mono text-[10px] text-[var(--accent-blue)] m-0 truncate">{job.phase}</p>
              </div>
              <span className="font-display font-extrabold text-[22px] text-[var(--accent-lime)] tabular-nums">{job.progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-4 pb-2">
              <div className="h-2 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${job.progress}%`,
                    background: isPaused
                      ? 'var(--accent-blue)'
                      : 'linear-gradient(90deg, var(--accent-lime), #a3e635)'
                  }}
                />
              </div>
            </div>

            {/* Phase steps */}
            <div className="px-5 py-3 flex flex-col gap-1.5">
              {[
                { label: "Voice Generation", threshold: 5 },
                { label: "Measuring Durations", threshold: 24 },
                { label: "Merging Audio", threshold: 33 },
                { label: "Generating Subtitles", threshold: 42 },
                { label: "FFmpeg Render", threshold: 50 },
                { label: "Done", threshold: 100 },
              ].map(({ label, threshold }) => {
                const done = job.progress >= threshold;
                const active = job.phase?.toLowerCase().includes(label.toLowerCase().split(' ')[0].toLowerCase());
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${done ? 'bg-[var(--accent-lime)]' : active ? 'bg-[var(--accent-blue)]' : 'bg-[var(--border-card)]'}`} />
                    <span className={`font-mono text-[10px] transition-colors ${done ? 'text-[var(--text-secondary)]' : active ? 'text-[var(--accent-blue)]' : 'text-[var(--text-disabled)]'}`}>{label}</span>
                    {active && !isPaused && <span className="ml-auto font-mono text-[9px] text-[var(--accent-blue)] animate-pulse">running</span>}
                    {active && isPaused && <span className="ml-auto font-mono text-[9px] text-[var(--accent-blue)]">paused here</span>}
                    {done && !active && <span className="ml-auto font-mono text-[9px] text-[var(--accent-lime)]"></span>}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 pt-2 flex gap-2">
              {isPaused ? (
                <Button onClick={handleResume} className="flex-1 h-9 gap-2 text-[12px] font-semibold bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640] border-none">
                   Resume
                </Button>
              ) : (
                <Button onClick={handlePause} className="flex-1 h-9 gap-2 text-[12px] font-semibold bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:bg-white/10 border border-[var(--border-subtle)]">
                   Pause
                </Button>
              )}
              <Button onClick={handleCancel} className="flex-1 h-9 gap-2 text-[12px] font-semibold bg-transparent text-red-400 hover:bg-red-500/10 border border-red-500/30">
                <X size={13} /> Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "generate" && isDone && job && showModal && (
        <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="fade-up w-full max-w-[800px] max-h-[90vh] bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-2xl overflow-hidden flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.8)]">

            {/* Modal header */}
            <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[rgba(201,255,71,0.12)] border border-[rgba(201,255,71,0.25)] flex items-center justify-center"><Check size={12} className="text-[var(--accent-lime)]" /></div>
              <span className="font-display font-bold text-[15px] text-[var(--text-primary)]">Video Ready</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]"> {format}</span>
              <div className="flex-1" />
              <button onClick={() => setShowModal(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div style={{ overflow: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 0, minHeight: "100%" }}>
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
                          loop
                        />
                        <VideoPlayerControlBar>
                          <VideoPlayerPlayButton />
                          <VideoPlayerTimeRange />
                          <VideoPlayerTimeDisplay />
                          <VideoPlayerMuteButton />
                        </VideoPlayerControlBar>
                      </VideoPlayer>
                    </div>
                  ) : (
                    <div style={{ width: "100%", aspectRatio: format.replace(':', '/'), borderRadius: 12, background: "var(--bg-raised)", border: "1px solid var(--border-card)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
                      <Play size={32} style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                  <a href={job.outputUrl ?? ""} download={`faceless_${job.id}.mp4`} style={{ width: "100%" }}>
                    <Button style={{ width: "100%", gap: 6, height: 36, fontSize: 12, fontWeight: 600, background: "var(--accent-lime)", color: "#0f0f11", border: "none", boxShadow: "var(--shadow-lime)" }}>
                      <Download size={14} /> Download MP4
                    </Button>
                  </a>
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
                        {metaLoading ? "Generating" : "Generate with AI"}
                      </Button>
                    )}
                    {metadata && (
                      <Button onClick={handleMetadata} disabled={metaLoading} style={{ height: 30, gap: 6, fontSize: 11, background: "var(--bg-raised)", color: "var(--text-muted)", border: "1px solid var(--border-card)", padding: "0 12px" }}>
                        <RefreshCw size={11} className={metaLoading ? "animate-spin" : ""} /> Regenerate
                      </Button>
                    )}
                  </div>

                  {metaError && <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#f87171" }}>{metaError}</p>}

                  {!metadata && !metaLoading && (
                    <div style={{ padding: "32px 20px", borderRadius: 12, border: "1px dashed var(--border-subtle)", textAlign: "center", background: "var(--bg-raised)", margin: "auto 0" }}>
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
                        <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
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
                          <button onClick={() => copyText(metadata.tags[activeTag].map((t: string) => `#${t}`).join(" "), "tags")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "tags" ? "var(--accent-lime)" : "var(--text-muted)", marginLeft: 6 }}>
                            {copied === "tags" ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {metadata.tags[activeTag].map((tag: string) => (
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
