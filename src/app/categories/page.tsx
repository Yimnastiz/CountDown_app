"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import {
  ConfirmDialog,
  EmptyState,
  PixelButton,
  PixelCard,
} from "@/components/ui";
import { categoryRepository, countdownRepository } from "@/lib/repository";
import type { Category } from "@/lib/types";
const blank = (): Category => ({
  id: "",
  name: "",
  icon: "Tag",
  color: "#63704d",
  isDefault: false,
  createdAt: "",
  updatedAt: "",
});
export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [remove, setRemove] = useState<Category | null>(null);
  const load = () => setCategories(categoryRepository.list());
  useEffect(load, []);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    const now = new Date().toISOString();
    categoryRepository.save({
      ...editing,
      id: editing.id || crypto.randomUUID(),
      name: editing.name.trim(),
      createdAt: editing.createdAt || now,
      updatedAt: now,
    });
    setEditing(null);
    load();
  };
  const usage = (id: string) =>
    countdownRepository.list().filter((x) => x.categoryId === id).length;
  return (
    <AppShell
      title="Categories"
      actions={
        <PixelButton onClick={() => setEditing(blank())}>Add</PixelButton>
      }
    >
      {categories.length ? (
        <div className="category-list">
          {categories.map((c) => (
            <PixelCard key={c.id} className="category-row">
              <span className="category-icon" style={{ background: c.color }}>
                {c.icon.slice(0, 1)}
              </span>
              <div>
                <b>{c.name}</b>
                <span>
                  {usage(c.id)} countdown{usage(c.id) === 1 ? "" : "s"}
                </span>
              </div>
              <PixelButton onClick={() => setEditing(c)}>Edit</PixelButton>
              <button className="text-danger" onClick={() => setRemove(c)}>
                Delete
              </button>
            </PixelCard>
          ))}
        </div>
      ) : (
        <EmptyState title="No categories">
          Create a category to organise your countdowns.
        </EmptyState>
      )}
      {editing && (
        <div className="dialog-backdrop">
          <form
            className="dialog"
            onSubmit={save}
            role="dialog"
            aria-modal="true"
          >
            <h2>{editing.id ? "Edit category" : "Add category"}</h2>
            <label className="field">
              Name
              <input
                autoFocus
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                required
              />
            </label>
            <label className="field">
              Icon word
              <input
                value={editing.icon}
                onChange={(e) =>
                  setEditing({ ...editing, icon: e.target.value })
                }
                placeholder="e.g. Tag"
              />
            </label>
            <label className="field">
              Colour
              <input
                type="color"
                value={editing.color}
                onChange={(e) =>
                  setEditing({ ...editing, color: e.target.value })
                }
              />
            </label>
            <div className="dialog-actions">
              <PixelButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </PixelButton>
              <PixelButton type="submit">Save</PixelButton>
            </div>
          </form>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        title="Delete category?"
        danger
        confirmText="Delete category"
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (remove) {
            categoryRepository.remove(remove.id);
            load();
            setRemove(null);
          }
        }}
      >
        {remove && usage(remove.id) > 0 ? (
          <>
            This category is used by {usage(remove.id)} countdown(s). They will
            become uncategorised.
          </>
        ) : (
          "This category is not in use."
        )}
      </ConfirmDialog>
    </AppShell>
  );
}
