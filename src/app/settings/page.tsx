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
import type { AppSettings, BackupFile } from "@/lib/types";
const themes: AppSettings["theme"][] = [
  "system",
  "retro-green",
  "retro-light",
  "retro-dark",
];
export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [message, setMessage] = useState("");
  const [clear, setClear] = useState(false);
  const [imported, setImported] = useState<BackupFile | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  useEffect(() => setSettings(settingsRepository.get()), []);
  if (!settings) return null;
  const save = (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    settingsRepository.save(updates);
    if (updates.theme) {
      document.documentElement.dataset.theme =
        updates.theme === "system" ? "" : updates.theme;
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
  };
  const fileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || (file.type && !file.name.endsWith(".json"))) {
      setMessage("Please select a JSON backup file.");
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
          "This file is not a valid Count//Down backup (schema version 1 required).",
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
    const permission = await Notification.requestPermission();
    save({ notificationPermission: permission });
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
          <FormField label="Default reminder days">
            <input
              id="default-reminder-days"
              value={settings.defaultReminderDays.join(", ")}
              onChange={(e) => {
                const days = e.target.value
                  .split(",")
                  .map((x) => Number(x.trim()))
                  .filter((x) => Number.isFinite(x) && x >= 0);
                save({ defaultReminderDays: days });
              }}
            />
            <small>Use 0, 1, 3, 7, 14, or 30; commas are supported.</small>
          </FormField>
        </PixelCard>
        <PixelCard>
          <h2>Notifications</h2>
          <p>
            Permission: <b>{settings.notificationPermission}</b>
          </p>
          <p className="muted">
            Browsers and iOS may limit notification delivery. We only ask when
            you choose.
          </p>
          <PixelButton
            onClick={request}
            disabled={
              settings.notificationPermission === "denied" ||
              settings.notificationPermission === "granted"
            }
          >
            Request permission
          </PixelButton>
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
                <span>
                  {theme
                    .replace("retro-", "Retro ")
                    .replace("system", "System")}
                </span>
              </label>
            ))}
          </div>
        </PixelCard>
        <PixelCard>
          <h2>Data management</h2>
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
