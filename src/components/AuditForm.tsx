import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AuditDataV2, defaultAuditDataV2, DataOrigin } from '@/types/audit';
import { getAllSectors, getSectorVariants } from '@/lib/benchmarks';
import { Building2, TrendingUp, Users, Wifi, Heart, BarChart3, Briefcase, ChevronDown, AlertTriangle, DollarSign, Target, Gauge } from 'lucide-react';

interface AuditFormProps {
  onSubmit: (data: AuditDataV2) => void;
}

export function AuditForm({ onSubmit }: AuditFormProps) {
  const [formData, setFormData] = useState<AuditDataV2>(defaultAuditDataV2);
  const sectors = getAllSectors();
  const variants = getSectorVariants(formData.sector);

  const handleSectorChange = (sector: string) => {
    const newVariants = getSectorVariants(sector);
    setFormData({
      ...formData,
      sector: sector,
      variant: newVariants[0]?.id || undefined
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Compute revenuePerFte before submit
    const updatedData = {
      ...formData,
      ops: {
        ...formData.ops,
        productivity: {
          ...formData.ops.productivity,
          revenuePerFte: formData.finance.annualRevenue / Math.max(formData.ops.productivity.fte, 0.1)
        }
      }
    };
    onSubmit(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in bg-card rounded-2xl p-8 shadow-soft border border-border/50">
      <h2 className="font-display font-bold text-2xl text-foreground mb-6 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="w-5 h-5" />
        </div>
        Données de l'audit
      </h2>
      
      <div className="space-y-6">
        {/* ===================== SECTION ESSENTIELLE ===================== */}
        <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
          <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Informations Essentielles
          </h3>

          {/* Business Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                Nom de l'entreprise *
              </Label>
              <Input
                id="businessName"
                placeholder="Clinique Dubois"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sector" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                Secteur *
              </Label>
              <Select value={formData.sector} onValueChange={handleSectorChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {variants.length > 1 && (
            <div className="space-y-2 mb-6">
              <Label htmlFor="variant">Type d'établissement</Label>
              <Select value={formData.variant} onValueChange={(v) => setFormData({ ...formData, variant: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Financial Metrics - Essential */}
          <div className="pt-4 border-t border-border/50">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Indicateurs Financiers
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="annualRevenue">CA Annuel (€) *</Label>
                <Input
                  id="annualRevenue"
                  type="number"
                  min="1"
                  value={formData.finance.annualRevenue}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    finance: { ...formData.finance, annualRevenue: Number(e.target.value) }
                  })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grossMarginPercent">Marge brute (%) *</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[formData.finance.grossMarginPercent]}
                    onValueChange={([v]) => setFormData({ 
                      ...formData, 
                      finance: { ...formData.finance, grossMarginPercent: v }
                    })}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">{formData.finance.grossMarginPercent}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hrCostsPercent">Charges RH (%) *</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[formData.costs.hrCostsPercent]}
                    onValueChange={([v]) => setFormData({ 
                      ...formData, 
                      costs: { ...formData.costs, hrCostsPercent: v }
                    })}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">{formData.costs.hrCostsPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Metrics - Essential */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Indicateurs Opérationnels
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fte">Effectif (ETP) *</Label>
                <Input
                  id="fte"
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={formData.ops.productivity.fte}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    ops: { 
                      ...formData.ops, 
                      productivity: { ...formData.ops.productivity, fte: Number(e.target.value) }
                    }
                  })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="occupancyRatePercent">Taux d'occupation (%) *</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[formData.ops.occupancyRatePercent]}
                    onValueChange={([v]) => setFormData({ 
                      ...formData, 
                      ops: { ...formData.ops, occupancyRatePercent: v }
                    })}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">{formData.ops.occupancyRatePercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Commercial Metrics - Essential */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-accent" />
              Indicateurs Commerciaux
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="digitalizationPercent">Digitalisation (%) *</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[formData.commercial.digitalizationPercent]}
                    onValueChange={([v]) => setFormData({ 
                      ...formData, 
                      commercial: { ...formData.commercial, digitalizationPercent: v }
                    })}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">{formData.commercial.digitalizationPercent}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loyaltyPercent">Fidélisation clients (%)</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[formData.commercial.loyaltyPercent ?? 0]}
                    onValueChange={([v]) => setFormData({ 
                      ...formData, 
                      commercial: { ...formData.commercial, loyaltyPercent: v }
                    })}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">{formData.commercial.loyaltyPercent ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Metrics - Essential */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-accent" />
              Indicateurs Stratégiques
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="nbServices">Nombre de services/produits</Label>
              <Input
                id="nbServices"
                type="number"
                min="1"
                max="20"
                value={formData.nbServices ?? 1}
                onChange={(e) => setFormData({ ...formData, nbServices: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION AVANCÉE (ACCORDÉON) ===================== */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced" className="border rounded-xl px-6 border-border/50 bg-muted/30">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-2 text-foreground">
                <Gauge className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Indicateurs Avancés</span>
                <span className="text-xs text-muted-foreground ml-2">(optionnel)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <div className="space-y-6 pt-2">
                
                {/* Finance Avancée */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Finance Avancée
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="netMarginPercent">Marge nette (%)</Label>
                      <Input
                        id="netMarginPercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 12"
                        value={formData.finance.netMarginPercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          finance: { 
                            ...formData.finance, 
                            netMarginPercent: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cashRunwayMonths">Trésorerie / Runway (mois)</Label>
                      <Input
                        id="cashRunwayMonths"
                        type="number"
                        min="0"
                        placeholder="ex: 6"
                        value={formData.finance.cashRunwayMonths ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          finance: { 
                            ...formData.finance, 
                            cashRunwayMonths: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Coûts */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Structure des Coûts
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cogsPercent">COGS / Coût des ventes (% du CA)</Label>
                      <Input
                        id="cogsPercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 32"
                        value={formData.costs.cogsPercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          costs: { 
                            ...formData.costs, 
                            cogsPercent: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fixedCostsPercent">Charges fixes (% du CA)</Label>
                      <Input
                        id="fixedCostsPercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 25"
                        value={formData.costs.fixedCostsPercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          costs: { 
                            ...formData.costs, 
                            fixedCostsPercent: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* RH */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Ressources Humaines
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="absenteeismRatePercent">Absentéisme (%)</Label>
                      <Input
                        id="absenteeismRatePercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 5"
                        value={formData.hr?.absenteeismRatePercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          hr: { 
                            ...formData.hr, 
                            absenteeismRatePercent: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="turnoverRatePercent">Turnover (%)</Label>
                      <Input
                        id="turnoverRatePercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 15"
                        value={formData.hr?.turnoverRatePercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          hr: { 
                            ...formData.hr, 
                            turnoverRatePercent: e.target.value ? Number(e.target.value) : undefined 
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Qualité */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    Qualité
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="returnRatePercent">Taux de retours/erreurs (%)</Label>
                      <Input
                        id="returnRatePercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 3"
                        value={formData.ops.quality?.returnRatePercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ops: { 
                            ...formData.ops, 
                            quality: { 
                              ...formData.ops.quality, 
                              returnRatePercent: e.target.value ? Number(e.target.value) : undefined 
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incidentsPerMonth">Incidents par mois</Label>
                      <Input
                        id="incidentsPerMonth"
                        type="number"
                        min="0"
                        placeholder="ex: 2"
                        value={formData.ops.quality?.incidentsPerMonth ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          ops: { 
                            ...formData.ops, 
                            quality: { 
                              ...formData.ops.quality, 
                              incidentsPerMonth: e.target.value ? Number(e.target.value) : undefined 
                            }
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Satisfaction */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Satisfaction Client
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="csatPercent">CSAT (%)</Label>
                      <Input
                        id="csatPercent"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="ex: 85"
                        value={formData.commercial.satisfaction?.csatPercent ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          commercial: { 
                            ...formData.commercial, 
                            satisfaction: { 
                              ...formData.commercial.satisfaction, 
                              csatPercent: e.target.value ? Number(e.target.value) : undefined 
                            }
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nps">NPS (-100 à 100)</Label>
                      <Input
                        id="nps"
                        type="number"
                        min="-100"
                        max="100"
                        placeholder="ex: 42"
                        value={formData.commercial.satisfaction?.nps ?? ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          commercial: { 
                            ...formData.commercial, 
                            satisfaction: { 
                              ...formData.commercial.satisfaction, 
                              nps: e.target.value ? Number(e.target.value) : undefined 
                            }
                          }
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Origin */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <h4 className="font-medium text-foreground">Source des données</h4>
                  <Select 
                    value={formData.dataOrigin} 
                    onValueChange={(v: DataOrigin) => setFormData({ ...formData, dataOrigin: v })}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Saisie manuelle</SelectItem>
                      <SelectItem value="client_declarative">Déclaratif client</SelectItem>
                      <SelectItem value="imported">Import comptable</SelectItem>
                      <SelectItem value="estimated">Estimation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button type="submit" size="lg" className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold">
          Calculer le Score
        </Button>
      </div>
    </form>
  );
}
