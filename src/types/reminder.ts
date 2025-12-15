export type CategoryColor = 'work' | 'personal' | 'friends' | 'health' | 'finance' | 'default';

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
}

export interface ExportData {
  version: string;
  exportedAt: Date;
  categories: Category[];
  reminders: Reminder[];
}
