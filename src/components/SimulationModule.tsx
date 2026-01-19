import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  TrendingUp, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { AuditDataV2, Scores, normalizeToV2, AuditData } from '@/types/audit';
import { 
  SimulationType, 
  SimulationResult, 
  SIMULATION_SCENARIOS,
  SIMULATION_DISCLAIMER
} from '@/types/simulation';
import { runSimulation, getPrioritizedScenarios } from '@/lib/simulationEngine';

interface SimulationModuleProps {
  auditData: AuditData;
  scores: Scores;
}

function ConfidenceBadge({ level }: { level: 'FAIBLE' | 'MOYEN' | 'BON' }) {
  const colors = {
    FAIBLE: 'bg-slate-100 text-slate-700 border-slate-300',
    MOYEN: 'bg-amber-100 text-amber-700 border-amber-300',
    BON: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  };
  
  return (
    <Badge variant="outline" className={`${colors[level]} text-xs`}>
      Confiance : {level}
    </Badge>
  );
}

function SimulationCard({ result, onRemove }: { result: SimulationResult; onRemove: () => void }) {
  const [showHypotheses, setShowHypotheses] = useState(false);
  
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              {result.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {result.description}
            </CardDescription>
          </div>
          <ConfidenceBadge level={result.confidenceLevel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Impact */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">Impact estimé</span>
          </div>
          <p className="text-xl font-bold text-primary">
            {result.impactLabel}
          </p>
        </div>
        
        {/* Inputs used */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Paramètres simulés :</h4>
          <div className="flex flex-wrap gap-2">
            {result.inputs.map(input => (
              <Badge key={input.id} variant="secondary" className="text-xs">
                {input.label}: {input.value > 0 ? '+' : ''}{input.value}{input.unit}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Secondary effects */}
        {result.secondaryEffects.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Effets secondaires :</h4>
            <ul className="text-sm space-y-1">
              {result.secondaryEffects.map((effect, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="text-foreground">{effect}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Hypotheses */}
        <Collapsible open={showHypotheses} onOpenChange={setShowHypotheses}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Hypothèses ({result.hypotheses.length})
              </span>
              {showHypotheses ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-muted/50 rounded-md p-3 mt-2">
              <ul className="text-sm space-y-1.5">
                {result.hypotheses.map((hyp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{hyp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        <Button variant="outline" size="sm" onClick={onRemove} className="w-full">
          Effacer cette simulation
        </Button>
      </CardContent>
    </Card>
  );
}

function ScenarioSelector({
  type,
  onSimulate
}: {
  type: SimulationType;
  onSimulate: (type: SimulationType, inputs: Record<string, number>) => void;
}) {
  const scenario = SIMULATION_SCENARIOS.find(s => s.type === type);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  
  if (!scenario) return null;
  
  const handleInputChange = (inputId: string, value: string) => {
    setInputs(prev => ({
      ...prev,
      [inputId]: parseFloat(value) || 0
    }));
  };
  
  const hasChanges = Object.values(inputs).some(v => v !== 0);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{scenario.icon}</span>
          {scenario.label}
        </CardTitle>
        <CardDescription>{scenario.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scenario.inputs.map(input => (
          <div key={input.id} className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {input.label}
            </label>
            <Select
              value={String(inputs[input.id] || 0)}
              onValueChange={(v) => handleInputChange(input.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {input.options.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{input.description}</p>
          </div>
        ))}
        
        <Button 
          onClick={() => onSimulate(type, inputs)}
          disabled={!hasChanges}
          className="w-full"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Simuler l'impact
        </Button>
      </CardContent>
    </Card>
  );
}

export function SimulationModule({ auditData, scores }: SimulationModuleProps) {
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [activeTab, setActiveTab] = useState<SimulationType>('TRESORERIE');
  
  const normalizedData = useMemo(() => normalizeToV2(auditData), [auditData]);
  const prioritizedScenarios = useMemo(
    () => getPrioritizedScenarios(normalizedData, scores),
    [normalizedData, scores]
  );
  
  const handleSimulate = useCallback((type: SimulationType, inputs: Record<string, number>) => {
    const result = runSimulation(type, normalizedData, inputs);
    if (result) {
      setResults(prev => {
        // Remove existing result of same type and add new one
        const filtered = prev.filter(r => r.type !== type);
        return [...filtered, result];
      });
    }
  }, [normalizedData]);
  
  const handleRemove = useCallback((id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  }, []);
  
  // Get top 3 for PDF export
  const topResults = useMemo(() => {
    return results
      .sort((a, b) => {
        // Sort by impact (max value) descending
        return b.impactMax - a.impactMax;
      })
      .slice(0, 3);
  }, [results]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Simulations Décisionnelles
          </h2>
          <p className="text-muted-foreground mt-1">
            Testez des hypothèses "Si... Alors..." pour éclairer vos décisions
          </p>
        </div>
      </div>
      
      {/* Disclaimer */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          {SIMULATION_DISCLAIMER}
        </AlertDescription>
      </Alert>
      
      {/* Priority suggestion */}
      {prioritizedScenarios.length > 0 && (
        <div className="bg-primary/5 rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Simulations suggérées selon votre profil :
          </p>
          <div className="flex flex-wrap gap-2">
            {prioritizedScenarios.slice(0, 3).map(type => {
              const scenario = SIMULATION_SCENARIOS.find(s => s.type === type);
              return scenario ? (
                <Button
                  key={type}
                  variant={activeTab === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(type)}
                >
                  {scenario.icon} {scenario.label}
                </Button>
              ) : null;
            })}
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {SIMULATION_SCENARIOS.map(scenario => (
          <Button
            key={scenario.type}
            variant={activeTab === scenario.type ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(scenario.type)}
          >
            {scenario.icon} {scenario.label}
          </Button>
        ))}
      </div>
      
      {/* Active scenario */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ScenarioSelector
            type={activeTab}
            onSimulate={handleSimulate}
          />
        </div>
        
        {/* Results */}
        <div className="space-y-4">
          {results.filter(r => r.type === activeTab).map(result => (
            <SimulationCard
              key={result.id}
              result={result}
              onRemove={() => handleRemove(result.id)}
            />
          ))}
          
          {results.filter(r => r.type === activeTab).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sélectionnez des paramètres et lancez une simulation</p>
            </div>
          )}
        </div>
      </div>
      
      {/* All results summary */}
      {results.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">
            Résumé des simulations ({results.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(result => (
              <Card key={result.id} className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{result.title}</span>
                    <ConfidenceBadge level={result.confidenceLevel} />
                  </div>
                  <p className="text-primary font-bold">{result.impactLabel}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {topResults.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              ℹ️ Les {Math.min(3, topResults.length)} simulation(s) les plus impactantes seront incluses dans le PDF.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SimulationModule;
