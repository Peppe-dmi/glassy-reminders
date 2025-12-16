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
  work: 'from-amber-500 via-orange-500 to-orange-600',
  personal: 'from-sky-400 via-blue-500 to-blue-600',
  friends: 'from-pink-500 via-rose-500 to-rose-600',
  health: 'from-emerald-400 via-green-500 to-green-600',
  finance: 'from-violet-500 via-purple-500 to-purple-600',
  default: 'from-primary via-purple-500 to-accent',
};

const categoryGlowMap: Record<string, string> = {
  work: 'shadow-amber-500/40',
  personal: 'shadow-sky-500/40',
  friends: 'shadow-pink-500/40',
  health: 'shadow-emerald-500/40',
  finance: 'shadow-violet-500/40',
  default: 'shadow-primary/40',
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
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                  <Bell className="w-5 h-5 text-white" />
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center card-3d"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Quick Stats - 3D Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            <motion.div 
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="stat-card-3d bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white drop-shadow-sm">{stats.pendingToday}</p>
              <p className="text-xs text-white/80 font-medium">Oggi</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="stat-card-3d bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white drop-shadow-sm">{stats.completedThisWeek}</p>
              <p className="text-xs text-white/80 font-medium">Completati</p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="stat-card-3d bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl p-4 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white drop-shadow-sm">{stats.overdueCount}</p>
              <p className="text-xs text-white/80 font-medium">Scaduti</p>
            </motion.div>
          </motion.div>
        </header>

        {/* Categories Scroll - Premium 3D */}
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

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5" style={{ perspective: '1000px' }}>
            {categories.map((category, i) => {
              const count = reminders.filter(r => r.categoryId === category.id && !r.isCompleted).length;
              const gradient = categoryColorMap[category.color] || categoryColorMap.default;
              const glow = categoryGlowMap[category.color] || categoryGlowMap.default;
              
              return (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ 
                    delay: 0.15 + i * 0.08,
                    type: 'spring',
                    stiffness: 200,
                    damping: 20
                  }}
                  whileHover={{ 
                    scale: 1.08, 
                    y: -8,
                    rotateY: 5,
                    rotateX: 5,
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/category/${category.id}`)}
                  className="flex-shrink-0 group"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div 
                    className={`category-premium w-24 h-24 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center shadow-xl ${glow}`}
                  >
                    {/* Glass overlay */}
                    <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none" />
                    
                    {/* Icon with 3D effect */}
                    <motion.span 
                      className="text-3xl mb-1 drop-shadow-lg relative z-10"
                      style={{ textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}
                    >
                      {category.icon}
                    </motion.span>
                    
                    {/* Badge */}
                    {count > 0 && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center text-gray-800 shadow-lg border-2 border-white/50 z-20"
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                      >
                        {count}
                      </motion.span>
                    )}

                    {/* Reflection */}
                    <div className="category-premium-reflection" />
                  </div>
                  <p className="text-xs mt-2.5 text-center font-semibold truncate w-24">{category.name}</p>
                </motion.button>
              );
            })}

            {/* Add Category Button - 3D */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + categories.length * 0.08 }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddCategory(true)}
              className="flex-shrink-0"
            >
              <div className="w-24 h-24 rounded-[1.25rem] border-2 border-dashed border-border flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm shadow-lg transition-all hover:border-primary/50 hover:bg-card/80">
                <Plus className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-xs mt-2.5 text-center text-muted-foreground font-medium">Aggiungi</p>
            </motion.button>
          </div>
        </motion.section>

        {/* Tab Switcher - 3D */}
        <div className="px-5 mb-4">
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-1.5 flex shadow-lg card-3d">
            {(['today', 'upcoming', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab === 'today' ? 'Oggi' : tab === 'upcoming' ? 'Prossimi' : 'Tutti'}
              </button>
            ))}
          </div>
        </div>

        {/* Reminders List - 3D Cards */}
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
                  className="card-3d bg-card border border-border rounded-2xl p-8 text-center"
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
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => category && navigate(`/category/${category.id}`)}
                      className={`reminder-card-3d bg-card border border-border rounded-2xl p-4 flex items-center gap-4 cursor-pointer group ${
                        isOverdue ? 'ring-2 ring-destructive/50' : ''
                      }`}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                      >
                        <span className="text-xl drop-shadow-sm">{category?.icon || '📌'}</span>
                      </motion.div>
                      
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

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Floating Action Button - Premium 3D */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (categories.length > 0) {
              navigate(`/category/${categories[0].id}`);
            } else {
              setShowAddCategory(true);
            }
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center z-50 safe-area-bottom"
          style={{
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4), 0 8px 32px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
          }}
        >
          <Plus className="w-6 h-6 text-white drop-shadow-sm" />
        </motion.button>
      </div>

      {/* Dialogs */}
      <AddCategoryDialog open={showAddCategory} onOpenChange={setShowAddCategory} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
