import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderItem } from './ReminderItem';
import { AddReminderDialog } from './AddReminderDialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';

const colorClasses: Record<string, string> = {
  work: 'bg-category-work',
  personal: 'bg-category-personal',
  friends: 'bg-category-friends',
  health: 'bg-category-health',
  finance: 'bg-category-finance',
  default: 'bg-category-default',
};

export function CategoryView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { categories, getRemindersByCategory } = useReminders();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddReminder, setShowAddReminder] = useState(false);

  const category = categories.find(c => c.id === categoryId);
  const reminders = categoryId ? getRemindersByCategory(categoryId) : [];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getReminderCountForDate = (date: Date) => {
    return reminders.filter(r => isSameDay(new Date(r.date), date) && !r.isCompleted).length;
  };

  const filteredReminders = selectedDate
    ? reminders.filter(r => isSameDay(new Date(r.date), selectedDate))
    : reminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Categoria non trovata</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 right-0 w-80 h-80 ${colorClasses[category.color]} opacity-10 rounded-full blur-[120px]`} />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 glass-subtle sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center gap-3 flex-1">
              <div className="text-3xl">{category.icon}</div>
              <div>
                <h1 className="font-display text-xl font-bold">{category.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {reminders.filter(r => !r.isCompleted).length} promemoria attivi
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6 pb-24">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 mb-6"
        >
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </h2>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const reminderCount = getReminderCountForDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                    ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                    ${isSelected ? `${colorClasses[category.color]} text-background font-bold` : ''}
                    ${isToday && !isSelected ? 'ring-2 ring-primary' : ''}
                    ${!isSelected ? 'hover:bg-muted' : ''}
                  `}
                >
                  <span>{format(day, 'd')}</span>
                  {reminderCount > 0 && !isSelected && (
                    <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${colorClasses[category.color]}`} />
                  )}
                  {reminderCount > 0 && isSelected && (
                    <span className="text-[10px]">{reminderCount}</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Filter info */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                Mostrando: {format(selectedDate, 'd MMMM yyyy', { locale: it })}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm text-primary hover:underline"
              >
                Mostra tutti
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Reminders List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">
              {selectedDate ? 'Promemoria del giorno' : 'Tutti i promemoria'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {filteredReminders.length} elementi
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredReminders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-subtle rounded-2xl p-8 text-center"
              >
                <p className="text-muted-foreground">
                  {selectedDate ? 'Nessun promemoria per questa data' : 'Nessun promemoria'}
                </p>
              </motion.div>
            ) : (
              filteredReminders.map((reminder, index) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ReminderItem reminder={reminder} categoryColor={category.color} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowAddReminder(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-2xl ${colorClasses[category.color]} shadow-lg flex items-center justify-center z-20`}
      >
        <Plus className="w-6 h-6 text-background" />
      </motion.button>

      <AddReminderDialog
        categoryId={categoryId!}
        preselectedDate={selectedDate}
        open={showAddReminder}
        onOpenChange={setShowAddReminder}
      />
    </div>
  );
}
