import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Category, Reminder, ExportData, CategoryColor, RecurrenceType } from '@/types/reminder';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useNtfy } from '@/hooks/useNtfy';
import { addDays, addWeeks, addMonths, addYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isSameDay, startOfDay, endOfDay } from 'date-fns';

interface ReminderStats {
  totalReminders: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  pendingToday: number;
  pendingThisWeek: number;
  overdueCount: number;
}

interface ReminderContextType {
  categories: Category[];
  reminders: Reminder[];
  addCategory: (name: string, icon: string, color: CategoryColor) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt'>) => Reminder;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderComplete: (id: string) => void;
  snoozeReminder: (id: string, minutes: number) => void;
  getRemindersByCategory: (categoryId: string) => Reminder[];
  getRemindersByDate: (date: Date) => Reminder[];
  getTodayReminders: () => Reminder[];
  getTomorrowReminders: () => Reminder[];
  getOverdueReminders: () => Reminder[];
  getUpcomingReminders: (days: number) => Reminder[];
  searchReminders: (query: string) => Reminder[];
  getStats: () => ReminderStats;
  exportData: () => ExportData;
  importData: (data: ExportData) => boolean;
  exportCategory: (categoryId: string) => string;
  importCategory: (jsonString: string) => boolean;
  requestNotificationPermission: () => Promise<boolean>;
  testNotification: () => boolean;
  notificationPermission: NotificationPermission | 'denied';
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

const defaultCategories: Category[] = [
  { id: uuidv4(), name: 'Lavoro', icon: '💼', color: 'work', createdAt: new Date() },
  { id: uuidv4(), name: 'Personale', icon: '🏠', color: 'personal', createdAt: new Date() },
  { id: uuidv4(), name: 'Amici', icon: '👥', color: 'friends', createdAt: new Date() },
];

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useLocalStorage<Category[]>('reminder-categories', defaultCategories);
  const [reminders, setReminders] = useLocalStorage<Reminder[]>('reminder-items', []);
  const { 
    requestPermission, 
    scheduleNotification: scheduleLocalNotification, 
    cancelNotification, 
    permission,
    testNotification 
  } = useNotifications();
  const { sendNotification: sendNtfyNotification, isEnabled: ntfyEnabled } = useNtfy();
  
  // Combined notification function that uses both local and ntfy
  const scheduleNotification = useCallback((reminder: Reminder, categoryName: string) => {
    // Schedule local notification (browser)
    scheduleLocalNotification(reminder, categoryName);
    
    // Also schedule ntfy notification if enabled
    if (ntfyEnabled && reminder.isAlarmEnabled) {
      const reminderDate = new Date(reminder.date);
      let notificationTime = reminderDate.getTime();
      
      if (reminder.time) {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        reminderDate.setHours(hours, minutes, 0, 0);
        notificationTime = reminderDate.getTime() - (reminder.alarmMinutesBefore * 60 * 1000);
      }
      
      const now = Date.now();
      const delay = notificationTime - now;
      
      if (delay > 0) {
        // Schedule ntfy notification
        setTimeout(() => {
          const priority = reminder.priority === 'high' ? 5 : reminder.priority === 'medium' ? 4 : 3;
          sendNtfyNotification(
            `⏰ ${categoryName}: ${reminder.title}`,
            reminder.description || 'Hai un promemoria!',
            priority
          );
        }, delay);
      }
    }
  }, [scheduleLocalNotification, sendNtfyNotification, ntfyEnabled]);

  // Schedule notifications for all reminders on load
  useEffect(() => {
    reminders.forEach((reminder) => {
      const category = categories.find(c => c.id === reminder.categoryId);
      if (category && reminder.isAlarmEnabled && !reminder.isCompleted) {
        scheduleNotification(reminder, category.name);
      }
    });
  }, []);

