import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderItem } from './ReminderItem';
import { AddReminderDialog } from './AddReminderDialog';
import { ThemeToggle } from './ThemeToggle';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

const categoryGradients: Record<string, string> = {
  work: 'from-amber-500 to-orange-600',
  personal: 'from-sky-400 to-blue-600',
  friends: 'from-pink-500 to-rose-600',
  health: 'from-emerald-400 to-green-600',
  finance: 'from-violet-500 to-purple-600',
  default: 'from-primary to-accent',
};

export function CategoryView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { categories, getRemindersByCategory } = useReminders();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const category = categories.find(c => c.id === categoryId);
  const reminders = categoryId ? getRemindersByCategory(categoryId) : [];
  const gradient = category ? categoryGradients[category.color] || categoryGradients.default : categoryGradients.default;

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

  const pendingCount = reminders.filter(r => !r.isCompleted).length;
  const completedCount = reminders.filter(r => r.isCompleted).length;

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Categoria non trovata</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Colored Header Background */}
      <div className={`absolute top-0 left-0 right-0 h-64 bg-gradient-to-br ${gradient}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="safe-area-top px-5 pt-4">
          <div className="flex items-center justify-between mb-8">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </motion.button>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCalendar(!showCalendar)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  showCalendar ? 'bg-white text-gray-900' : 'bg-white/20 backdrop-blur-sm text-white'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Category Info */}
          <div className="text-white mb-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-5xl">{category.icon}</div>
              <div>
                <h1 className="text-3xl font-bold font-display">{category.name}</h1>
                <p className="text-white/80 text-sm">
                  {pendingCount} attivi • {completedCount} completati
                </p>
              </div>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{pendingCount}</p>
              <p className="text-xs text-white/80">Da fare</p>
            </div>
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{completedCount}</p>
              <p className="text-xs text-white/80">Completati</p>
            </div>
            <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {pendingCount + completedCount > 0 
                  ? Math.round((completedCount / (pendingCount + completedCount)) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-white/80">Progresso</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-background rounded-t-3xl px-5 pt-6 pb-24 -mt-2">
          {/* Calendar (collapsible) */}
          <AnimatePresence>
            {showCalendar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="glass rounded-2xl p-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                      className="p-2 rounded-xl hover:bg-muted transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="font-semibold capitalize">
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
                      const isTodayDate = isToday(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);

                      return (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedDate(isSelected ? null : day)}
                          className={`
                            relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                            ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                            ${isSelected ? `bg-gradient-to-br ${gradient} text-white font-bold` : ''}
                            ${isTodayDate && !isSelected ? 'ring-2 ring-primary' : ''}
                            ${!isSelected ? 'hover:bg-muted' : ''}
                          `}
                        >
                          <span>{format(day, 'd')}</span>
                          {reminderCount > 0 && !isSelected && (
                            <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Filter info */}
                  {selectedDate && (
                    <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {format(selectedDate, 'd MMMM yyyy', { locale: it })}
                      </span>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-sm text-primary hover:underline"
                      >
                        Mostra tutti
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section Title */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {selectedDate 
                ? format(selectedDate, 'd MMMM', { locale: it }) 
                : 'Tutti i promemoria'}
            </h3>
            <span className="text-sm text-muted-foreground">
              {filteredReminders.length} elementi
            </span>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredReminders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-2xl p-8 text-center"
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradient} opacity-20 flex items-center justify-center`}>
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold mb-1">Nessun promemoria</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate ? 'Niente per questa data' : 'Aggiungi il primo!'}
                  </p>
                </motion.div>
              ) : (
                filteredReminders.map((reminder, index) => (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.03 }}
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
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddReminder(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br ${gradient} shadow-lg flex items-center justify-center z-50 safe-area-bottom`}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      <AddReminderDialog
        categoryId={categoryId!}
        preselectedDate={selectedDate}
        open={showAddReminder}
        onOpenChange={setShowAddReminder}
      />
    </div>
  );
}
