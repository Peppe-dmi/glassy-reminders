import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Bell, Settings, ChevronRight, Clock, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import { AddCategoryDialog } from './AddCategoryDialog';
import { SettingsDialog } from './SettingsDialog';
import { ThemeToggle } from './ThemeToggle';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { it } from 'date-fns/locale';

const categoryColorMap: Record<string, string> = {
  work: 'from-amber-500 to-orange-600',
  personal: 'from-sky-400 to-blue-600',
  friends: 'from-pink-500 to-rose-600',
  health: 'from-emerald-400 to-green-600',
  finance: 'from-violet-500 to-purple-600',
  default: 'from-primary to-accent',
};

export function Dashboard() {
  const { categories, reminders, getStats } = useReminders();
  const { theme } = useTheme();
  const { hasPermission, requestPermission } = useNativeNotifications();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'all'>('today');
  const navigate = useNavigate();

  const stats = getStats();

  const filteredReminders = useMemo(() => {
    const sorted = [...reminders]
      .filter(r => !r.isCompleted)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (activeTab === 'today') {
      return sorted.filter(r => isToday(new Date(r.date)));
    } else if (activeTab === 'upcoming') {
      return sorted.filter(r => !isPast(new Date(r.date)) || isToday(new Date(r.date))).slice(0, 10);
    }
    return sorted.slice(0, 15);
  }, [reminders, activeTab]);

  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const formatReminderDate = (date: Date) => {
    if (isToday(date)) return 'Oggi';
    if (isTomorrow(date)) return 'Domani';
    return format(date, 'EEE d MMM', { locale: it });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-gradient-to-br from-category-friends/30 to-primary/20 blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Hero Header */}
        <header className="safe-area-top px-5 pt-4 pb-6">
          <div className="flex items-center justify-between mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-sm text-muted-foreground mb-1">
                {format(new Date(), 'EEEE d MMMM', { locale: it })}
              </p>
              <h1 className="text-2xl font-bold font-display">
                Ciao! 👋
              </h1>
            </motion.div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {!hasPermission && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={requestPermission}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
                >
                  <Bell className="w-5 h-5 text-white" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-center shadow-lg">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.pendingToday}</p>
              <p className="text-xs text-white/80">Oggi</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-center shadow-lg">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.completedThisWeek}</p>
              <p className="text-xs text-white/80">Completati</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-center shadow-lg">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{stats.overdueCount}</p>
              <p className="text-xs text-white/80">Scaduti</p>
            </div>
          </motion.div>
        </header>

        {/* Categories Scroll */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="px-5 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Categorie</h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="text-primary text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nuova
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
            {categories.map((category, i) => {
              const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
              const gradient = categoryColorMap[category.color] || categoryColorMap.default;
              
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/category/${category.id}`)}
                  className="flex-shrink-0 group"
                >
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex flex-col items-center justify-center shadow-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors" />
                    <span className="text-2xl mb-1">{category.icon}</span>
                    {count > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 text-xs font-bold flex items-center justify-center text-gray-800">
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-2 text-center font-medium truncate w-20">{category.name}</p>
                </motion.button>
              );
            })}

            {/* Add Category Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + categories.length * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddCategory(true)}
              className="flex-shrink-0"
            >
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-xs mt-2 text-center text-muted-foreground">Aggiungi</p>
            </motion.button>
          </div>
        </motion.section>

        {/* Tab Switcher */}
        <div className="px-5 mb-4">
          <div className="bg-card border border-border rounded-2xl p-1.5 flex shadow-sm">
            {(['today', 'upcoming', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'today' ? 'Oggi' : tab === 'upcoming' ? 'Prossimi' : 'Tutti'}
              </button>
            ))}
          </div>
        </div>

        {/* Reminders List */}
        <section className="flex-1 px-5 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {filteredReminders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Tutto fatto!</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'today' 
                      ? 'Nessun promemoria per oggi' 
                      : 'Non hai promemoria in sospeso'}
                  </p>
                </motion.div>
              ) : (
                filteredReminders.map((reminder, i) => {
                  const category = getCategoryById(reminder.categoryId);
                  const gradient = category 
                    ? categoryColorMap[category.color] || categoryColorMap.default
                    : categoryColorMap.default;
                  const isOverdue = isPast(new Date(reminder.date)) && !isToday(new Date(reminder.date));

                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => category && navigate(`/category/${category.id}`)}
                      className={`bg-card border border-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer group shadow-sm hover:shadow-md transition-shadow ${
                        isOverdue ? 'ring-2 ring-destructive/50' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <span className="text-xl">{category?.icon || '📌'}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{reminder.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                            {formatReminderDate(new Date(reminder.date))}
                          </span>
                          {reminder.time && (
                            <>
                              <span>•</span>
                              <span>{reminder.time}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Floating Action Button */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (categories.length > 0) {
              navigate(`/category/${categories[0].id}`);
            } else {
              setShowAddCategory(true);
            }
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center z-50 safe-area-bottom"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* Dialogs */}
      <AddCategoryDialog open={showAddCategory} onOpenChange={setShowAddCategory} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
