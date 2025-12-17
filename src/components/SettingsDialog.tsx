import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Bell, BellOff, Trash2, Vibrate, AlarmClock, Settings2, CheckCircle, Clock, User } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { 
    exportData, 
    importData, 
    importCategory,
    deleteCompletedReminders,
    deleteOldReminders,
    getCompletedCount,
    getStats,
  } = useReminders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const [testing, setTesting] = useState(false);
  
  // Native notifications
  const { 
    hasPermission, 
    requestPermission, 
    testNotification,
    isNative 
  } = useNativeNotifications();

  // Notification settings
  const {
    settings: notifSettings,
    setVibrationEnabled,
    setAlarmMode,
  } = useNotificationSettings();

  // User settings
  const { userName, setUserName } = useUserSettings();
  const [nameInput, setNameInput] = useState(userName);

  // Apri impostazioni notifiche Android
  const openNotificationSettings = async () => {
    try {
      await NativeSettings.openAndroid({
        option: AndroidSettings.AppNotification,
      });
    } catch {
      // Fallback: prova ad aprire le impostazioni generali dell'app
      try {
        await NativeSettings.openAndroid({
          option: AndroidSettings.ApplicationDetails,
        });
      } catch {
        toast.error('Non riesco ad aprire le impostazioni');
      }
    }
  };

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

  const handleDeleteCompleted = () => {
    const count = getCompletedCount();
    if (count === 0) {
      toast.info('Nessun promemoria completato da eliminare');
      return;
    }
    if (confirm(`Eliminare ${count} promemoria completati?`)) {
      const deleted = deleteCompletedReminders();
      toast.success(`${deleted} promemoria eliminati!`);
    }
  };

  const handleDeleteOld = (days: number) => {
    if (confirm(`Eliminare i promemoria completati più vecchi di ${days} giorni?`)) {
      const deleted = deleteOldReminders(days);
      if (deleted > 0) {
        toast.success(`${deleted} promemoria eliminati!`);
      } else {
        toast.info('Nessun promemoria da eliminare');
      }
    }
  };

  const handleClearData = () => {
    if (confirm('Sei sicuro di voler eliminare tutti i dati? Questa azione non può essere annullata.')) {
      localStorage.removeItem('reminder-categories');
      localStorage.removeItem('reminder-items');
      window.location.reload();
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notifiche abilitate!');
    } else {
      toast.error('Permesso negato. Vai nelle impostazioni del telefono per abilitarle.');
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    const success = await testNotification();
    setTesting(false);
    if (success) {
      toast.success('Notifica di test programmata! Arriverà tra 5 secondi.');
    } else {
      toast.error('Errore nell\'invio della notifica');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm safe-area-all"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto safe-area-bottom"
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
              {/* User Name */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" /> Il tuo nome
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Personalizza i saluti e le notifiche con il tuo nome
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Es: Nicolò"
                      className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                    <Button
                      onClick={() => {
                        setUserName(nameInput);
                        toast.success(nameInput ? `Ciao ${nameInput}! 👋` : 'Nome rimosso');
                      }}
                      variant="default"
                      size="sm"
                    >
                      Salva
                    </Button>
                  </div>
                  {userName && (
                    <p className="text-xs text-emerald-500">
                      ✓ Le notifiche diranno "Ei {userName}!"
                    </p>
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4" /> Notifiche
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                  {hasPermission ? (
                    <>
                      <div className="flex items-center gap-3 text-green-500">
                        <Bell className="w-5 h-5" />
                        <span>Notifiche attive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Le notifiche arriveranno anche con l'app chiusa! 🎉
                      </p>
                      <Button
                        onClick={handleTestNotification}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={testing}
                      >
                        {testing ? '⏳ Invio...' : '🔔 Testa notifica'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 text-amber-500">
                        <BellOff className="w-5 h-5" />
                        <span>Notifiche non attive</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Abilita le notifiche per ricevere promemoria anche quando l'app è chiusa
                      </p>
                      <Button
                        onClick={handleRequestPermission}
                        variant="default"
                        className="w-full"
                      >
                        🔔 Attiva notifiche
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Alarm Mode */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlarmClock className="w-4 h-4" /> Modalità Sveglia
                </h3>
                <div className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <span>Notifiche ripetute</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ricevi 4 notifiche a distanza di 1 minuto come una sveglia
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlarmMode(!notifSettings.alarmMode)}
                      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                        notifSettings.alarmMode ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifSettings.alarmMode ? 20 : 2 }}
                        className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Vibration */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Vibrate className="w-4 h-4" /> Vibrazione
                </h3>
                <div className="glass-subtle rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span>Vibra alla notifica</span>
                    <button
                      type="button"
                      onClick={() => {
                        setVibrationEnabled(!notifSettings.vibrationEnabled);
                        if (!notifSettings.vibrationEnabled && 'vibrate' in navigator) {
                          navigator.vibrate([500, 200, 500, 200, 800]);
                        }
                      }}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        notifSettings.vibrationEnabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifSettings.vibrationEnabled ? 20 : 2 }}
                        className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                      />
                    </button>
                  </div>
                  {notifSettings.vibrationEnabled && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚡ Vibrazione forte attiva
                    </p>
                  )}
                </div>
              </div>

              {/* Personalizza Suono */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Personalizza Suono
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Per cambiare il suono delle notifiche, usa le impostazioni native di Android.
                  </p>
                  <Button
                    onClick={openNotificationSettings}
                    variant="default"
                    className="w-full"
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    Apri Impostazioni Notifiche
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Qui puoi scegliere suoneria, vibrazione e altre opzioni direttamente da Android.
                  </p>
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

              {/* Pulizia */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Pulizia
                </h3>
                <div className="glass-subtle rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      Completati
                    </span>
                    <span className="font-bold text-emerald-500">{getCompletedCount()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-500" />
                      Scaduti
                    </span>
                    <span className="font-bold text-rose-500">{getStats().overdueCount}</span>
                  </div>
                </div>

                <Button
                  onClick={handleDeleteCompleted}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Elimina completati ({getCompletedCount()})
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleDeleteOld(7)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Più vecchi di 7gg
                  </Button>
                  <Button
                    onClick={() => handleDeleteOld(30)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Più vecchi di 30gg
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-3">
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

              {/* App info */}
              <div className="glass-subtle rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  📱 Promemoria v1.0
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isNative ? '✅ App nativa con notifiche locali' : '🌐 Versione web'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
