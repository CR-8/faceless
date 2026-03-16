"use client";

import Image from "next/image";
import { useStudio } from "./StudioContext";
import { Copy, Download, RefreshCw, X, Tag, Captions } from "lucide-react";
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
    job, isDone, showModal, setShowModal
  } = useStudio();

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
            {/* Left Character */}
            {leftChar && parsedScript[previewLineIdx % parsedScript.length]?.speaker === "left" && (
              <div
                className="absolute animate-in fade-in slide-in-from-left-[8px] duration-300 pointer-events-none"
                style={{
                  height: `${charSize}%`,
                  bottom: `${charPosV}%`,
                  left: "5%",
                  filter: `drop-shadow(0 0 16px ${leftChar.accentColor}80)`,
                  aspectRatio: "4/5",
                }}
              >
                <Image
                  src={leftChar.imgUrl}
                  alt={leftChar.name}
                  fill
                  sizes="30vw"
                  className="object-contain"
                />
              </div>
            )}

            {/* Right Character */}
            {rightChar && parsedScript[previewLineIdx % parsedScript.length]?.speaker === "right" && (
              <div
                className="absolute animate-in fade-in slide-in-from-right-[8px] duration-300 transform -scale-x-100 pointer-events-none"
                style={{
                  height: `${charSize}%`,
                  bottom: `${charPosV}%`,
                  right: "5%",
                  filter: `drop-shadow(0 0 16px ${rightChar.accentColor}80)`,
                  aspectRatio: "4/5",
                }}
              >
                <Image
                  src={rightChar.imgUrl}
                  alt={rightChar.name}
                  fill
                  sizes="30vw"
                  className="object-contain"
                />
              </div>
            )}

            {/* Subtitles Overlay */}
            <div
              className="absolute inset-x-8 px-4 flex flex-col z-20 pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              style={{
                top: `${subPos}%`,
                transform: "translateY(-50%)",
                alignItems: getSubAlignValue(),
                textAlign: getTextAlignValue(),
              }}
            >
              <p
                className="m-0 leading-[1.2] uppercase"
                style={{
                  fontFamily: subFont, fontSize: `${subSize}px`, fontWeight: 900,
                  WebkitTextStroke: "2px black", color: "white", textShadow: "0 2px 24px rgba(0,0,0,0.6)"
                }}
              >
                {parsedScript[previewLineIdx % parsedScript.length]?.text.split(' ').map((word, wIdx) => {
                  const isActive = wIdx === previewWordIdx;
                  return (
                    <span
                      key={wIdx}
                      className={`inline-block mx-0.5 transition-all duration-200 ${isActive ? 'scale-[1.15] -translate-y-1' : ''}`}
                      style={{ color: isActive ? subColor : "white" }}
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-1 items-end pointer-events-none opacity-50">
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent-lime)]mix-blend-overlay">Preview Matrix</span>
        <span className="font-mono text-[8px] text-[var(--text-disabled)]">{format} · {parsedScript.length} lines</span>
      </div>

      {step === "generate" && isDone && job.outputUrl && showModal && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-6 right-6 text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setShowModal(false)}
          >
            <X size={24} />
          </Button>
          <div className="flex bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] w-full max-w-5xl animate-in zoom-in-95 duration-400">
            <div className="flex-shrink-0 bg-black flex items-center justify-center p-8">
              <VideoPlayer className="w-full mix-blend-screen overflow-hidden rounded-xl border border-white/5 shadow-2xl ring-1 ring-white/10 max-h-[75vh]" style={{ aspectRatio: format === "9:16" ? "9/16" : format === "16:9" ? "16/9" : "1/1" }}>
                <VideoPlayerContent src={job.outputUrl} loop />
                <VideoPlayerControlBar className="bg-black/80 backdrop-blur-md pb-2 px-4 rounded-xl translate-y-2 mb-4 w-[90%] mx-auto border border-white/10">
                  <VideoPlayerPlayButton className="text-white hover:text-[var(--accent-lime)] transition-colors" />
                  <VideoPlayerSeekBackwardButton className="text-white/70 hover:text-white" />
                  <VideoPlayerSeekForwardButton className="text-white/70 hover:text-white" />
                  <VideoPlayerTimeRange className="h-1.5 rounded-full" />
                  <VideoPlayerTimeDisplay className="font-mono text-[10px] text-white/80" />
                  <VideoPlayerMuteButton className="text-white/70 hover:text-white" />
                  <VideoPlayerVolumeRange className="w-16" />
                </VideoPlayerControlBar>
              </VideoPlayer>
            </div>
            <div className="flex-1 p-8 flex flex-col border-l border-white/5 overflow-y-auto">
              {/* Add Download and Metadata content similarly to previous component here */}
              <h2 className="font-display font-medium text-[24px] text-white">Your Video is Ready</h2>
              <div className="mt-6 flex flex-col gap-3">
                <a href={job.outputUrl} download style={{ textDecoration: 'none' }}>
                  <Button className="w-full gap-2 font-semibold bg-[var(--accent-lime)] text-[#0f0f11] hover:bg-[#b5e640]">
                    <Download size={15} /> Download Full HD Video
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
