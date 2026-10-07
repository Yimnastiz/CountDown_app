"use client";

import { createSupabaseBrowserClient } from "./supabase/browser";
import {
  accountSettingsFromRow,
  categoryFromRow,
  categoryToRow,
  countdownFromRow,
  countdownToRow,
  sortCloudData,
  type CloudData,
} from "./cloud-data";
import type { AppSettings, Category, Countdown } from "./types";

const authenticated = async () => {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user)
    throw new Error("Sign in is required to sync cloud data.");
  return { supabase, userId: data.user.id };
};
const ensure = (error: { message: string } | null) => {
  if (error)
    throw new Error("Cloud data could not be saved. Please try again.");
};

export const cloudRepository = {
  async load(localSettings: AppSettings): Promise<CloudData> {
    const { supabase } = await authenticated();
    const [countdowns, categories, settings] = await Promise.all([
      supabase.from("countdowns").select("*").order("created_at"),
      supabase.from("categories").select("*").order("created_at"),
      supabase.from("user_settings").select("*").maybeSingle(),
    ]);
    ensure(countdowns.error);
    ensure(categories.error);
    ensure(settings.error);
    return sortCloudData({
      countdowns: (countdowns.data ?? []).map(countdownFromRow),
      categories: (categories.data ?? []).map(categoryFromRow),
      settings: accountSettingsFromRow(settings.data, localSettings),
    });
  },
  async saveCountdown(item: Countdown) {
    const { supabase, userId } = await authenticated();
    const { error } = await supabase
      .from("countdowns")
      .upsert(countdownToRow(item, userId), { onConflict: "user_id,id" });
    ensure(error);
  },
  async saveCountdowns(items: Countdown[]) {
    if (!items.length) return;
    const { supabase, userId } = await authenticated();
    const { error } = await supabase.from("countdowns").upsert(
      items.map((item) => countdownToRow(item, userId)),
      { onConflict: "user_id,id" },
    );
    ensure(error);
  },
  async removeCountdown(id: string) {
    const { supabase } = await authenticated();
    const { error } = await supabase.from("countdowns").delete().eq("id", id);
    ensure(error);
  },
  async saveCategory(item: Category) {
    const { supabase, userId } = await authenticated();
    const { error } = await supabase
      .from("categories")
      .upsert(categoryToRow(item, userId), { onConflict: "user_id,id" });
    ensure(error);
  },
  async saveCategories(items: Category[]) {
    if (!items.length) return;
    const { supabase, userId } = await authenticated();
    const { error } = await supabase.from("categories").upsert(
      items.map((item) => categoryToRow(item, userId)),
      { onConflict: "user_id,id" },
    );
    ensure(error);
  },
  async removeCategory(id: string) {
    const { supabase } = await authenticated();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    ensure(error);
  },
  async saveSettings(settings: AppSettings) {
    const { supabase, userId } = await authenticated();
    const { error } = await supabase.from("user_settings").upsert({
      user_id: userId,
      default_reminder_days: settings.defaultReminderDays,
      default_reminder_time: settings.defaultReminderTime,
      theme: settings.theme,
    });
    ensure(error);
  },
};
