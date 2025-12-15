import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';

export function StatsCard() {
  const { getStats, reminders } = useReminders();
  const stats = getStats();

  // Calculate completion rate for the week
  const weeklyTotal = stats.completedThisWeek + stats.pendingThisWeek;
  const completionRate = weeklyTotal > 0 ? Math.round((stats.completedThisWeek / weeklyTotal) * 100) : 0;

  if (reminders.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-4 mb-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Le tue statistiche</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Completed Today */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-subtle rounded-xl p-3 text-center"
        >
          <div className="w-8 h-8 mx-auto rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-500">{stats.completedToday}</p>
          <p className="text-xs text-muted-foreground">Fatti oggi</p>
        </motion.div>

        {/* Pending Today */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-subtle rounded-xl p-3 text-center"
        >
          <div className="w-8 h-8 mx-auto rounded-lg bg-primary/20 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{stats.pendingToday}</p>
          <p className="text-xs text-muted-foreground">Da fare oggi</p>
        </motion.div>

        {/* This Week */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-subtle rounded-xl p-3 text-center"
        >
          <div className="w-8 h-8 mx-auto rounded-lg bg-accent/20 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-accent">{stats.completedThisWeek}</p>
          <p className="text-xs text-muted-foreground">Settimana</p>
        </motion.div>

        {/* Overdue */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`glass-subtle rounded-xl p-3 text-center ${stats.overdueCount > 0 ? 'border border-destructive/30' : ''}`}
        >
          <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-2 ${
            stats.overdueCount > 0 ? 'bg-destructive/20' : 'bg-muted'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${stats.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {stats.overdueCount}
          </p>
          <p className="text-xs text-muted-foreground">In ritardo</p>
        </motion.div>
      </div>

      {/* Progress bar */}
      {weeklyTotal > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 pt-4 border-t border-border/50"
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso settimanale</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 1, delay: 0.6 }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

