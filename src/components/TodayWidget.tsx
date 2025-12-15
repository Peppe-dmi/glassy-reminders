import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useReminders } from '@/contexts/ReminderContext';
import { useNavigate } from 'react-router-dom';
import { Reminder } from '@/types/reminder';

const priorityColors: Record<string, string> = {
  low: 'bg-muted',
  medium: 'bg-category-work/20',
  high: 'bg-destructive/20',
};

interface MiniReminderProps {
  reminder: Reminder;
  categoryName: string;
  categoryIcon: string;
  onClick: () => void;
}

function MiniReminder({ reminder, categoryName, categoryIcon, onClick }: MiniReminderProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl glass-subtle hover:bg-muted/50 transition-all ${priorityColors[reminder.priority]}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{categoryIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{reminder.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{categoryName}</span>
            {reminder.time && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {reminder.time}
                </span>
              </>
            )}
          </div>
        </div>
        {reminder.priority === 'high' && (
          <span className="text-destructive text-xs">⚡</span>
        )}
      </div>
    </motion.button>
  );
}

export function TodayWidget() {
  const { 
    categories, 
    getTodayReminders, 
    getTomorrowReminders, 
    getOverdueReminders,
    getStats 
  } = useReminders();
  const navigate = useNavigate();

  const todayReminders = getTodayReminders();
  const tomorrowReminders = getTomorrowReminders();
  const overdueReminders = getOverdueReminders();
  const stats = getStats();

  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return { name: cat?.name || '', icon: cat?.icon || '📋' };
  };

  const handleReminderClick = (reminder: Reminder) => {
    navigate(`/category/${reminder.categoryId}`);
  };

  if (todayReminders.length === 0 && tomorrowReminders.length === 0 && overdueReminders.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mb-6"
    >
      {/* Overdue Alert */}
      {overdueReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-4 border-l-4 border-destructive bg-destructive/5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">In ritardo</h3>
              <p className="text-xs text-muted-foreground">{overdueReminders.length} promemoria scaduti</p>
            </div>
          </div>
          <div className="space-y-2">
            {overdueReminders.slice(0, 3).map((reminder) => {
              const { name, icon } = getCategoryInfo(reminder.categoryId);
              return (
                <MiniReminder
                  key={reminder.id}
                  reminder={reminder}
                  categoryName={name}
                  categoryIcon={icon}
                  onClick={() => handleReminderClick(reminder)}
                />
              );
            })}
            {overdueReminders.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{overdueReminders.length - 3} altri in ritardo
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Today's Reminders */}
      {todayReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Oggi</h3>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE d MMMM", { locale: it })}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-primary">{todayReminders.length}</span>
          </div>
          <div className="space-y-2">
            {todayReminders.slice(0, 4).map((reminder) => {
              const { name, icon } = getCategoryInfo(reminder.categoryId);
              return (
                <MiniReminder
                  key={reminder.id}
                  reminder={reminder}
                  categoryName={name}
                  categoryIcon={icon}
                  onClick={() => handleReminderClick(reminder)}
                />
              );
            })}
            {todayReminders.length > 4 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{todayReminders.length - 4} altri oggi
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Tomorrow's Preview */}
      {tomorrowReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-subtle rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Domani</h3>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(Date.now() + 86400000), "EEEE d MMMM", { locale: it })}
                </p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">{tomorrowReminders.length}</span>
          </div>
          <div className="space-y-2">
            {tomorrowReminders.slice(0, 2).map((reminder) => {
              const { name, icon } = getCategoryInfo(reminder.categoryId);
              return (
                <MiniReminder
                  key={reminder.id}
                  reminder={reminder}
                  categoryName={name}
                  categoryIcon={icon}
                  onClick={() => handleReminderClick(reminder)}
                />
              );
            })}
            {tomorrowReminders.length > 2 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{tomorrowReminders.length - 2} altri domani
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      {stats.completedThisWeek > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>{stats.completedThisWeek} completati questa settimana</span>
        </motion.div>
      )}
    </motion.div>
  );
}

