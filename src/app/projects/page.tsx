"use client";

import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from "@/components/kibo-ui/kanban";
import { useState, useEffect } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";

const columns = [
    { id: "planned", name: "Planned", color: "#6B7280" }, // Gray
    { id: "in-progress", name: "In Progress", color: "#F59E0B" }, // Amber
    { id: "done", name: "Done", color: "#10B981" }, // Emerald 
];

interface ProjectFeature {
    id: string;
    name: string;
    column: string;
    createdAt: string;
}

export default function ProjectsKanban() {
    const [features, setFeatures] = useState<ProjectFeature[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("faceless-projects");
        if (saved) {
            try {
                setFeatures(JSON.parse(saved));
            } catch (e) {
                console.error("Could not parse saved projects");
            }
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("faceless-projects", JSON.stringify(features));
        }
    }, [features, mounted]);

    const addCard = () => {
        const name = window.prompt("Enter new video project idea:");
        if (!name?.trim()) return;
        setFeatures(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                name: name.trim(),
                column: "planned",
                createdAt: new Date().toISOString()
            }
        ]);
    }

    const deleteFeature = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this project idea?")) {
            setFeatures(prev => prev.filter(f => f.id !== id));
        }
    }

    if (!mounted) return null;

    return (
        <div className="min-h-screen font-sans" style={{ background: "#0f0f11", padding: "40px 60px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
                <div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.5rem", margin: "0 0 4px", color: "#fff", letterSpacing: "-0.03em" }}>
                        Video Planner
                    </h1>
                    <p style={{ margin: 0, color: "#a1a1aa", fontSize: "0.95rem" }}>Organize your upcoming faceless video ideas.</p>
                </div>

                <button onClick={addCard} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 20px", background: "#c9ff47", color: "#000", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(201,255,71,0.2)", transition: "all 0.2s"
                }}>
                    <Plus size={16} /> New Project IDEA
                </button>
            </div>

            <div style={{ background: "#18181b", padding: 24, borderRadius: 24, border: "1px solid #27272a" }}>
                <KanbanProvider
                    columns={columns}
                    data={features}
                    onDataChange={setFeatures}
                >
                    {(column) => (
                        <KanbanBoard id={column.id} key={column.id} className="min-h-[500px] bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-4">
                            <KanbanHeader>
                                <div className="flex items-center gap-2 mb-4">
                                    <div
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: column.color, boxShadow: `0 0 10px ${column.color}` }}
                                    />
                                    <span className="text-zinc-300 font-semibold tracking-wide uppercase text-xs">{column.name}</span>
                                    <span className="ml-auto text-zinc-500 text-xs font-mono bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                                        {features.filter(f => f.column === column.id).length}
                                    </span>
                                </div>
                            </KanbanHeader>
                            <KanbanCards id={column.id}>
                                {(feature: (typeof features)[number]) => (
                                    <KanbanCard
                                        column={column.id}
                                        id={feature.id}
                                        key={feature.id}
                                        name={feature.name}
                                        className="bg-zinc-900 border-zinc-800 text-white mb-3 hover:border-zinc-700 transition-colors shadow-none"
                                    >
                                        <div className="flex items-start justify-between gap-2 p-1">
                                            <div className="flex flex-col gap-1 w-full">
                                                <p className="m-0 flex-1 font-medium text-sm leading-snug">
                                                    {feature.name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-zinc-500">
                                            <p className="m-0 text-xs font-mono">
                                                {new Date(feature.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>

                                            <button onClick={(e) => deleteFeature(feature.id, e)} className="text-zinc-600 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </KanbanCard>
                                )}
                            </KanbanCards>
                        </KanbanBoard>
                    )}
                </KanbanProvider>
            </div>
        </div>
    );
}
