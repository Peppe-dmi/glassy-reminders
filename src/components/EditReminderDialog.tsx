import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Calendar as CalendarIcon, Repeat } from 'lucide-react';

// Feedback tattile leggero
const hapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(8);
  }
};
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Reminder, RecurrenceType } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
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

// Generate hours and minutes for scroll picker
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export function EditReminderDialog({ reminder, open, onOpenChange }: EditReminderDialogProps) {
  const { updateReminder } = useReminders();
  const { hasPermission, requestPermission } = useNativeNotifications();
  
  const [title, setTitle] = useState(reminder.title);
  const [description, setDescription] = useState(reminder.description || '');
  const [date, setDate] = useState<Date | undefined>(new Date(reminder.date));
  const [selectedHour, setSelectedHour] = useState(reminder.time ? reminder.time.split(':')[0] : '09');
  const [selectedMinute, setSelectedMinute] = useState(reminder.time ? reminder.time.split(':')[1] : '00');
  const [hasTime, setHasTime] = useState(!!reminder.time);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(reminder.isAlarmEnabled);
  const [alarmMinutesBefore, setAlarmMinutesBefore] = useState(reminder.alarmMinutesBefore);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(reminder.priority);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(reminder.recurrence || 'none');

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(reminder.title);
      setDescription(reminder.description || '');
      setDate(new Date(reminder.date));
      setSelectedHour(reminder.time ? reminder.time.split(':')[0] : '09');
      setSelectedMinute(reminder.time ? reminder.time.split(':')[1] : '00');
      setHasTime(!!reminder.time);
      setIsAlarmEnabled(reminder.isAlarmEnabled);
      setAlarmMinutesBefore(reminder.alarmMinutesBefore);
      setPriority(reminder.priority);
      setRecurrence(reminder.recurrence || 'none');
    }
  }, [open, reminder]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }
    
    if (!date) {
      toast.error('Seleziona una data');
      return;
    }

    if (isAlarmEnabled && !hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        toast.error('Abilita le notifiche nelle impostazioni del telefono');
      }
    }

    const time = hasTime ? `${selectedHour}:${selectedMinute}` : undefined;

    updateReminder(reminder.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time,
      isAlarmEnabled: isAlarmEnabled && hasPermission,
      alarmMinutesBefore,
      priority,
      recurrence,
    });

    toast.success('Promemoria aggiornato!');
    onOpenChange(false);
  };

  const scrollToCenter = (ref: React.RefObject<HTMLDivElement>, value: string, items: string[]) => {
    if (ref.current) {
      const index = items.indexOf(value);
      const itemHeight = 48;
      ref.current.scrollTop = index * itemHeight;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="glass-strong w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto safe-area-bottom"
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

            <div className="space-y-5">
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

              {/* Date */}
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
                      {date ? format(date, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona data"}
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

              {/* Time Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Imposta orario</Label>
                  <button
                    type="button"
                    onClick={() => setHasTime(!hasTime)}
                    className={`relative w-12 h-7 rounded-full transition-colors ${
                      hasTime ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <motion.div
                      animate={{ x: hasTime ? 20 : 2 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-foreground"
                    />
                  </button>
                </div>

                {/* Time Picker - Android Style Scroll */}
                {hasTime && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center gap-4"
                  >
                    <div className="relative">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/20 rounded-xl pointer-events-none z-10" />
                      <div
                        ref={hourRef}
                        className="h-36 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                        style={{ scrollSnapType: 'y mandatory' }}
                        onScroll={(e) => {
                          const scrollTop = e.currentTarget.scrollTop;
                          const index = Math.round(scrollTop / 48);
                          if (hours[index] && hours[index] !== selectedHour) {
                            setSelectedHour(hours[index]);
                            hapticFeedback();
                          }
                        }}
                      >
                        <div className="h-12" />
                        {hours.map((h) => (
                          <div
                            key={h}
                            className={cn(
                              "h-12 w-20 flex items-center justify-center text-2xl font-bold snap-center transition-all",
                              selectedHour === h ? "text-primary scale-110" : "text-muted-foreground"
                            )}
                            onClick={() => {
                              setSelectedHour(h);
                              scrollToCenter(hourRef, h, hours);
                            }}
                          >
                            {h}
                          </div>
                        ))}
                        <div className="h-12" />
                      </div>
                    </div>

                    <div className="flex items-center text-3xl font-bold">:</div>

                    <div className="relative">
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 bg-primary/20 rounded-xl pointer-events-none z-10" />
                      <div
                        ref={minuteRef}
                        className="h-36 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                        style={{ scrollSnapType: 'y mandatory' }}
                        onScroll={(e) => {
                          const scrollTop = e.currentTarget.scrollTop;
                          const index = Math.round(scrollTop / 48);
                          if (minutes[index] && minutes[index] !== selectedMinute) {
                            setSelectedMinute(minutes[index]);
                            hapticFeedback();
                          }
                        }}
                      >
                        <div className="h-12" />
                        {minutes.map((m) => (
                          <div
                            key={m}
                            className={cn(
                              "h-12 w-20 flex items-center justify-center text-2xl font-bold snap-center transition-all",
                              selectedMinute === m ? "text-primary scale-110" : "text-muted-foreground"
                            )}
                            onClick={() => {
                              setSelectedMinute(m);
                              scrollToCenter(minuteRef, m, minutes);
                            }}
                          >
                            {m}
                          </div>
                        ))}
                        <div className="h-12" />
                      </div>
                    </div>
                  </motion.div>
                )}
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

              <div className="pt-4 pb-8">
                <Button 
                  type="button"
                  onClick={handleSubmit} 
                  className="w-full h-14 text-base font-semibold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                >
                  Salva Modifiche
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
