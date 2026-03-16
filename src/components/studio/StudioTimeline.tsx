"use client";

import { useStudio } from "./StudioContext";

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

export function StudioTimeline() {
  const { bg, leftChar, rightChar, parsedScript } = useStudio();

  const totalLines = Math.max(parsedScript.length, 1);
  const lineBlocks = parsedScript.map((l, i) => ({
    widthPct: 100 / totalLines,
    offset: (i / totalLines) * 100,
    label: l.text.slice(0, 12),
    speaker: l.speaker,
  }));

  return (
    <div className="h-[140px] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-[18px] flex flex-col gap-2 overflow-y-auto shrink-0 z-10">
      <TimelineTrack
        label="VIDEO" color={bg?.primaryColor || "var(--border-strong)"}
        blocks={[{ widthPct: 100, label: bg ? bg.name : "Background Media", offset: 0 }]}
      />
      <TimelineTrack
        label="CHAR.L" color={leftChar?.accentColor || "#3f3f46"}
        blocks={leftChar ? lineBlocks.filter(b => b.speaker === "left").map(b => ({ ...b, label: leftChar.name })) : []}
      />
      <TimelineTrack
        label="CHAR.R" color={rightChar?.accentColor || "#3f3f46"}
        blocks={rightChar ? lineBlocks.filter(b => b.speaker === "right").map(b => ({ ...b, label: rightChar.name })) : []}
      />
      <TimelineTrack
        label="CAPTIONS" color="#c9ff47"
        blocks={lineBlocks}
      />
    </div>
  );
}
