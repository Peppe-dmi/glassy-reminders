import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Bell, BellOff, Trash2, Smartphone, ExternalLink, Copy, Check } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { useNtfy } from '@/hooks/useNtfy';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { 
    exportData, 
    importData, 
    importCategory, 
    notificationPermission, 
    requestNotificationPermission,
    testNotification 
  } = useReminders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  
  // ntfy.sh integration
  const { config: ntfyConfig, enableNtfy, disableNtfy, testNotification: testNtfy, generateTopic, isEnabled: ntfyEnabled } = useNtfy();
  const [ntfyTopic, setNtfyTopic] = useState(ntfyConfig.topic || '');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promemoria-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup esportato!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (importData(data)) {
          toast.success('Dati importati con successo!');
          onOpenChange(false);
        } else {
          toast.error('File non valido');
        }
      } catch {
        toast.error('Errore durante l\'importazione');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportCategory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const success = importCategory(event.target?.result as string);
        if (success) {
          toast.success('Categoria importata!');
        } else {
          toast.error('File non valido');
        }
      } catch {
        toast.error('Errore durante l\'importazione');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
    if (confirm('Sei sicuro di voler eliminare tutti i dati? Questa azione non può essere annullata.')) {
      localStorage.removeItem('reminder-categories');
      localStorage.removeItem('reminder-items');
      window.location.reload();
    }
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
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Impostazioni</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Notifications */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifiche
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                  {notificationPermission === 'granted' ? (
                    <>
                      <div className="flex items-center gap-3 text-green-500">
                        <Bell className="w-5 h-5" />
                        <span>Notifiche attive</span>
                      </div>
                      <Button
                        onClick={() => {
                          const success = testNotification();
                          if (success) {
                            toast.success('Notifica di test inviata!');
                          } else {
                            toast.error('Errore nell\'invio della notifica');
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        🔔 Testa notifica
                      </Button>
                    </>
                  ) : notificationPermission === 'denied' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-destructive">
                        <BellOff className="w-5 h-5" />
                        <span>Notifiche bloccate</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per abilitarle, clicca sull'icona del lucchetto 🔒 nella barra degli indirizzi e abilita le notifiche
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={async () => {
                        const granted = await requestNotificationPermission();
                        if (granted) {
                          toast.success('Notifiche abilitate!');
                        } else {
                          toast.error('Permesso negato');
                        }
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Attiva notifiche
                    </Button>
                  )}
                </div>
              </div>

              {/* Push Notifications via ntfy.sh */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Notifiche Push (Mobile)
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    📱 Ricevi notifiche <strong>anche con l'app chiusa</strong> tramite <a href="https://ntfy.sh" target="_blank" rel="noopener" className="text-primary underline">ntfy.sh</a> (gratis!)
                  </p>
                  
                  {!ntfyEnabled ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs font-medium">1. Installa l'app ntfy:</p>
                        <div className="flex gap-2">
                          <a 
                            href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" 
                            target="_blank" 
                            rel="noopener"
                            className="flex-1"
                          >
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              🤖 Android
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </a>
                          <a 
                            href="https://apps.apple.com/app/ntfy/id1625396347" 
                            target="_blank" 
                            rel="noopener"
                            className="flex-1"
                          >
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              🍎 iPhone
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </a>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs font-medium">2. Scegli un nome segreto (topic):</p>
                        <div className="flex gap-2">
                          <Input
                            value={ntfyTopic}
                            onChange={(e) => setNtfyTopic(e.target.value)}
                            placeholder="es: miei-promemoria-xyz"
                            className="flex-1 text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const topic = generateTopic();
                              setNtfyTopic(topic);
                              toast.success('Topic generato!');
                            }}
                          >
                            🎲
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Usa lo stesso nome nell'app ntfy per ricevere le notifiche
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => {
                          if (ntfyTopic.trim()) {
                            enableNtfy(ntfyTopic);
                            toast.success('Notifiche push attivate!');
                          } else {
                            toast.error('Inserisci un nome topic');
                          }
                        }}
                        className="w-full"
                        disabled={!ntfyTopic.trim()}
                      >
                        ✅ Attiva notifiche push
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-green-500">
                        <Smartphone className="w-5 h-5" />
                        <span>Notifiche push attive</span>
                      </div>
                      
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <span className="text-xs text-muted-foreground">Topic:</span>
                        <code className="flex-1 text-xs font-mono">{ntfyConfig.topic}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(ntfyConfig.topic);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            toast.success('Topic copiato!');
                          }}
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            setTesting(true);
                            const success = await testNtfy();
                            setTesting(false);
                            if (success) {
                              toast.success('Notifica push inviata! Controlla l\'app ntfy');
                            } else {
                              toast.error('Errore invio notifica');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={testing}
                        >
                          {testing ? '⏳' : '🔔'} Testa
                        </Button>
                        <Button
                          onClick={() => {
                            disableNtfy();
                            setNtfyTopic('');
                            toast.info('Notifiche push disattivate');
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive"
                        >
                          Disattiva
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Backup */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Download className="w-4 h-4" /> Backup & Ripristino
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleExport}
                    variant="outline"
                    className="glass border-border/50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Esporta
                  </Button>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="glass border-border/50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importa
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>

              {/* Import Category */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Importa Categoria
                </h3>
                <p className="text-sm text-muted-foreground">
                  Importa una categoria condivisa da un amico
                </p>
                <Button
                  onClick={() => categoryInputRef.current?.click()}
                  variant="outline"
                  className="w-full glass border-border/50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleziona file categoria
                </Button>
                <input
                  ref={categoryInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportCategory}
                  className="hidden"
                />
              </div>

              {/* Danger Zone */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Zona Pericolosa
                </h3>
                <Button
                  onClick={handleClearData}
                  variant="destructive"
                  className="w-full"
                >
                  Elimina tutti i dati
                </Button>
              </div>

              {/* PWA Install hint */}
              <div className="glass-subtle rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  💡 Puoi installare questa app: vai nel menu del browser e seleziona "Aggiungi alla schermata Home"
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
