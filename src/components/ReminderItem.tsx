import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Bell, BellOff, Clock, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Reminder } from '@/types/reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { EditReminderDialog } from './EditReminderDialog';
import { toast } from 'sonner';

interface ReminderItemProps {
  reminder: Reminder;
  categoryColor: string;
}

const colorClasses: Record<string, string> = {
  work: 'bg-category-work',
  personal: 'bg-category-personal',
  friends: 'bg-category-friends',
  health: 'bg-category-health',
  finance: 'bg-category-finance',
  default: 'bg-category-default',
};

const priorityClasses: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-category-work',
  high: 'text-destructive',
};

export function ReminderItem({ reminder, categoryColor }: ReminderItemProps) {
  const { toggleReminderComplete, deleteReminder } = useReminders();
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleReminderComplete(reminder.id);
    if (!reminder.isCompleted) {
      toast.success('Promemoria completato!');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteReminder(reminder.id);
    toast.success('Promemoria eliminato');
  };

  const isPast = new Date(reminder.date) < new Date() && !reminder.isCompleted;

  return (
    <>
      <motion.div
        layout
        className={`glass rounded-2xl overflow-hidden transition-all ${reminder.isCompleted ? 'opacity-60' : ''}`}
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleComplete}
              className={`
                w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                ${reminder.isCompleted 
                  ? `${colorClasses[categoryColor]} border-transparent` 
                  : `border-border hover:border-primary`
                }
              `}
            >
              {reminder.isCompleted && <Check className="w-4 h-4 text-background" />}
            </motion.button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className={`font-medium ${reminder.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                  {reminder.title}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {reminder.isAlarmEnabled ? (
                    <Bell className="w-4 h-4 text-primary" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground/50" />
                  )}
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className={`flex items-center gap-1 ${isPast ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(reminder.date), 'd MMM', { locale: it })}
                  {reminder.time && ` · ${reminder.time}`}
                </span>
                <span className={`text-xs font-medium ${priorityClasses[reminder.priority]}`}>
                  {reminder.priority === 'high' ? '⚡ Alta' : reminder.priority === 'medium' ? '→ Media' : '○ Bassa'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 border-t border-border/50"
          >
            {reminder.description && (
              <p className="text-sm text-muted-foreground mt-3 mb-3">
                {reminder.description}
              </p>
            )}

            {reminder.isAlarmEnabled && (
              <div className="glass-subtle rounded-xl p-3 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span>
                    Notifica {reminder.alarmMinutesBefore === 0 
                      ? "all'ora esatta" 
                      : `${reminder.alarmMinutesBefore} minuti prima`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowEdit(true); }}
                className="flex-1 py-2 px-3 rounded-xl glass-subtle flex items-center justify-center gap-2 text-sm hover:bg-muted transition-colors"
              >
                <Edit className="w-4 h-4" /> Modifica
              </button>
              <button
                onClick={handleDelete}
                className="py-2 px-3 rounded-xl glass-subtle flex items-center justify-center gap-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <EditReminderDialog reminder={reminder} open={showEdit} onOpenChange={setShowEdit} />
    </>
  );
}
