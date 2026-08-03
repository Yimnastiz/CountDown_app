export type CountdownStatus =
  "upcoming" | "due-today" | "overdue" | "completed" | "archived";
export type RepeatType =
  "never" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
export type RecurrenceFrequency = "day" | "week" | "month" | "year";
export interface RecurrenceEnd {
  type: "never" | "on-date" | "after-occurrences";
  date?: string;
  occurrences?: number;
}
export interface RecurrenceRule {
  enabled: boolean;
  interval: number;
  frequency: RecurrenceFrequency;
  end: RecurrenceEnd;
}
export interface Countdown {
  id: string;
  title: string;
  description?: string;
  dueAt: string;
  allDay: boolean;
  categoryId?: string;
  reminderDays: number[];
  /** Legacy field retained to read old localStorage and schema v1 backups. */
  repeat?: RepeatType;
  recurrence: RecurrenceRule;
  important: boolean;
  notes?: string;
  status: CountdownStatus;
  completedAt?: string;
  archivedAt?: string;
  seriesId?: string;
  sourceOccurrenceId?: string;
  nextOccurrenceId?: string;
  recurrenceStoppedAt?: string;
  isVirtualOccurrence?: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  kind?: "default" | "custom" | "other";
  createdAt: string;
  updatedAt: string;
}
export interface AppSettings {
  defaultReminderDays: number[];
  theme:
    | "system"
    | "retro-green"
    | "retro-light"
    | "retro-dark"
    | "pastel-pink"
    | "sky-blue"
    | "lavender";
  notificationPermission: "default" | "granted" | "denied" | "unsupported";
  lastBackupAt?: string;
  sidebarMode?: "expanded" | "collapsed" | "hidden";
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
