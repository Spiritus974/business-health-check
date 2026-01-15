import { cn } from '@/lib/utils';
import { getScoreLevel } from '@/lib/scoring';

interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  delay?: number;
}

export function ScoreCard({ title, score, icon, delay = 0 }: ScoreCardProps) {
  const { level, label } = getScoreLevel(score);
  
  const levelColors = {
    excellent: 'bg-score-excellent/10 border-score-excellent/30 text-score-excellent',
    bon: 'bg-score-bon/10 border-score-bon/30 text-score-bon',
    critique: 'bg-score-critique/10 border-score-critique/30 text-score-critique',
    danger: 'bg-score-danger/10 border-score-danger/30 text-score-danger',
  };
  
  const progressColors = {
    excellent: 'bg-score-excellent',
    bon: 'bg-score-bon',
    critique: 'bg-score-critique',
    danger: 'bg-score-danger',
  };

  return (
    <div 
      className="animate-slide-up bg-card rounded-xl p-6 shadow-soft border border-border/50 hover:shadow-lifted transition-shadow duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary text-foreground">
            {icon}
          </div>
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
        <span className={cn(
          "text-xs font-medium px-2.5 py-1 rounded-full border",
          levelColors[level]
        )}>
          {label}
        </span>
      </div>
      
      <div className="flex items-end gap-3">
        <span className="text-4xl font-display font-bold text-foreground">
          {score.toFixed(1)}
        </span>
        <span className="text-muted-foreground text-sm mb-1">/100</span>
      </div>
      
      <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressColors[level])}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
