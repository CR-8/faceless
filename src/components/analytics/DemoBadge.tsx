import { Badge } from '@/components/ui/badge';
import { isMockMode } from '@/lib/mock-analytics';

export function DemoBadge() {
  if (!isMockMode) return null;
  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10 text-xs font-medium">
      Demo Data
    </Badge>
  );
}
