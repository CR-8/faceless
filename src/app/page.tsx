"use client";

import { StudioProvider } from "@/components/studio/StudioContext";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { StudioSidebarLeft } from "@/components/studio/StudioSidebarLeft";
import { StudioSidebarRight } from "@/components/studio/StudioSidebarRight";
import { StudioPreview } from "@/components/studio/StudioPreview";
import { StudioTimeline } from "@/components/studio/StudioTimeline";

export default function StudioPage() {
  return (
    <StudioProvider>
      <div className="flex flex-col h-screen w-full bg-[var(--bg-base)] overflow-hidden">
        <StudioHeader />
        <div className="flex flex-1 overflow-hidden">
          <StudioSidebarLeft />
          <div className="flex flex-1 flex-col overflow-hidden relative">
            <StudioPreview />
            <StudioTimeline />
          </div>
          <StudioSidebarRight />
        </div>
      </div>
    </StudioProvider>
  );
}
