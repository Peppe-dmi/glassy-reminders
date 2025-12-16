import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bell, Settings, ChevronRight, Clock, Sparkles, TrendingUp, Zap } from 'lucide-react';
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

// Colori per icone e numeri nelle stat cards (su base neutra)
const statAccentColors = {
  today: 'text-amber-500',
  completed: 'text-emerald-500',
  overdue: 'text-rose-500',
};

// Colori bordo per category cards
const categoryBorderColors: Record<string, string> = {
  work: 'border-amber-500/40',
  personal: 'border-sky-500/40',
  friends: 'border-pink-500/40',
  health: 'border-emerald-500/40',
  finance: 'border-violet-500/40',
  default: 'border-primary/40',
};

// Colori icona per category cards
const categoryIconBg: Record<string, string> = {
  work: 'bg-amber-500/15',
  personal: 'bg-sky-500/15',
  friends: 'bg-pink-500/15',
  health: 'bg-emerald-500/15',
  finance: 'bg-violet-500/15',
  default: 'bg-primary/15',
};

// Colori badge counter
const categoryBadgeColors: Record<string, string> = {
  work: 'bg-amber-500 text-white',
  personal: 'bg-sky-500 text-white',
  friends: 'bg-pink-500 text-white',
  health: 'bg-emerald-500 text-white',
  finance: 'bg-violet-500 text-white',
  default: 'bg-primary text-white',
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
      {/* Ambient Background - subtle */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-64 h-64 rounded-full bg-gradient-to-br from-category-friends/10 to-primary/5 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
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
                  className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg"
                >
                  <Bell className="w-5 h-5 text-white" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-xl glass card-elegant flex items-center justify-center"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Stat Cards - Base neutra con accenti colorati */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {/* Oggi */}
            <motion.div 
              whileTap={{ scale: 0.97 }}
              className="stat-card bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-amber-500/15 flex items-center justify-center`}>
                <Clock className={`w-5 h-5 ${statAccentColors.today}`} />
              </div>
              <p className={`text-2xl font-bold ${statAccentColors.today}`}>{stats.pendingToday}</p>
              <p className="text-xs text-muted-foreground font-medium">Oggi</p>
            </motion.div>

            {/* Completati */}
            <motion.div 
              whileTap={{ scale: 0.97 }}
              className="stat-card bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-emerald-500/15 flex items-center justify-center`}>
                <TrendingUp className={`w-5 h-5 ${statAccentColors.completed}`} />
              </div>
              <p className={`text-2xl font-bold ${statAccentColors.completed}`}>{stats.completedThisWeek}</p>
              <p className="text-xs text-muted-foreground font-medium">Completati</p>
            </motion.div>

            {/* Scaduti */}
            <motion.div 
              whileTap={{ scale: 0.97 }}
              className="stat-card bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-rose-500/15 flex items-center justify-center`}>
                <Zap className={`w-5 h-5 ${statAccentColors.overdue}`} />
              </div>
              <p className={`text-2xl font-bold ${statAccentColors.overdue}`}>{stats.overdueCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Scaduti</p>
            </motion.div>
          </motion.div>
        </header>

        {/* Categories - Eleganti con bordo colorato */}
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

          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide -mx-5 px-5 items-end">
            {categories.map((category, i) => {
              const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
              const borderColor = categoryBorderColors[category.color] || categoryBorderColors.default;
              const iconBg = categoryIconBg[category.color] || categoryIconBg.default;
              const badgeColor = categoryBadgeColors[category.color] || categoryBadgeColors.default;
              
              // Rotazione alternata: -4°, +3°, -4°, +3°...
              const rotation = i % 2 === 0 ? -4 : 3;
              // Offset verticale alternato per effetto dinamico
              const yOffset = i % 2 === 0 ? 0 : 8;
              
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, y: 20, rotate: 0 }}
                  animate={{ opacity: 1, y: yOffset, rotate: rotation }}
                  transition={{ 
                    delay: 0.1 + i * 0.06,
                    type: 'spring',
                    stiffness: 200,
                    damping: 15
                  }}
                  whileTap={{ scale: 0.92, rotate: 0 }}
                  onClick={() => navigate(`/category/${category.id}`)}
                  className="flex-shrink-0"
                >
                  <div 
                    className={`category-card w-20 h-20 rounded-2xl bg-card border-2 ${borderColor} flex flex-col items-center justify-center relative`}
                  >
                    {/* Icon background */}
                    <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-1`}>
                      <span className="text-2xl">{category.icon}</span>
                    </div>
                    
                    {/* Counter badge */}
                    {count > 0 && (
                      <span 
                        className={`absolute -top-2 -right-2 w-5 h-5 rounded-full ${badgeColor} text-xs font-bold flex items-center justify-center shadow-md`}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-2 text-center font-medium truncate w-20">{category.name}</p>
                </motion.button>
              );
            })}

            {/* Add Category Button - leggermente ruotato */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: categories.length % 2 === 0 ? 0 : 8, rotate: categories.length % 2 === 0 ? -4 : 3 }}
              transition={{ delay: 0.1 + categories.length * 0.06 }}
              whileTap={{ scale: 0.92, rotate: 0 }}
              onClick={() => setShowAddCategory(true)}
              className="flex-shrink-0"
            >
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center bg-card/50">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-xs mt-2 text-center text-muted-foreground">Aggiungi</p>
            </motion.button>
          </div>
        </motion.section>

        {/* Tab Switcher */}
        <div className="px-5 mb-4">
          <div className="card-elegant bg-card border border-border rounded-2xl p-1.5 flex">
            {(['today', 'upcoming', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground'
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="card-elegant bg-card border border-border rounded-2xl p-8 text-center"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary" />
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
                  const iconBg = category 
                    ? categoryIconBg[category.color] || categoryIconBg.default
                    : categoryIconBg.default;
                  const isOverdue = isPast(new Date(reminder.date)) && !isToday(new Date(reminder.date));

                  return (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => category && navigate(`/category/${category.id}`)}
                      className={`reminder-card bg-card border border-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer ${
                        isOverdue ? 'ring-2 ring-destructive/50' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
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

                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary flex items-center justify-center z-50 safe-area-bottom shadow-lg"
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
