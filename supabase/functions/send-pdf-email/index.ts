import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditData {
  nom?: string;
  businessName?: string;
  secteur?: string;
  sector?: string;
}

interface Scores {
  global: number;
  financier: number;
  operationnel: number;
  commercial: number;
  strategique: number;
}

interface DecisionOutput {
  priorityLevel: 'CRITIQUE' | 'ÉLEVÉ' | 'MODÉRÉ' | 'FAIBLE';
  topRisks: string[];
  topLevers: string[];
  quickWins: string[];
  structuralActions: string[];
  decisionSummary: string;
}

interface EmailRequest {
  auditData: AuditData;
  scores: Scores;
  decision?: DecisionOutput;
  recipientEmail: string;
  businessName: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Bon';
  if (score >= 40) return 'À améliorer';
  return 'Critique';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auditData, scores, decision, recipientEmail, businessName }: EmailRequest = await req.json();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      throw new Error('Email invalide');
    }

    const globalColor = getScoreColor(scores.global);
    const globalLabel = getScoreLabel(scores.global);
    
    const priorityColor = decision ? getPriorityColor(decision.priorityLevel) : '#3b82f6';
    
    const decisionSection = decision ? `
      <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 12px; border-left: 4px solid ${priorityColor};">
        <h3 style="margin: 0 0 10px; color: #1e293b;">Synthèse Décisionnelle</h3>
        <div style="display: inline-block; padding: 4px 12px; background: ${priorityColor}; color: white; border-radius: 4px; font-weight: bold; margin-bottom: 10px;">
          Priorité ${decision.priorityLevel}
        </div>
        <p style="color: #64748b; margin: 10px 0;">${decision.decisionSummary}</p>
        ${decision.topLevers.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong style="color: #334155;">Leviers prioritaires :</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #475569;">
              ${decision.topLevers.slice(0, 3).map(l => `<li>${l}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : '';

    function getPriorityColor(level: string): string {
      switch (level) {
        case 'CRITIQUE': return '#ef4444';
        case 'ÉLEVÉ': return '#f59e0b';
        case 'MODÉRÉ': return '#3b82f6';
        default: return '#22c55e';
      }
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
    .content { padding: 30px; }
    .score-global { text-align: center; margin-bottom: 30px; }
    .score-circle { width: 120px; height: 120px; border-radius: 50%; background: ${globalColor}; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 36px; font-weight: bold; }
    .score-label { margin-top: 10px; color: ${globalColor}; font-weight: 600; font-size: 18px; }
    .dimensions { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .dimension { background: #f1f5f9; padding: 15px; border-radius: 8px; }
    .dimension-title { font-weight: 600; color: #334155; margin-bottom: 5px; }
    .dimension-score { font-size: 24px; font-weight: bold; color: #1e293b; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rapport d'Audit 4D</h1>
      <p>${businessName}</p>
    </div>
    <div class="content">
      <div class="score-global">
        <div class="score-circle">${scores.global}</div>
        <div class="score-label">${globalLabel}</div>
      </div>
      <div class="dimensions">
        <div class="dimension">
          <div class="dimension-title">📊 Financier</div>
          <div class="dimension-score" style="color: ${getScoreColor(scores.financier)}">${scores.financier}/100</div>
        </div>
        <div class="dimension">
          <div class="dimension-title">⚙️ Opérationnel</div>
          <div class="dimension-score" style="color: ${getScoreColor(scores.operationnel)}">${scores.operationnel}/100</div>
        </div>
        <div class="dimension">
          <div class="dimension-title">🛒 Commercial</div>
          <div class="dimension-score" style="color: ${getScoreColor(scores.commercial)}">${scores.commercial}/100</div>
        </div>
        <div class="dimension">
          <div class="dimension-title">🎯 Stratégique</div>
          <div class="dimension-score" style="color: ${getScoreColor(scores.strategique)}">${scores.strategique}/100</div>
        </div>
      </div>
      ${decisionSection}
      <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
        Ce rapport a été généré automatiquement par AuditScore. 
        Pour un rapport complet, téléchargez le PDF depuis l'application.
      </p>
      <p style="margin-top: 10px; color: #94a3b8; font-size: 12px; font-style: italic;">
        Cette synthèse constitue une aide à la décision et ne remplace pas un jugement expert.
      </p>
    </div>
    <div class="footer">
      <p>Scoring 4D paramétré • Benchmarks sectoriels v2.1</p>
      <p>© ${new Date().getFullYear()} AuditScore</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log('Sending email to:', recipientEmail);

    const emailResponse = await resend.emails.send({
      from: 'AuditScore <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Rapport Audit 4D - ${businessName}`,
      html: htmlContent,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in send-pdf-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
