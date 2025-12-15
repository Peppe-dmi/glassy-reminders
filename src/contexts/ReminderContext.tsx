import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Category, Reminder, ExportData, CategoryColor } from '@/types/reminder';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';

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
  getRemindersByCategory: (categoryId: string) => Reminder[];
  getRemindersByDate: (date: Date) => Reminder[];
  exportData: () => ExportData;
  importData: (data: ExportData) => boolean;
  exportCategory: (categoryId: string) => string;
  importCategory: (jsonString: string) => boolean;
  requestNotificationPermission: () => Promise<boolean>;
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
    scheduleNotification, 
    cancelNotification, 
    permission 
  } = useNotifications();

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
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const isCompleted = !r.isCompleted;
          if (isCompleted) {
            cancelNotification(id);
          } else if (r.isAlarmEnabled) {
            const category = categories.find(c => c.id === r.categoryId);
            if (category) {
              scheduleNotification({ ...r, isCompleted }, category.name);
            }
          }
          return { ...r, isCompleted };
        }
        return r;
      })
    );
  }, [setReminders, categories, cancelNotification, scheduleNotification]);

  const getRemindersByCategory = useCallback((categoryId: string): Reminder[] => {
    return reminders.filter((r) => r.categoryId === categoryId);
  }, [reminders]);

  const getRemindersByDate = useCallback((date: Date): Reminder[] => {
    const dateStr = date.toDateString();
    return reminders.filter((r) => new Date(r.date).toDateString() === dateStr);
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
        getRemindersByCategory,
        getRemindersByDate,
        exportData,
        importData,
        exportCategory,
        importCategory,
        requestNotificationPermission,
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
