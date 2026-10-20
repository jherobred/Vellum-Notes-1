export type NoteColor = "none" | "wax" | "brass" | "moss";
export type NotebookIcon = "desk" | "journal" | "spark" | "book";
export type ThemeName = "paper" | "midnight";
export type FontSize = "sm" | "md" | "lg";
export type Measure = "narrow" | "comfort" | "wide";
export type EditorView = "write" | "preview" | "split";
export type SortMode = "updated" | "created" | "title";
export type MobilePane = "browse" | "write";

export type Notebook = {
  id: string;
  name: string;
  icon: NotebookIcon;
  createdAt: number;
};

export type Note = {
  id: string;
  notebookId: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  color: NoteColor;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  theme: ThemeName;
  sound: boolean;
  volume: number;
  focus: boolean;
  typewriter: boolean;
  fontSize: FontSize;
  measure: Measure;
  view: EditorView;
  sort: SortMode;
  wordGoal: number;
};

export const defaultSettings: Settings = {
  theme: "midnight",
  sound: true,
  volume: 0.72,
  focus: false,
  typewriter: false,
  fontSize: "md",
  measure: "comfort",
  view: "write",
  sort: "updated",
  wordGoal: 400,
};

export const NOTE_COLORS: { id: NoteColor; label: string; swatch: string }[] = [
  { id: "none", label: "No label", swatch: "bg-line" },
  { id: "wax", label: "Coral", swatch: "bg-wax" },
  { id: "brass", label: "Amber", swatch: "bg-brass" },
  { id: "moss", label: "Green", swatch: "bg-moss" },
];

export function sanitizeSettings(input: Partial<Settings> | undefined): Settings {
  const s = { ...defaultSettings, ...input };
  const fontSize: FontSize = s.fontSize === "sm" || s.fontSize === "lg" ? s.fontSize : "md";
  const measure: Measure =
    s.measure === "narrow" || s.measure === "wide" ? s.measure : "comfort";
  const view: EditorView = s.view === "preview" || s.view === "split" ? s.view : "write";
  const sort: SortMode = s.sort === "created" || s.sort === "title" ? s.sort : "updated";
  const volume = Number(s.volume);
  const goal = Number(s.wordGoal);
  return {
    theme: s.theme === "midnight" ? "midnight" : "paper",
    sound: s.sound !== false,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : defaultSettings.volume,
    focus: s.focus === true,
    typewriter: s.typewriter === true,
    fontSize,
    measure,
    view,
    sort,
    wordGoal: Number.isFinite(goal)
      ? Math.min(5000, Math.max(50, Math.round(goal)))
      : defaultSettings.wordGoal,
  };
}

export function uid(prefix: string): string {
  const cryptoUuid = globalThis.crypto?.randomUUID?.();
  const tail = cryptoUuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${tail}`;
}
