import { addDays, addMonths } from "date-fns";
import type { AppSettings, Category, Countdown } from "./types";
const now = new Date().toISOString();
export const defaultCategories: Category[] = [
  ["personal", "Personal", "Heart", "#d65d8e"],
  ["finance", "Finance", "WalletCards", "#b67b2c"],
  ["education", "Education", "GraduationCap", "#635bba"],
  ["vehicle", "Vehicle", "Car", "#2e7d74"],
  ["health", "Health", "HeartPulse", "#c74646"],
  ["documents", "Documents", "FileText", "#59748c"],
  ["birthday", "Birthday", "Cake", "#b65bb4"],
  ["other", "Other", "Sparkles", "#63704d"],
].map(([id, name, icon, color]) => ({
  id,
  name,
  icon,
  color,
  isDefault: true,
  kind: id === "other" ? "other" : "default",
  createdAt: now,
  updatedAt: now,
}));
export const defaultSettings: AppSettings = {
  defaultReminderDays: [7, 1],
  theme: "system",
  notificationPermission: "default",
  sidebarMode: "expanded",
};
export const demoCountdowns = (): Countdown[] => {
  const createdAt = new Date().toISOString();
  return [
    {
      id: "demo-vehicle",
      title: "ต่อภาษีรถ",
      description: "เตรียม พ.ร.บ. และเอกสารรถ",
      dueAt: addDays(new Date(), 3).toISOString(),
      allDay: true,
      categoryId: "vehicle",
      reminderDays: [14, 7, 1],
      repeat: "yearly",
      recurrence: {
        enabled: true,
        interval: 1,
        frequency: "year",
        end: { type: "never" },
      },
      important: true,
      notes: "ชำระออนไลน์ได้",
      status: "upcoming",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "demo-bill",
      title: "ชำระบิลอินเทอร์เน็ต",
      dueAt: addDays(new Date(), 7).toISOString(),
      allDay: true,
      categoryId: "finance",
      reminderDays: [3, 1],
      repeat: "monthly",
      recurrence: {
        enabled: true,
        interval: 1,
        frequency: "month",
        end: { type: "never" },
      },
      important: false,
      status: "upcoming",
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "demo-exam",
      title: "วันสอบภาษาอังกฤษ",
      dueAt: addMonths(new Date(), 1).toISOString(),
      allDay: false,
      categoryId: "education",
      reminderDays: [7],
      repeat: "never",
      recurrence: {
        enabled: false,
        interval: 1,
        frequency: "day",
        end: { type: "never" },
      },
      important: true,
      status: "upcoming",
      createdAt,
      updatedAt: createdAt,
    },
  ];
};
