import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BellOff, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useReminders } from '@/contexts/ReminderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddReminderDialogProps {
  categoryId: string;
  preselectedDate: Date | null;
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

export function AddReminderDialog({ categoryId, preselectedDate, open, onOpenChange }: AddReminderDialogProps) {
  const { addReminder, notificationPermission, requestNotificationPermission } = useReminders();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(preselectedDate || new Date());
  const [time, setTime] = useState('');
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(true);
  const [alarmMinutesBefore, setAlarmMinutesBefore] = useState(15);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

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

    // Request notification permission if alarm is enabled
    if (isAlarmEnabled && notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Notifiche non autorizzate. Il promemoria sarà creato senza sveglia.');
      }
    }

    addReminder({
      categoryId,
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time: time || undefined,
      isAlarmEnabled: isAlarmEnabled && notificationPermission === 'granted',
      alarmMinutesBefore,
      isCompleted: false,
      priority,
    });

    toast.success('Promemoria creato!');
    
    // Reset form
    setTitle('');
    setDescription('');
    setDate(preselectedDate || new Date());
    setTime('');
    setIsAlarmEnabled(true);
    setAlarmMinutesBefore(15);
    setPriority('medium');
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
              <h2 className="font-display text-xl font-bold">Nuovo Promemoria</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Titolo</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Es. Chiamare il dottore"
                  className="glass border-border/50"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Aggiungi dettagli..."
                  className="glass border-border/50 min-h-[80px]"
                />
              </div>

              {/* Date & Time */}
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
                  <Label htmlFor="time">Ora (opzionale)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="glass border-border/50"
                  />
                </div>
              </div>

              {/* Priority */}
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

              {/* Alarm Toggle */}
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

              {/* Submit */}
              <Button type="submit" className="w-full glow">
                Crea Promemoria
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
