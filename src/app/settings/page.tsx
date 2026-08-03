"use client";
import { ChangeEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import {
  ConfirmDialog,
  FormField,
  PixelButton,
  PixelCard,
  ThemePreview,
} from "@/components/ui";
import { backupService, settingsRepository } from "@/lib/repository";
import { ReminderSelector } from "@/components/reminder-selector";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import {
  canRequestNotificationPermission,
  notificationStatus,
  type NotificationDiagnostics,
} from "@/lib/notifications";
import type { AppSettings, BackupFile } from "@/lib/types";
const themes: AppSettings["theme"][] = [
  "system",
  "retro-green",
  "retro-light",
  "retro-dark",
  "pastel-pink",
  "sky-blue",
  "lavender",
];
const themeNames: Record<AppSettings["theme"], string> = {
  system: "System",
  "retro-green": "Retro Green",
  "retro-light": "Retro Light",
  "retro-dark": "Retro Dark",
  "pastel-pink": "Pastel Pink Retro",
  "sky-blue": "Sky Blue Retro",
  lavender: "Lavender Retro",
};
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [message, setMessage] = useState("");
  const [clear, setClear] = useState(false);
  const [imported, setImported] = useState<BackupFile | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [diagnostics, setDiagnostics] =
    useState<NotificationDiagnostics | null>(null);
  useEffect(() => {
    setSettings(settingsRepository.get());
    const notification = "Notification" in window;
    const permission = notification ? Notification.permission : "unsupported";
    setDiagnostics({
      secure: window.isSecureContext,
      standalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
      notification,
      serviceWorker: "serviceWorker" in navigator,
      pushManager: "PushManager" in window,
      permission,
    });
  }, []);
  if (!settings) return null;
  const save = (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    settingsRepository.save(updates);
    if (updates.theme) {
      document.documentElement.dataset.theme =
        updates.theme === "system" ? "" : updates.theme;
      const colors: Partial<Record<AppSettings["theme"], string>> = {
        "retro-green": "#283828",
        "retro-light": "#dbe6dc",
        "retro-dark": "#171d25",
        "pastel-pink": "#f7e3e7",
        "sky-blue": "#dceff5",
        lavender: "#e9e2f4",
      };
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", colors[updates.theme] ?? "#283828");
    }
    setMessage("Settings saved.");
  };
  const download = () => {
    const file = backupService.make();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `countdown-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    save({ lastBackupAt: file.exportedAt });
  };
  const fileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || (file.type && !file.name.endsWith(".json"))) {
      setMessage("Please select a JSON backup file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Backup files must be smaller than 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value: unknown = JSON.parse(String(reader.result));
        if (!backupService.valid(value)) throw new Error();
        setImportMode("merge");
        setImported(value);
      } catch {
        setMessage(
          "This file is not a valid Count//Down backup (supported schema versions: 1–3).",
        );
      }
    };
    reader.readAsText(file);
  };
  const request = async () => {
    if (!("Notification" in window)) {
      save({ notificationPermission: "unsupported" });
      return;
    }
    if (Notification.permission !== "default") return;
    try {
      const permission = await Notification.requestPermission();
      save({ notificationPermission: permission });
      setDiagnostics((current) =>
        current ? { ...current, permission } : current,
      );
    } catch {
      setMessage("Browser permission could not be checked. Please try again.");
    }
  };
  return (
    <AppShell title="Settings">
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="settings-stack">
        <PixelCard>
          <h2>Reminder</h2>
          <ReminderSelector
            value={settings.defaultReminderDays}
            onChange={(defaultReminderDays) => save({ defaultReminderDays })}
            label="Default reminder days"
          />
        </PixelCard>
        <PixelCard>
          <h2>Notifications</h2>
          <p>
            Status:{" "}
            <b>{diagnostics ? notificationStatus(diagnostics) : "Checking…"}</b>
          </p>
          <p className="muted">
            This app currently checks browser permission only. Push delivery and
            a backend subscription are not configured.
          </p>
          <PixelButton
            onClick={request}
            disabled={
              !diagnostics ||
              !canRequestNotificationPermission(diagnostics.permission)
            }
          >
            {diagnostics?.permission === "denied"
              ? "Open instructions below"
              : "Enable browser permission"}
          </PixelButton>
          <details className="notification-help">
            <summary>Setup instructions</summary>
            <p>
              On iPhone, add the app to the Home Screen and open it from its
              icon. Notifications require a secure HTTPS origin. If denied, open
              iPhone Settings → Notifications and select this app if listed.
            </p>
          </details>
          {process.env.NODE_ENV === "development" && diagnostics && (
            <details className="notification-diagnostics">
              <summary>Diagnostic details</summary>
              <dl>
                <dt>Secure context</dt>
                <dd>{String(diagnostics.secure)}</dd>
                <dt>Standalone</dt>
                <dd>{String(diagnostics.standalone)}</dd>
                <dt>Notification API</dt>
                <dd>{String(diagnostics.notification)}</dd>
                <dt>Service worker</dt>
                <dd>{String(diagnostics.serviceWorker)}</dd>
                <dt>PushManager</dt>
                <dd>{String(diagnostics.pushManager)}</dd>
                <dt>Permission</dt>
                <dd>{diagnostics.permission}</dd>
              </dl>
            </details>
          )}
        </PixelCard>
        <PixelCard>
          <h2>Appearance</h2>
          <div className="theme-options">
            {themes.map((theme) => (
              <label
                key={theme}
                className={settings.theme === theme ? "chosen" : ""}
              >
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === theme}
                  onChange={() => save({ theme })}
                />
                <ThemePreview theme={theme} />
                <span>{themeNames[theme]}</span>
              </label>
            ))}
          </div>
          <FormField label="Desktop sidebar">
            <select
              value={settings.sidebarMode ?? "expanded"}
              onChange={(event) =>
                save({
                  sidebarMode: event.target.value as
                    "expanded" | "collapsed" | "hidden",
                })
              }
            >
              <option value="expanded">Expanded</option>
              <option value="collapsed">Collapsed</option>
              <option value="hidden">Focus mode (hidden)</option>
            </select>
          </FormField>
        </PixelCard>
        <PixelCard>
          <h2>Data management</h2>
          <dl className="storage-stats">
            <dt>Storage</dt>
            <dd>Browser localStorage (this device and origin)</dd>
            <dt>Countdowns</dt>
            <dd>{countdownRepository.list().length}</dd>
            <dt>Categories</dt>
            <dd>{categoryRepository.list().length}</dd>
            <dt>Last backup</dt>
            <dd>
              {settings.lastBackupAt
                ? new Date(settings.lastBackupAt).toLocaleString()
                : "No backup recorded"}
            </dd>
          </dl>
          <p className="storage-warning">
            ข้อมูลถูกเก็บไว้ภายในเบราว์เซอร์ของอุปกรณ์นี้ การลบข้อมูลเว็บไซต์
            ลบแอป PWA หรือเปลี่ยน URL อาจทำให้ข้อมูลไม่ปรากฏ
            กรุณาสำรองข้อมูลเป็นระยะ
          </p>
          <p className="muted">
            Data does not sync across devices or between localhost, a
            local-network IP, and a production domain.
          </p>
          <p>
            Export a safe JSON backup, or validate a backup before restoring it.
          </p>
          <div className="action-grid">
            <PixelButton onClick={download}>Export JSON</PixelButton>
            <label className="pixel-button upload">
              Import JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={fileChange}
              />
            </label>
          </div>
        </PixelCard>
        <PixelCard className="danger-zone">
          <h2>Danger zone</h2>
          <p>
            Clear all local countdowns, categories, and settings. This cannot be
            undone.
          </p>
          <PixelButton className="danger" onClick={() => setClear(true)}>
            Clear all data
          </PixelButton>
        </PixelCard>
      </div>
      <ConfirmDialog
        open={Boolean(imported)}
        title="Import backup?"
        confirmText={`Import (${importMode})`}
        onClose={() => setImported(null)}
        onConfirm={() => {
          if (imported) {
            backupService.restore(imported, importMode);
            setMessage(
              `${importMode === "merge" ? "Merged" : "Replaced with"} ${imported.countdowns.length} countdowns and ${imported.categories.length} categories.`,
            );
            setImported(null);
          }
        }}
      >
        Backup found: {imported?.countdowns.length} countdowns and{" "}
        {imported?.categories.length} categories.
        <label className="field">
          Import mode
          <select
            value={importMode}
            onChange={(e) =>
              setImportMode(e.target.value as "merge" | "replace")
            }
          >
            <option value="merge">Merge with current data</option>
            <option value="replace">Replace all current data</option>
          </select>
        </label>
      </ConfirmDialog>
      <ConfirmDialog
        open={clear}
        title="Clear all data?"
        danger
        requireText="CLEAR"
        confirmText="Clear all"
        onClose={() => setClear(false)}
        onConfirm={() => {
          backupService.clear();
          setClear(false);
          location.assign("/");
        }}
      >
        Type CLEAR to permanently remove all local data. Default categories will
        return when the app is next opened.
      </ConfirmDialog>
    </AppShell>
  );
}
