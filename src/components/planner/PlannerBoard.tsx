'use client';

import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/kibo-ui/kanban';
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLUMNS = [
  { id: 'planned', name: 'Planned', color: '#6B7280' },
  { id: 'in-progress', name: 'In Progress', color: '#F59E0B' },
  { id: 'done', name: 'Done', color: '#10B981' },
];

type PlannerCard = {
  id: string;
  name: string;
  column: string;
  createdAt: string;
};

export function PlannerBoard() {
  const [cards, setCards] = useState<PlannerCard[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('faceless-projects');
    if (saved) {
      try { setCards(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('faceless-projects', JSON.stringify(cards));
  }, [cards, mounted]);

  const addCard = () => {
    const name = window.prompt('Enter new video project idea:');
    if (!name?.trim()) return;
    setCards(prev => [
      ...prev,
      { id: Date.now().toString(), name: name.trim(), column: 'planned', createdAt: new Date().toISOString() },
    ]);
  };

  const deleteCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this project idea?')) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Video Planner</h1>
          <p className="text-zinc-500 text-sm mt-1">Organize your upcoming faceless video ideas.</p>
        </div>
        <Button onClick={addCard} className="bg-[#c9ff47] text-black hover:bg-[#b8ee36] font-bold">
          <Plus size={16} className="mr-2" /> New Idea
        </Button>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <KanbanProvider columns={COLUMNS} data={cards} onDataChange={setCards}>
          {(column) => (
            <KanbanBoard
              id={column.id}
              key={column.id}
              className="min-h-[500px] bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-4"
            >
              <KanbanHeader>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="text-zinc-300 font-semibold tracking-wide uppercase text-xs">{column.name}</span>
                  <span className="ml-auto text-zinc-500 text-xs font-mono bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                    {cards.filter(c => c.column === column.id).length}
                  </span>
                </div>
              </KanbanHeader>
              <KanbanCards id={column.id}>
                {(card: PlannerCard) => (
                  <KanbanCard
                    column={column.id}
                    id={card.id}
                    key={card.id}
                    name={card.name}
                    className="bg-zinc-900 border-zinc-800 text-white mb-3 hover:border-zinc-700 transition-colors shadow-none"
                  >
                    <div className="flex items-start justify-between gap-2 p-1">
                      <p className="flex-1 font-medium text-sm leading-snug">{card.name}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-zinc-500">
                      <p className="text-xs font-mono">
                        {new Date(card.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                      <button
                        onClick={(e) => deleteCard(card.id, e)}
                        className="text-zinc-600 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer"
                      >
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