  const addCategory = useCallback((name: string, icon: string, color: CategoryColor): Category => {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      icon,
      color,
      createdAt: new Date(),
    };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  }, [setCategories]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  }, [setCategories]);

  const deleteCategory = useCallback((id: string) => {
    // Cancel all notifications for reminders in this category
    reminders
      .filter((r) => r.categoryId === id)
      .forEach((r) => cancelNotification(r.id));
    
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    setReminders((prev) => prev.filter((r) => r.categoryId !== id));
  }, [setCategories, setReminders, reminders, cancelNotification]);

  const addReminder = useCallback((reminderData: Omit<Reminder, 'id' | 'createdAt'>): Reminder => {
    const newReminder: Reminder = {
      ...reminderData,
      id: uuidv4(),
      createdAt: new Date(),
    };
    setReminders((prev) => [...prev, newReminder]);
    
    // Schedule notification if enabled
    if (newReminder.isAlarmEnabled) {
      const category = categories.find(c => c.id === newReminder.categoryId);
      if (category) {
        scheduleNotification(newReminder, category.name);
      }
    }
    
    return newReminder;
  }, [setReminders, categories, scheduleNotification]);

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          // Reschedule notification
          cancelNotification(id);
          if (updated.isAlarmEnabled && !updated.isCompleted) {
            const category = categories.find(c => c.id === updated.categoryId);
            if (category) {
              scheduleNotification(updated, category.name);
            }
          }
          return updated;
        }
        return r;
      })
    );
  }, [setReminders, categories, cancelNotification, scheduleNotification]);

  const deleteReminder = useCallback((id: string) => {
    cancelNotification(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, [setReminders, cancelNotification]);

  const toggleReminderComplete = useCallback((id: string) => {
    setReminders((prev) => {
      const newReminders: Reminder[] = [];
      
      prev.forEach((r) => {
        if (r.id === id) {
          const isCompleted = !r.isCompleted;
          
          if (isCompleted) {
            cancelNotification(id);
            
            // If recurrent, create next occurrence
            if (r.recurrence !== 'none') {
              const currentDate = new Date(r.date);
              let nextDate: Date;
              
              switch (r.recurrence) {
                case 'daily':
                  nextDate = addDays(currentDate, 1);
                  break;
                case 'weekly':
                  nextDate = addWeeks(currentDate, 1);
                  break;
                case 'monthly':
                  nextDate = addMonths(currentDate, 1);
                  break;
                case 'yearly':
                  nextDate = addYears(currentDate, 1);
                  break;
                default:
                  nextDate = currentDate;
              }
              
              // Check if next date is before end date (if set)
              if (!r.recurrenceEndDate || isBefore(nextDate, new Date(r.recurrenceEndDate))) {
                const newReminder: Reminder = {
                  ...r,
                  id: uuidv4(),
                  date: nextDate,
                  isCompleted: false,
                  createdAt: new Date(),
                };
                newReminders.push(newReminder);
                
                // Schedule notification for new reminder
                if (newReminder.isAlarmEnabled) {
                  const category = categories.find(c => c.id === newReminder.categoryId);
                  if (category) {
                    scheduleNotification(newReminder, category.name);
                  }
                }
              }
            }
          } else if (r.isAlarmEnabled) {
            const category = categories.find(c => c.id === r.categoryId);
            if (category) {
              scheduleNotification({ ...r, isCompleted }, category.name);
            }
          }
          
          newReminders.push({ ...r, isCompleted });
        } else {
          newReminders.push(r);
        }
      });
      
      return newReminders;
    });
  }, [setReminders, categories, cancelNotification, scheduleNotification]);

  const snoozeReminder = useCallback((id: string, minutes: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
          cancelNotification(id);
          
          // Schedule new notification at snoozed time
          const category = categories.find(c => c.id === r.categoryId);
          if (category && r.isAlarmEnabled) {
            const timeout = setTimeout(() => {
              const notification = new Notification(`⏰ ${category.name}: ${r.title}`, {
                body: `Promemoria posticipato di ${minutes} minuti`,
                icon: '/favicon.ico',
                requireInteraction: true,
              });
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }, minutes * 60 * 1000);
          }
          
          return { ...r, snoozedUntil };
        }
        return r;
      })
    );
  }, [setReminders, categories, cancelNotification]);

  const getRemindersByCategory = useCallback((categoryId: string): Reminder[] => {
    return reminders.filter((r) => r.categoryId === categoryId);
  }, [reminders]);

  const getRemindersByDate = useCallback((date: Date): Reminder[] => {
    const dateStr = date.toDateString();
    return reminders.filter((r) => new Date(r.date).toDateString() === dateStr);
  }, [reminders]);

  const getTodayReminders = useCallback((): Reminder[] => {
    const today = new Date();
    return reminders
      .filter((r) => isSameDay(new Date(r.date), today) && !r.isCompleted)
      .sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [reminders]);

  const getTomorrowReminders = useCallback((): Reminder[] => {
    const tomorrow = addDays(new Date(), 1);
    return reminders
      .filter((r) => isSameDay(new Date(r.date), tomorrow) && !r.isCompleted)
      .sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
  }, [reminders]);

  const getOverdueReminders = useCallback((): Reminder[] => {
    const now = new Date();
    const todayStart = startOfDay(now);
    return reminders
      .filter((r) => {
        const reminderDate = new Date(r.date);
        return isBefore(reminderDate, todayStart) && !r.isCompleted;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reminders]);

  const getUpcomingReminders = useCallback((days: number): Reminder[] => {
    const now = new Date();
    const futureDate = addDays(now, days);
    return reminders
      .filter((r) => {
        const reminderDate = new Date(r.date);
        return isAfter(reminderDate, endOfDay(now)) && 
               isBefore(reminderDate, endOfDay(futureDate)) && 
               !r.isCompleted;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reminders]);

  const searchReminders = useCallback((query: string): Reminder[] => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    return reminders.filter((r) => {
      const titleMatch = r.title.toLowerCase().includes(lowerQuery);
      const descMatch = r.description?.toLowerCase().includes(lowerQuery);
      const tagMatch = r.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
      return titleMatch || descMatch || tagMatch;
    });
  }, [reminders]);

  const getStats = useCallback((): ReminderStats => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const completedToday = reminders.filter(r => {
      const date = new Date(r.date);
      return r.isCompleted && isSameDay(date, now);
    }).length;

    const completedThisWeek = reminders.filter(r => {
      const date = new Date(r.date);
      return r.isCompleted && isAfter(date, weekStart) && isBefore(date, weekEnd);
    }).length;

    const completedThisMonth = reminders.filter(r => {
      const date = new Date(r.date);
      return r.isCompleted && isAfter(date, monthStart) && isBefore(date, monthEnd);
    }).length;

    const pendingToday = reminders.filter(r => {
      const date = new Date(r.date);
      return !r.isCompleted && isSameDay(date, now);
    }).length;

    const pendingThisWeek = reminders.filter(r => {
      const date = new Date(r.date);
      return !r.isCompleted && isAfter(date, weekStart) && isBefore(date, weekEnd);
    }).length;

    const overdueCount = reminders.filter(r => {
      const date = new Date(r.date);
      return !r.isCompleted && isBefore(date, today);
    }).length;

    return {
      totalReminders: reminders.length,
      completedToday,
      completedThisWeek,
      completedThisMonth,
      pendingToday,
      pendingThisWeek,
      overdueCount,
    };
  }, [reminders]);

  const exportData = useCallback((): ExportData => {
    return {
      version: '1.0',
      exportedAt: new Date(),
      categories,
      reminders,
    };
  }, [categories, reminders]);

  const importData = useCallback((data: ExportData): boolean => {
    try {
      if (data.version && data.categories && data.reminders) {
        setCategories(data.categories);
        setReminders(data.reminders);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setCategories, setReminders]);

  const exportCategory = useCallback((categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    const categoryReminders = reminders.filter(r => r.categoryId === categoryId);
    
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date(),
      category,
      reminders: categoryReminders,
    }, null, 2);
  }, [categories, reminders]);

  const importCategory = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.category && data.reminders) {
        // Create new IDs to avoid conflicts
        const newCategoryId = uuidv4();
        const newCategory = { ...data.category, id: newCategoryId, createdAt: new Date() };
        const newReminders = data.reminders.map((r: Reminder) => ({
          ...r,
          id: uuidv4(),
          categoryId: newCategoryId,
          createdAt: new Date(),
        }));
        
        setCategories(prev => [...prev, newCategory]);
        setReminders(prev => [...prev, ...newReminders]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [setCategories, setReminders]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    return requestPermission();
  }, [requestPermission]);

  return (
    <ReminderContext.Provider
      value={{
        categories,
        reminders,
        addCategory,
        updateCategory,
        deleteCategory,
        addReminder,
        updateReminder,
        deleteReminder,
        toggleReminderComplete,
        snoozeReminder,
        getRemindersByCategory,
        getRemindersByDate,
        getTodayReminders,
        getTomorrowReminders,
        getOverdueReminders,
        getUpcomingReminders,
        searchReminders,
        getStats,
        exportData,
        importData,
        exportCategory,
        importCategory,
        requestNotificationPermission,
        testNotification,
        notificationPermission: permission,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
}
