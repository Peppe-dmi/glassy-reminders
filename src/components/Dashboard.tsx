import { motion } from 'framer-motion';
import { Plus, Calendar, Bell, Settings } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { useTheme } from '@/contexts/ThemeContext';
import { CategoryCard } from './CategoryCard';
import { AddCategoryDialog } from './AddCategoryDialog';
import { SettingsDialog } from './SettingsDialog';
import { ThemeToggle } from './ThemeToggle';
import { TodayWidget } from './TodayWidget';
import { SearchBar } from './SearchBar';
import { StatsCard } from './StatsCard';
import { useState, useMemo } from 'react';

export function Dashboard() {
  const { categories, reminders, notificationPermission, requestNotificationPermission } = useReminders();
  const { theme } = useTheme();
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
  };

  const todayReminders = useMemo(() => {
    const today = new Date().toDateString();
    return reminders.filter(r => new Date(r.date).toDateString() === today && !r.isCompleted).length;
  }, [reminders]);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative transition-colors duration-300">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-pulse-slow ${
          theme === 'dark' ? 'bg-primary/15' : 'bg-primary/10'
        }`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-pulse-slow ${
          theme === 'dark' ? 'bg-accent/15' : 'bg-accent/10'
        }`} style={{ animationDelay: '2s' }} />
        <div className={`absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-[80px] animate-pulse-slow ${
          theme === 'dark' ? 'bg-category-personal/10' : 'bg-category-personal/8'
        }`} style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 glass-subtle sticky top-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 flex-shrink-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-xl font-bold gradient-text">Promemoria</h1>
                <p className="text-xs text-muted-foreground">
                  {todayReminders > 0 ? `${todayReminders} oggi` : 'Nessun impegno oggi'}
                </p>
              </div>
            </motion.div>

            {/* Search Bar - Center */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 max-w-md hidden md:block"
            >
              <SearchBar />
            </motion.div>

            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleEnableNotifications}
                  className="glass px-3 py-2 rounded-xl flex items-center gap-2 text-sm hover:bg-primary/10 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Notifiche</span>
                </motion.button>
              )}
              <ThemeToggle />
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowSettings(true)}
                className="glass p-2 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 md:hidden"
          >
            <SearchBar />
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6 pb-24">
        {/* Today Widget */}
        <TodayWidget />

        {/* Stats Card */}
        <StatsCard />

        {/* Categories Section Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-4"
        >
          <h2 className="font-display text-lg font-semibold">Le tue categorie</h2>
          <span className="text-sm text-muted-foreground">{categories.length} categorie</span>
        </motion.div>

        {/* Categories Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <CategoryCard category={category} />
            </motion.div>
          ))}

          {/* Add Category Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * categories.length }}
            onClick={() => setShowAddCategory(true)}
            className="glass-subtle min-h-[200px] rounded-2xl flex flex-col items-center justify-center gap-3 hover:bg-card/70 transition-all group border-dashed border-2 border-border/50 hover:border-primary/50"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
              Nuova categoria
            </span>
          </motion.button>
        </motion.div>
      </main>

      {/* Dialogs */}
      <AddCategoryDialog open={showAddCategory} onOpenChange={setShowAddCategory} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
