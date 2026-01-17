import { DecisionOutput, PriorityLevel } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Zap, Target, Info } from 'lucide-react';
import { DECISION_DISCLAIMER, getPriorityBadgeClass } from '@/lib/decisionEngine';
import { QuantifiedRecommendationsTable } from './QuantifiedRecommendationsTable';

interface DecisionPanelProps {
  decision: DecisionOutput;
}

function getPriorityIcon(level: PriorityLevel) {
  switch (level) {
    case 'CRITIQUE':
      return <AlertTriangle className="w-5 h-5" />;
    case 'ÉLEVÉ':
      return <AlertTriangle className="w-5 h-5" />;
    case 'MODÉRÉ':
      return <TrendingUp className="w-5 h-5" />;
    case 'FAIBLE':
      return <Target className="w-5 h-5" />;
  }
}

export function DecisionPanel({ decision }: DecisionPanelProps) {
  const { priorityLevel, topRisks, topLevers, quickWins, structuralActions, decisionSummary, quantifiedRecommendations } = decision;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Priority Header */}
      <div className="text-center">
        <h3 className="font-display text-2xl font-bold text-foreground mb-4">
          Lecture Décisionnelle
        </h3>
        <Badge className={`${getPriorityBadgeClass(priorityLevel)} text-lg px-4 py-2`}>
          {getPriorityIcon(priorityLevel)}
          <span className="ml-2">Priorité {priorityLevel}</span>
        </Badge>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          {decisionSummary}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Risks */}
        {topRisks.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive text-lg">
                <AlertTriangle className="w-5 h-5" />
                Risques Majeurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {topRisks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-destructive font-bold mt-0.5">{index + 1}.</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Top Levers */}
        {topLevers.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-primary text-lg">
                <TrendingUp className="w-5 h-5" />
                Leviers Prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {topLevers.map((lever, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-primary font-bold mt-0.5">{index + 1}.</span>
                    {lever}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Wins */}
        {quickWins.length > 0 && (
          <Card className="border-success/30 bg-success/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-success text-lg">
                <Zap className="w-5 h-5" />
                Quick Wins
                <span className="text-xs text-muted-foreground font-normal">(court terme)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {quickWins.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-success">✓</span>
                    {action}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Structural Actions */}
        {structuralActions.length > 0 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-accent-foreground text-lg">
                <Target className="w-5 h-5" />
                Actions Structurantes
                <span className="text-xs text-muted-foreground font-normal">(moyen terme)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {structuralActions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="text-accent-foreground">→</span>
                    {action}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quantified Recommendations Table */}
      {quantifiedRecommendations && quantifiedRecommendations.length > 0 && (
        <QuantifiedRecommendationsTable recommendations={quantifiedRecommendations} />
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg border border-border">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          {DECISION_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
