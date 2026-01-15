import { getScoreLevel } from '@/lib/scoring';
import { cn } from '@/lib/utils';

interface GlobalScoreDisplayProps {
  score: number;
  businessName: string;
}

export function GlobalScoreDisplay({ score, businessName }: GlobalScoreDisplayProps) {
  const { level, label } = getScoreLevel(score);
  
  const levelGradients = {
    excellent: 'from-score-excellent to-emerald-400',
    bon: 'from-score-bon to-cyan-400',
    critique: 'from-score-critique to-amber-400',
    danger: 'from-score-danger to-rose-400',
  };
  
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="animate-scale-in bg-gradient-card rounded-2xl p-8 shadow-lifted border border-border/50">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Circular Score */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
            {/* Background circle */}
            <circle
              cx="90"
              cy="90"
              r="80"
              fill="none"
              stroke="currentColor"
              className="text-secondary"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="90"
              cy="90"
              r="80"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={cn(
                  level === 'excellent' ? 'stop-color-emerald' : '',
                  level === 'bon' ? 'stop-color-cyan' : '',
                  level === 'critique' ? 'stop-color-amber' : '',
                  level === 'danger' ? 'stop-color-rose' : ''
                )} style={{ stopColor: level === 'excellent' ? '#10b981' : level === 'bon' ? '#06b6d4' : level === 'critique' ? '#f59e0b' : '#ef4444' }} />
                <stop offset="100%" style={{ stopColor: level === 'excellent' ? '#34d399' : level === 'bon' ? '#22d3ee' : level === 'critique' ? '#fbbf24' : '#f87171' }} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-display font-bold text-foreground animate-score-reveal">
              {score.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground mt-1">/100</span>
          </div>
        </div>
        
        {/* Score details */}
        <div className="flex-1 text-center lg:text-left">
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Score Global
          </h2>
          {businessName && (
            <p className="text-lg text-muted-foreground mb-4">{businessName}</p>
          )}
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r",
            levelGradients[level],
            "text-white shadow-glow"
          )}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {label}
          </div>
          
          <p className="mt-4 text-muted-foreground max-w-md">
            {level === 'excellent' && "Performance exceptionnelle ! Votre entreprise atteint les standards les plus élevés du secteur."}
            {level === 'bon' && "Bonne performance globale. Quelques optimisations permettraient d'atteindre l'excellence."}
            {level === 'critique' && "Des axes d'amélioration significatifs ont été identifiés. Un plan d'action ciblé est recommandé."}
            {level === 'danger' && "Situation critique nécessitant une intervention rapide sur plusieurs dimensions."}
          </p>
        </div>
      </div>
    </div>
  );
}
