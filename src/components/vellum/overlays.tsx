import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button, FieldLabel } from "@/components/vellum/ui";
import { cn } from "@/lib/cn";
import { useNotes } from "@/lib/notes/store";
import { downloadText, noteTitle } from "@/lib/notes/text";
import type { LibraryFile } from "@/lib/notes/store";
import { sanitizeSettings, type FontSize, type Measure } from "@/lib/notes/types";
import { playCue } from "@/lib/sound";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-in glass-overlay fixed inset-0 z-40" />
        <Dialog.Content className="dialog-in glass-card fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-md -translate-y-1/2 rounded-2xl p-6 text-ink">
          <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">{body}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="quiet">Cancel</Button>
            </Dialog.Close>
            <Button variant="danger" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function CommandPalette() {
  const open = useNotes((s) => s.paletteOpen);
  const setOpen = useNotes((s) => s.setPaletteOpen);
  const notes = useNotes((s) => s.notes);
  const notebooks = useNotes((s) => s.notebooks);
  const settings = useNotes((s) => s.settings);
  const createNote = useNotes((s) => s.createNote);
  const openToday = useNotes((s) => s.openToday);
  const setActiveNote = useNotes((s) => s.setActiveNote);
  const setCollection = useNotes((s) => s.setCollection);
  const updateSettings = useNotes((s) => s.updateSettings);
  const setSettingsOpen = useNotes((s) => s.setSettingsOpen);
  const setShortcutsOpen = useNotes((s) => s.setShortcutsOpen);
  const setFindOpen = useNotes((s) => s.setFindOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const actions = [
      { id: "new", label: "New note", hint: "Page", run: () => createNote() },
      { id: "today", label: "Open today's journal", hint: "Journal", run: () => openToday() },
      {
        id: "focus",
        label: settings.focus ? "Leave focus mode" : "Enter focus mode",
        hint: "View",
        run: () => updateSettings({ focus: !settings.focus }),
      },
      {
        id: "theme",
        label: settings.theme === "paper" ? "Switch to dark" : "Switch to light",
        hint: "View",
        run: () => updateSettings({ theme: settings.theme === "paper" ? "midnight" : "paper" }),
      },
      {
        id: "sound",
        label: settings.sound ? "Mute studio sounds" : "Turn sounds on",
        hint: "Sound",
        run: () => updateSettings({ sound: !settings.sound }),
      },
      {
        id: "typewriter",
        label: settings.typewriter ? "Stop typewriter mode" : "Typewriter mode",
        hint: "Write",
        run: () => updateSettings({ typewriter: !settings.typewriter }),
      },
      { id: "find", label: "Find in the open note", hint: "Write", run: () => setFindOpen(true) },
      { id: "settings", label: "Open settings", hint: "App", run: () => setSettingsOpen(true) },
      { id: "keys", label: "Keyboard shortcuts", hint: "Desk", run: () => setShortcutsOpen(true) },
      ...notebooks.map((notebook) => ({
        id: `nb-${notebook.id}`,
        label: notebook.name,
        hint: "Notebook",
        run: () => setCollection(notebook.id),
      })),
      ...notes
        .filter((note) => !note.trashed)
        .slice(0, 40)
        .map((note) => ({
          id: note.id,
          label: noteTitle(note),
          hint: "Note",
          run: () => setActiveNote(note.id),
        })),
    ];
    const q = query.trim().toLowerCase();
    return q ? actions.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(q)) : actions;
  }, [
    createNote,
    notes,
    notebooks,
    openToday,
    query,
    setActiveNote,
    setCollection,
    setFindOpen,
    setSettingsOpen,
    setShortcutsOpen,
    settings.focus,
    settings.sound,
    settings.theme,
    settings.typewriter,
    updateSettings,
  ]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const run = (index: number) => {
    const item = items[index];
    if (!item) return;
    item.run();
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-in glass-overlay fixed inset-0 z-40" />
        <Dialog.Content
          className="dialog-in glass-card sheet-panel fixed inset-x-4 top-16 z-50 mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-2xl text-ink"
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((index) => Math.min(items.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              run(cursor);
            }
          }}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes and actions"
            aria-label="Command palette"
            className="h-14 w-full border-b border-line bg-transparent px-4 text-base text-ink outline-none placeholder:text-muted"
          />
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted">No matching notes or actions.</p>
            ) : (
              items.slice(0, 30).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => run(index)}
                  className={cn(
                    "flex h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm",
                    index === cursor ? "bg-paper-2 text-ink" : "text-ink",
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted">{item.hint}</span>
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function SettingsDialog() {
  const open = useNotes((s) => s.settingsOpen);
  const setOpen = useNotes((s) => s.setSettingsOpen);
  const settings = useNotes((s) => s.settings);
  const notebooks = useNotes((s) => s.notebooks);
  const notes = useNotes((s) => s.notes);
  const updateSettings = useNotes((s) => s.updateSettings);
  const importLibrary = useNotes((s) => s.importLibrary);
  const setShortcutsOpen = useNotes((s) => s.setShortcutsOpen);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [pending, setPending] = useState<LibraryFile | null>(null);

  const exportAll = () => {
    const file: LibraryFile = {
      version: 1,
      exportedAt: Date.now(),
      notebooks,
      notes,
      settings,
    };
    downloadText(
      "vellum-library.json",
      JSON.stringify(file, null, 2),
      "application/json",
    );
    if (settings.sound) playCue("save");
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      useNotes.getState().flash("That file is too large");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text()) as LibraryFile;
      if (mode === "replace") setPending(parsed);
      else importLibrary(parsed, "merge");
    } catch {
      useNotes.getState().flash("Could not read that file");
      if (settings.sound) playCue("error");
    }
  };

  return (
    <>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-in glass-overlay fixed inset-0 z-40" />
        <Dialog.Content className="dialog-in glass-card sheet-panel scroll-thin fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl p-6 text-ink">
          <Dialog.Title className="text-lg font-semibold tracking-tight">Settings</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            Light or dark, type size, and how wide the page sits.
          </Dialog.Description>
          <div className="mt-6 flex flex-col gap-5">
            <Setting label="Theme">
              <Segment
                value={settings.theme}
                options={[
                  ["paper", "Light"],
                  ["midnight", "Dark"],
                ]}
                onChange={(theme) => updateSettings({ theme: theme === "midnight" ? "midnight" : "paper" })}
              />
            </Setting>
            <Setting label="Sounds">
              <div className="flex flex-col gap-3">
                <Segment
                  value={settings.sound ? "on" : "off"}
                  options={[
                    ["on", "On"],
                    ["off", "Off"],
                  ]}
                  onChange={(value) => updateSettings({ sound: value === "on" })}
                />
                <label className="flex items-center gap-3 text-sm text-muted">
                  Volume
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.volume * 100)}
                    aria-label="Sound volume"
                    onChange={(event) => updateSettings({ volume: Number(event.target.value) / 100 })}
            className="h-11 flex-1 accent-wax"
                  />
                </label>
                <Button
                  variant="quiet"
                  className="self-start"
                  onClick={() => {
                    if (!settings.sound) updateSettings({ sound: true });
                    playCue("save");
                    window.setTimeout(() => playCue("create"), 180);
                  }}
                >
                  Preview tones
                </Button>
                <p className="text-xs leading-relaxed text-muted">
                  Original studio tones, synthesized here. Short and glassy, in the spirit of a quiet desktop — not recordings from macOS or anywhere else.
                </p>
              </div>
            </Setting>
            <Setting label="Type size">
              <Segment
                value={settings.fontSize}
                options={[
                  ["sm", "Small"],
                  ["md", "Comfort"],
                  ["lg", "Large"],
                ]}
                onChange={(value) => updateSettings({ fontSize: value as FontSize })}
              />
            </Setting>
            <Setting label="Measure">
              <Segment
                value={settings.measure}
                options={[
                  ["narrow", "Narrow"],
                  ["comfort", "Comfort"],
                  ["wide", "Wide"],
                ]}
                onChange={(value) => updateSettings({ measure: value as Measure })}
              />
            </Setting>
            <Setting label="Typewriter">
              <Segment
                value={settings.typewriter ? "on" : "off"}
                options={[
                  ["off", "Off"],
                  ["on", "Hold the line"],
                ]}
                onChange={(value) => updateSettings({ typewriter: value === "on" })}
              />
            </Setting>
            <Setting label="Session goal">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={settings.wordGoal}
                  aria-label="Session word goal"
                  onChange={(event) => updateSettings({ wordGoal: Number(event.target.value) })}
                  className="h-11 w-28 rounded-lg bg-paper/80 px-3 text-ink ring-1 ring-line"
                />
                <span className="text-muted">words</span>
              </label>
            </Setting>
            <Setting label="Library">
              <div className="flex flex-wrap gap-2">
                <Button variant="quiet" onClick={exportAll}>
                  Export JSON
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setMode("merge");
                    fileRef.current?.click();
                  }}
                >
                  Merge file
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setMode("replace");
                    fileRef.current?.click();
                  }}
                >
                  Replace…
                </Button>
                <Button variant="ghost" onClick={() => setShortcutsOpen(true)}>
                  Shortcuts
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </Setting>
          </div>
          <div className="mt-6 flex justify-end">
            <Dialog.Close asChild>
              <Button variant="solid">Done</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <ConfirmDialog
      open={pending !== null}
      title="Replace the whole library?"
      body="The notes on this desk will be swapped for the file. Export first if you want a copy."
      confirmLabel="Replace"
      onOpenChange={(next) => {
        if (!next) setPending(null);
      }}
      onConfirm={() => {
        if (pending) {
          importLibrary(
            { ...pending, settings: sanitizeSettings({ ...settings, ...pending.settings }) },
            "replace",
          );
        }
        setPending(null);
      }}
    />
    </>
  );
}

