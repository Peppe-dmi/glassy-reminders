import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Download, Upload, Check } from 'lucide-react';
import { Category } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface ShareCategoryDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCategoryDialog({ category, open, onOpenChange }: ShareCategoryDialogProps) {
  const { exportCategory } = useReminders();
  const [copied, setCopied] = useState(false);

  const exportData = exportCategory(category.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      toast.success('Copiato negli appunti!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossibile copiare');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.name.toLowerCase().replace(/\s+/g, '-')}-promemoria.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File scaricato!');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Condividi "{category.name}"</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-muted-foreground mb-6">
              Condividi questa categoria con i tuoi amici! Possono importarla nella loro app.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full glass border-border/50 justify-start gap-3"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiato!' : 'Copia negli appunti'}
              </Button>

              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full glass border-border/50 justify-start gap-3"
              >
                <Download className="w-5 h-5" />
                Scarica come file
              </Button>
            </div>

            <div className="mt-6 p-4 glass-subtle rounded-xl">
              <p className="text-xs text-muted-foreground">
                💡 Il tuo amico può importare questo file andando in Impostazioni → Importa Categoria
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
