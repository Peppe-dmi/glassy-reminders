export type CategoryColor = 'work' | 'personal' | 'friends' | 'health' | 'finance' | 'default';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: CategoryColor;
  createdAt: Date;
}

export interface Reminder {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  isAlarmEnabled: boolean;
  alarmMinutesBefore: number;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  // Recurrence
  recurrence: RecurrenceType;
  recurrenceEndDate?: Date;
  // Snooze
  snoozedUntil?: Date;
  // Tags
  tags?: string[];
}

export interface ExportData {
  version: string;
  exportedAt: Date;
  categories: Category[];
  reminders: Reminder[];
}
