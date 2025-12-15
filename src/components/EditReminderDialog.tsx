import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Reminder, RecurrenceType } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditReminderDialogProps {
  reminder: Reminder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const alarmOptions = [
  { value: 0, label: "All'ora esatta" },
  { value: 5, label: '5 minuti prima' },
  { value: 15, label: '15 minuti prima' },
  { value: 30, label: '30 minuti prima' },
  { value: 60, label: '1 ora prima' },
  { value: 1440, label: '1 giorno prima' },
];

const recurrenceOptions: { value: RecurrenceType; label: string; icon: string }[] = [
  { value: 'none', label: 'Mai', icon: '○' },
  { value: 'daily', label: 'Ogni giorno', icon: '📆' },
  { value: 'weekly', label: 'Ogni settimana', icon: '📅' },
  { value: 'monthly', label: 'Ogni mese', icon: '🗓️' },
  { value: 'yearly', label: 'Ogni anno', icon: '🎂' },
];

export function EditReminderDialog({ reminder, open, onOpenChange }: EditReminderDialogProps) {
  const { updateReminder, notificationPermission, requestNotificationPermission } = useReminders();
  
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [date, setDate] = useState<Date | undefined>(new Date(reminder.date));
  const [time, setTime] = useState(reminder.time || '');
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(reminder.isAlarmEnabled);
  const [alarmMinutesBefore, setAlarmMinutesBefore] = useState(reminder.alarmMinutesBefore);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(reminder.priority);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(reminder.recurrence || 'none');

  useEffect(() => {
    if (open) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setDate(new Date(reminder.date));
      setTime(reminder.time || '');
      setIsAlarmEnabled(reminder.isAlarmEnabled);
      setAlarmMinutesBefore(reminder.alarmMinutesBefore);
      setPriority(reminder.priority);
      setRecurrence(reminder.recurrence || 'none');
    }
  }, [open, reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }
    
    if (!date) {
      toast.error('Seleziona una data');
      return;
    }

    if (isAlarmEnabled && notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Notifiche non autorizzate');
      }
    }

    updateReminder(reminder.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time: time || undefined,
      isAlarmEnabled: isAlarmEnabled && notificationPermission === 'granted',
      alarmMinutesBefore,
      priority,
      recurrence,
    });

    toast.success('Promemoria aggiornato!');
    onOpenChange(false);
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
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Modifica Promemoria</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titolo</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrizione</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="glass border-border/50 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal glass border-border/50",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "d MMM", { locale: it }) : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass border-border/50" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-time">Ora</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="glass border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priorità</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'low', label: 'Bassa', icon: '○' },
                    { value: 'medium', label: 'Media', icon: '→' },
                    { value: 'high', label: 'Alta', icon: '⚡' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value as 'low' | 'medium' | 'high')}
                      className={`p-3 rounded-xl text-sm transition-all ${
                        priority === p.value
                          ? 'glass-strong ring-2 ring-primary'
                          : 'glass-subtle hover:bg-muted'
                      }`}
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurrence */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Ripeti
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {recurrenceOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecurrence(opt.value)}
                      className={`p-2 rounded-xl text-sm transition-all ${
                        recurrence === opt.value
                          ? 'glass-strong ring-2 ring-primary'
                          : 'glass-subtle hover:bg-muted'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    {isAlarmEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    Notifica promemoria
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsAlarmEnabled(!isAlarmEnabled)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      isAlarmEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <motion.div
                      animate={{ x: isAlarmEnabled ? 20 : 2 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                    />
                  </button>
                </div>

                {isAlarmEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {alarmOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAlarmMinutesBefore(option.value)}
                        className={`p-2 rounded-xl text-sm transition-all ${
                          alarmMinutesBefore === option.value
                            ? 'glass-strong ring-2 ring-primary'
                            : 'glass-subtle hover:bg-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Salva Modifiche
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
