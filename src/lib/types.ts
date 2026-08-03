export type CountdownStatus =
  "upcoming" | "due-today" | "overdue" | "completed" | "archived";
export type RepeatType =
  "never" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export interface Countdown {
  id: string;
  title: string;
  description?: string;
  dueAt: string;
  allDay: boolean;
  categoryId?: string;
  reminderDays: number[];
  repeat: RepeatType;
  important: boolean;
  notes?: string;
  status: CountdownStatus;
  completedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AppSettings {
  defaultReminderDays: number[];
  theme: "system" | "retro-green" | "retro-light" | "retro-dark";
  notificationPermission: "default" | "granted" | "denied" | "unsupported";
}
export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  countdowns: Countdown[];
  categories: Category[];
  settings: AppSettings;
}
export type CountdownInput = Omit<
  Countdown,
  "id" | "createdAt" | "updatedAt" | "status" | "completedAt" | "archivedAt"
>;
