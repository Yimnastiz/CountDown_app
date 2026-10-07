"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  categoryRepository,
  countdownRepository,
  hasLegacyLocalData,
  settingsRepository,
  backupService,
} from "@/lib/repository";
import { cloudRepository } from "@/lib/cloud-repository";
import { buildMigrationPlan } from "@/lib/cloud-migration";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createId } from "@/lib/id";
import { dueDateKey, getLocalDateKey, incompleteStatusFor } from "@/lib/date";
import { normalizeCategory } from "@/lib/categories";
import { normalizeLegacyRepeatRule } from "@/lib/recurrence";
import { defaultCategories } from "@/lib/data";
import type {
  AppSettings,
  BackupFile,
  Category,
  Countdown,
  CountdownInput,
  RecurrenceExceptionStatus,
} from "@/lib/types";

type Source = "local" | "cloud";
type AppData = {
  countdowns: Countdown[];
  categories: Category[];
  settings: AppSettings;
};
type AppDataContext = AppData & {
  source: Source;
  user: User | null;
  loading: boolean;
  error: string;
  migrationAvailable: boolean;
  refresh: () => Promise<void>;
  migrateLocalData: () => Promise<{ imported: number; conflicts: number }>;
  saveCountdown: (input: CountdownInput, id?: string) => Promise<Countdown>;
  removeCountdown: (id: string) => Promise<void>;
  complete: (id: string, date?: string) => Promise<void>;
  undoCompletion: (id: string, date?: string) => Promise<void>;
  stopRepeating: (id: string, date?: string) => Promise<void>;
  clearCompletedHistory: () => Promise<void>;
  saveCategory: (item: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  saveSettings: (updates: Partial<AppSettings>) => Promise<void>;
  importBackup: (
    backup: BackupFile,
    mode: "merge" | "replace",
  ) => Promise<void>;
  clearAll: () => Promise<void>;
};
const Context = createContext<AppDataContext | null>(null);
const marker = (userId: string) => `countdown-app.cloud-migrated.${userId}`;
const localData = (): AppData => ({
  countdowns: countdownRepository.list(),
  categories: categoryRepository.list(),
  settings: settingsRepository.get(),
});
const exception = (
  series: Countdown,
  occurrenceDate: string,
  status: RecurrenceExceptionStatus,
  completedAt?: string,
) =>
  [
    ...(series.recurrenceExceptions ?? []).filter(
      (item) => item.occurrenceDate !== occurrenceDate,
    ),
    {
      occurrenceKey: `${series.id}:${occurrenceDate}`,
      occurrenceDate,
      status,
      completedAt,
      updatedAt: new Date().toISOString(),
    },
  ].sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => localData());
  const [user, setUser] = useState<User | null>(null);
  const [source, setSource] = useState<Source>("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [migrationAvailable, setMigrationAvailable] = useState(false);
  const refresh = useCallback(async () => {
    setError("");
    countdownRepository.seed();
    const local = localData();
    if (!hasSupabaseConfig()) {
      setData(local);
      setSource("local");
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    setUser(auth.user);
    if (!auth.user) {
      setData(local);
      setSource("local");
      setMigrationAvailable(false);
      setLoading(false);
      return;
    }
    try {
      let cloud = await cloudRepository.load(local.settings);
      const migrated = localStorage.getItem(marker(auth.user.id)) === "true";
      if (
        cloud.countdowns.length === 0 &&
        cloud.categories.length === 0 &&
        !hasLegacyLocalData()
      ) {
        await cloudRepository.saveCategories(defaultCategories);
        cloud = await cloudRepository.load(local.settings);
      }
      const hasCloud =
        cloud.countdowns.length > 0 ||
        cloud.categories.length > 0 ||
        migrated ||
        !hasLegacyLocalData();
      setData(hasCloud ? cloud : local);
      setSource(hasCloud ? "cloud" : "local");
      setMigrationAvailable(hasLegacyLocalData() && !migrated);
    } catch (cause) {
      setData(local);
      setSource("local");
      setError(
        cause instanceof Error
          ? cause.message
          : "Cloud data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    if (!hasSupabaseConfig()) return;
    const supabase = createSupabaseBrowserClient();
    const { data: listener } = supabase.auth.onAuthStateChange(
      () => void refresh(),
    );
    let foregroundRefreshPending = false;
    const refreshOnForeground = () => {
      if (document.visibilityState === "hidden" || foregroundRefreshPending)
        return;
      foregroundRefreshPending = true;
      queueMicrotask(() => {
        foregroundRefreshPending = false;
        void refresh();
      });
    };
    window.addEventListener("focus", refreshOnForeground);
    document.addEventListener("visibilitychange", refreshOnForeground);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", refreshOnForeground);
      document.removeEventListener("visibilitychange", refreshOnForeground);
    };
  }, [refresh]);
  useEffect(() => {
    if (!hasSupabaseConfig() || source !== "cloud" || !user?.id) return;
    const supabase = createSupabaseBrowserClient();
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void refresh();
      }, 200);
    };
    const userFilter = `user_id=eq.${user.id}`;
    const channel = supabase
      .channel(`countdown-data:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "countdowns",
          filter: userFilter,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: userFilter,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_settings",
          filter: userFilter,
        },
        scheduleRefresh,
      )
      .subscribe();
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refresh, source, user?.id]);
  useEffect(() => {
    if (source !== "cloud") return;
    document.documentElement.dataset.theme =
      data.settings.theme === "system" ? "" : data.settings.theme;
  }, [data.settings.theme, source]);
  const cloud = source === "cloud";
  const saveCountdown = async (input: CountdownInput, id?: string) => {
    if (!cloud) {
      const saved = countdownRepository.save(input, id);
      await refresh();
      return saved;
    }
    const old = id ? data.countdowns.find((item) => item.id === id) : undefined;
    const item: Countdown = {
      ...input,
      id: old?.id ?? createId(),
      dueDate: input.allDay ? (input.dueDate ?? dueDateKey(input)) : undefined,
      recurrence: normalizeLegacyRepeatRule(input.repeat, input.recurrence),
      recurrenceExceptions:
        old?.recurrenceExceptions ?? input.recurrenceExceptions ?? [],
      status: old?.status ?? "upcoming",
      createdAt: old?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await cloudRepository.saveCountdown(item);
    await refresh();
    return item;
  };
  const updateCloud = async (
    id: string,
    mutate: (item: Countdown) => Countdown,
  ) => {
    const current = data.countdowns.find((item) => item.id === id);
    if (!current) return;
    if (!cloud)
      throw new Error("Local mutation must use its existing repository.");
    await cloudRepository.saveCountdown(mutate(current));
    await refresh();
  };
  const removeCountdown = async (id: string) => {
    if (!cloud) {
      countdownRepository.remove(id);
      await refresh();
      return;
    }
    await cloudRepository.removeCountdown(id);
    await refresh();
  };
  const complete = async (id: string, date?: string) => {
    if (!cloud) {
      countdownRepository.complete(id, date);
      await refresh();
      return;
    }
    await updateCloud(id, (item) =>
      item.recurrence.enabled
        ? {
            ...item,
            recurrenceExceptions: exception(
              item,
              date ?? dueDateKey(item),
              "completed",
              new Date().toISOString(),
            ),
            updatedAt: new Date().toISOString(),
          }
        : {
            ...item,
            status: "completed",
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
    );
  };
  const undoCompletion = async (id: string, date?: string) => {
    if (!cloud) {
      countdownRepository.undoCompletion(id, date);
      await refresh();
      return;
    }
    await updateCloud(id, (item) =>
      item.recurrence.enabled
        ? {
            ...item,
            recurrenceExceptions: (item.recurrenceExceptions ?? []).filter(
              (x) =>
                !(
                  x.occurrenceDate === (date ?? dueDateKey(item)) &&
                  x.status === "completed"
                ),
            ),
            updatedAt: new Date().toISOString(),
          }
        : {
            ...item,
            status: incompleteStatusFor(item),
            completedAt: undefined,
            updatedAt: new Date().toISOString(),
          },
    );
  };
  const stopRepeating = async (id: string, date?: string) => {
    if (!cloud) {
      countdownRepository.stopRepeating(id, date);
      await refresh();
      return;
    }
    await updateCloud(id, (item) => ({
      ...item,
      recurrenceStoppedAt: date ?? getLocalDateKey(new Date()),
      updatedAt: new Date().toISOString(),
    }));
  };
  const clearCompletedHistory = async () => {
    if (!cloud) {
      countdownRepository.clearCompletedHistory();
      await refresh();
      return;
    }
    const remove = data.countdowns.filter(
      (item) =>
        !item.recurrence.enabled &&
        (item.status === "completed" || item.status === "archived"),
    );
    const updates = data.countdowns
      .filter((item) => item.recurrence.enabled)
      .map((item) => ({
        ...item,
        recurrenceExceptions: (item.recurrenceExceptions ?? []).filter(
          (x) => x.status !== "completed",
        ),
        updatedAt: new Date().toISOString(),
      }));
    await Promise.all(
      remove.map((item) => cloudRepository.removeCountdown(item.id)),
    );
    await cloudRepository.saveCountdowns(updates);
    await refresh();
  };
  const saveCategory = async (item: Category) => {
    if (!cloud) {
      categoryRepository.save(item);
      await refresh();
      return;
    }
    await cloudRepository.saveCategory(normalizeCategory(item));
    await refresh();
  };
  const removeCategory = async (id: string) => {
    if (!cloud) {
      categoryRepository.remove(id);
      await refresh();
      return;
    }
    await cloudRepository.removeCategory(id);
    await refresh();
  };
  const saveSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...data.settings, ...updates };
    if (!cloud) {
      settingsRepository.save(updates);
      setData((current) => ({ ...current, settings: next }));
      return;
    }
    await cloudRepository.saveSettings(next);
    settingsRepository.save(updates);
    await refresh();
  };
  const migrateLocalData = async () => {
    if (!user) throw new Error("Sign in before importing local data.");
    const local = localData();
    const cloudData = await cloudRepository.load(local.settings);
    const plan = buildMigrationPlan(cloudData, local);
    await cloudRepository.saveCategories(plan.categories);
    await cloudRepository.saveCountdowns(plan.countdowns);
    if (plan.importSettings) await cloudRepository.saveSettings(local.settings);
    localStorage.setItem(marker(user.id), "true");
    await refresh();
    return {
      imported: plan.categories.length + plan.countdowns.length,
      conflicts: plan.conflicts,
    };
  };
  const importBackup = async (
    backup: BackupFile,
    mode: "merge" | "replace",
  ) => {
    if (!cloud) {
      backupService.restore(backup, mode);
      await refresh();
      return;
    }
    if (mode === "replace")
      throw new Error(
        "Replacing cloud data is disabled to protect data from other devices.",
      );
    const incoming: AppData = {
      countdowns: backup.countdowns,
      categories: backup.categories,
      settings: { ...data.settings, ...backup.settings },
    };
    const plan = buildMigrationPlan(data, incoming);
    await cloudRepository.saveCategories(plan.categories);
    await cloudRepository.saveCountdowns(plan.countdowns);
    if (plan.importSettings)
      await cloudRepository.saveSettings(incoming.settings);
    await refresh();
  };
  const clearAll = async () => {
    if (cloud) {
      const supabase = createSupabaseBrowserClient();
      const [
        { error: countdownError },
        { error: categoryError },
        { error: settingsError },
      ] = await Promise.all([
        supabase.from("countdowns").delete().neq("id", ""),
        supabase.from("categories").delete().neq("id", ""),
        supabase.from("user_settings").delete().neq("user_id", ""),
      ]);
      if (countdownError || categoryError || settingsError)
        throw new Error("Cloud data could not be cleared.");
      if (user) localStorage.removeItem(marker(user.id));
    }
    backupService.clear();
    await refresh();
  };
  const value: AppDataContext = {
    ...data,
    source,
    user,
    loading,
    error,
    migrationAvailable,
    refresh,
    migrateLocalData,
    saveCountdown,
    removeCountdown,
    complete,
    undoCompletion,
    stopRepeating,
    clearCompletedHistory,
    saveCategory,
    removeCategory,
    saveSettings,
    importBackup,
    clearAll,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAppData = () => {
  const value = useContext(Context);
  if (!value) throw new Error("AppDataProvider is missing.");
  return value;
};
