import { useState } from 'react';
import { QuantifiedRecommendation, ConfidenceLevel, ImpactType } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Calculator, Info, ChevronDown, TrendingUp, Wallet, PiggyBank, Receipt } from 'lucide-react';

interface QuantifiedRecommendationsTableProps {
  recommendations: QuantifiedRecommendation[];
}

function getConfidenceBadgeClass(level: ConfidenceLevel): string {
  switch (level) {
    case 'BON':
      return 'bg-success/20 text-success border-success/30';
    case 'MOYEN':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'FAIBLE':
      return 'bg-muted text-muted-foreground border-muted';
  }
}

function getImpactTypeIcon(type: ImpactType) {
  switch (type) {
    case 'CA':
      return <TrendingUp className="w-4 h-4" />;
    case 'MARGE':
      return <Wallet className="w-4 h-4" />;
    case 'TRÉSORERIE':
      return <PiggyBank className="w-4 h-4" />;
    case 'COÛTS':
      return <Receipt className="w-4 h-4" />;
  }
}

function getImpactTypeLabel(type: ImpactType): string {
  switch (type) {
    case 'CA':
      return 'Chiffre d\'affaires';
    case 'MARGE':
      return 'Marge';
    case 'TRÉSORERIE':
      return 'Trésorerie';
    case 'COÛTS':
      return 'Réduction de coûts';
  }
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M €`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k €`;
  }
  return `${value.toFixed(0)} €`;
}

export function QuantifiedRecommendationsTable({ recommendations }: QuantifiedRecommendationsTableProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-primary" />
          Impacts Financiers Estimés
          <span className="text-xs text-muted-foreground font-normal ml-2">(ordres de grandeur)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Levier</TableHead>
                <TableHead className="font-semibold">Type d'impact</TableHead>
                <TableHead className="font-semibold text-right">Estimation</TableHead>
                <TableHead className="font-semibold text-center">Confiance</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommendations.map((rec, index) => (
                <Collapsible
                  key={index}
                  open={openItems.has(index)}
                  onOpenChange={() => toggleItem(index)}
                  asChild
                >
                  <>
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{rec.lever}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getImpactTypeIcon(rec.impactType)}
                          <span className="text-sm">{getImpactTypeLabel(rec.impactType)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-primary">
                          {formatCurrency(rec.estimatedImpactMin)} - {formatCurrency(rec.estimatedImpactMax)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getConfidenceBadgeClass(rec.confidenceLevel)}>
                          {rec.confidenceLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <button className="p-1 hover:bg-muted rounded transition-colors">
                            <ChevronDown 
                              className={`w-4 h-4 text-muted-foreground transition-transform ${
                                openItems.has(index) ? 'rotate-180' : ''
                              }`} 
                            />
                          </button>
                        </CollapsibleTrigger>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="py-3">
                          <div className="flex items-start gap-2 pl-4">
                            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Hypothèses de calcul :</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {rec.assumptions.map((assumption, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-muted-foreground/60">•</span>
                                    {assumption}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 mt-4 p-3 bg-muted/30 rounded-lg border border-border/50">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Estimation non contractuelle.</strong> Ces ordres de grandeur sont indicatifs et reposent sur des hypothèses génériques. 
            Les résultats réels dépendent de facteurs spécifiques à votre contexte. Une analyse approfondie est recommandée avant toute décision.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
