import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Loader2 } from 'lucide-react';
import { useSendPdfEmail } from '@/hooks/useAudit';

export function EmailPdfButton() {
  const [email, setEmail] = useState('');
  const [showInput, setShowInput] = useState(false);
  const { sendPdfEmail, isPdfGenerating } = useSendPdfEmail();

  const handleSend = async () => {
    if (email && email.includes('@')) {
      await sendPdfEmail(email);
      setShowInput(false);
      setEmail('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showInput && (
        <Input
          type="email"
          placeholder="email@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="w-64"
        />
      )}
      <Button 
        onClick={showInput ? handleSend : () => setShowInput(true)}
        disabled={isPdfGenerating}
        variant="outline"
      >
        {isPdfGenerating ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Mail className="w-4 h-4 mr-2" />
        )}
        {showInput ? 'Envoyer' : 'Email PDF'}
      </Button>
    </div>
  );
}
