"use client";

import React from "react";
import Image from "next/image";
import { useStudio } from "./StudioContext";
import { BG_ASSETS, CHAR_ASSETS } from "./constants";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudioSidebarRight() {
  const { step, bg, setBg, leftChar, setLeftChar, rightChar, setRightChar } = useStudio();

  return (
    <div className="w-[300px] border-l border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4 overflow-y-auto shrink-0 transition-opacity">
      {step === "background" && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Gameplay / Backgrounds</p>
          <div className="grid grid-cols-2 gap-2">
            {BG_ASSETS.map(asset => {
              const active = bg?.id === asset.id;
              return (
                <button
                  key={asset.id}
                  onClick={() => setBg(asset)}
                  className={`relative p-0 border rounded-lg overflow-hidden cursor-pointer transition-all ${active ? "opacity-100 ring-2 ring-[var(--accent-lime)] ring-offset-2 ring-offset-[var(--bg-raised)]" : "opacity-70 hover:opacity-100 border-[var(--border-subtle)]"}`}
                  style={{ borderColor: active ? "transparent" : "" }}
                >
                  <video src={asset.videoUrl} className="w-full h-full object-cover aspect-[9/16]" muted loop autoPlay playsInline />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] to-transparent pointer-events-none flex flex-col justify-end p-2">
                    <span className="font-display font-medium text-[11px] text-white leading-tight">{asset.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "characters" && (
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Available Characters</p>
          <div className="grid grid-cols-2 gap-2">
            {CHAR_ASSETS.map(char => {
              const isLeft = leftChar?.id === char.id;
              const isRight = rightChar?.id === char.id;
              const active = isLeft || isRight;
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    if (isLeft) setLeftChar(null);
                    else if (isRight) setRightChar(null);
                    else if (!leftChar) setLeftChar(char);
                    else if (!rightChar) setRightChar(char);
                    else setRightChar(char);
                  }}
                  className={`relative p-0 border rounded-lg overflow-hidden cursor-pointer bg-[var(--bg-base)] transition-all ${active ? "opacity-100 ring-2 ring-offset-2 ring-offset-[var(--bg-raised)]" : "opacity-70 hover:opacity-100 border-[var(--border-subtle)]"}`}
                  style={{ borderColor: active ? "transparent" : "", "--tw-ring-color": active ? char.accentColor : "transparent" } as React.CSSProperties}
                >
                  <div className="w-full aspect-[4/5] relative">
                    <Image src={char.imgUrl} fill sizes="150px" className="object-cover" alt={char.name} />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-1.5 flex justify-between items-center" style={{ background: char.accentColor }}>
                    <span className="font-sans font-bold text-[10px] text-white overflow-hidden whitespace-nowrap text-ellipsis">{char.name}</span>
                    {isLeft && <span className="font-mono text-[9px] bg-white/20 px-1 rounded text-white">L</span>}
                    {isRight && <span className="font-mono text-[9px] bg-black/30 px-1 rounded text-white">R</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Script step instructions */}
      {step === "script" && (
        <div className="p-3 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] rounded-lg">
          <h4 className="font-mono text-[10px] uppercase text-[var(--accent-lime)] mt-0 mb-1 flex items-center gap-1.5">
            <Sparkles size={12} /> Prompting Tips
          </h4>
          <p className="font-sans text-[11px] text-[var(--text-muted)] leading-relaxed m-0 mb-2">
            Your script drives the entire generation process. The AI will analyze the lines to determine character dialogue, timing, and subtitle overlays.
          </p>
          <ul className="m-0 pl-4 py-0 list-disc flex flex-col gap-1">
            <li className="font-sans text-[10px] text-[var(--text-secondary)]">Use <b>Left:</b> and <b>Right:</b> to specify speakers.</li>
            <li className="font-sans text-[10px] text-[var(--text-secondary)]">Keep lines short for high impact (TikTok style).</li>
            <li className="font-sans text-[10px] text-[var(--text-secondary)]">If no speaker is specified, it defaults to Left.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