export function ShortcutsDialog({ mac }: { mac: boolean }) {
  const open = useNotes((s) => s.shortcutsOpen);
  const setOpen = useNotes((s) => s.setShortcutsOpen);
  const mod = mac ? "⌘" : "Ctrl";
  const rows = [
    [`${mod} K`, "Command palette"],
    [`${mod} N`, "New note"],
    [`${mod} F`, "Find in the open note"],
    [`${mod} \\`, "Focus mode"],
    [`${mod} S`, "Saved chime"],
    [`${mod} ⇧ P`, "Pin the open note"],
    [`${mod} B`, "Bold"],
    [`${mod} I`, "Italic"],
    [`${mod} Enter`, "Toggle a task"],
    ["Tab", "Indent"],
    ["Shift Tab", "Outdent"],
    ["Enter", "Continue a list"],
    ["/", "Insert a block"],
    ["Esc", "Close, or step back"],
  ];
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-in glass-overlay fixed inset-0 z-40" />
        <Dialog.Content className="dialog-in glass-card fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-md -translate-y-1/2 rounded-2xl p-6 text-ink">
          <Dialog.Title className="text-lg font-semibold tracking-tight">Shortcuts</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">
            The same doors, without taking your hands off the keys.
          </Dialog.Description>
          <ul className="mt-5 divide-y divide-line">
            {rows.map(([key, label]) => (
              <li key={key} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>{label}</span>
                <kbd className="rounded-md bg-paper/70 px-2 py-1 text-xs text-muted ring-1 ring-line">{key}</kbd>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end">
            <Dialog.Close asChild>
              <Button variant="solid">Done</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-paper-2 p-1" role="group">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "h-11 flex-1 rounded-md px-3 text-sm",
            value === id ? "bg-paper text-ink shadow-sm" : "text-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function useModMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  return mac;
}
