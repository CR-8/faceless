import { Film, Users, FileText, Settings2, Zap } from "lucide-react";

export type StepId = "background" | "characters" | "script" | "settings" | "generate";
export type Format = "9:16" | "16:9" | "1:1";
export type Speaker = "left" | "right";
export interface ScriptLine { speaker: Speaker; text: string }
export { type BgAsset, type CharAsset, BG_ASSETS, CHAR_ASSETS, VOICES } from "@/data/data";
export interface JobPoll { id: string | null; status: "idle" | "queued" | "processing" | "paused" | "completed" | "failed" | "cancelled"; progress: number; phase: string; outputUrl: string | null; error: string | null }
export interface Metadata { title: string; caption: string; description: string; tags: { youtube: string[]; tiktok: string[]; instagram: string[] } }

export const STEPS: { id: StepId; label: string; icon: React.ElementType }[] = [
  { id: "background", label: "Background", icon: Film },
  { id: "characters", label: "Characters", icon: Users },
  { id: "script", label: "Script", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings2 },
  { id: "generate", label: "Generate", icon: Zap },
];

export const EXAMPLE = `Left: Have you tried this new AI video tool yet?
Right: Not yet — I heard it generates everything automatically.
Left: Exactly. You type a script, it handles voice, subtitles, everything.
Right: Even the characters and background?
Left: Yep. Fully automated. Zero manual editing.
Right: That's actually unbelievable.`;
