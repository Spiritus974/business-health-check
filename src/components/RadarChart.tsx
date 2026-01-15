import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Scores } from '@/lib/scoring';

interface RadarChartDisplayProps {
  scores: Scores;
}

export function RadarChartDisplay({ scores }: RadarChartDisplayProps) {
  const data = [
    { dimension: 'Financier', score: scores.financier, fullMark: 100 },
    { dimension: 'Opérationnel', score: scores.operationnel, fullMark: 100 },
    { dimension: 'Commercial', score: scores.commercial, fullMark: 100 },
    { dimension: 'Stratégique', score: scores.strategique, fullMark: 100 },
  ];

  return (
    <div className="animate-fade-in bg-card rounded-xl p-6 shadow-soft border border-border/50" style={{ animationDelay: '200ms' }}>
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">Analyse 4D</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
