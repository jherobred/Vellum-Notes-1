import { useEffect, useState } from "react";
import { Minus, Square, X } from "lucide-react";
import { Editor } from "@/components/vellum/editor";
import { NoteList } from "@/components/vellum/note-list";
import { CommandPalette, SettingsDialog, ShortcutsDialog, useModMac } from "@/components/vellum/overlays";
import { Sidebar } from "@/components/vellum/sidebar";
import { cn } from "@/lib/cn";
import { bootNotes, useNotes } from "@/lib/notes/store";
import { playCue, unlockSound } from "@/lib/sound";

type Shell = "desktop" | undefined;

declare global {
  interface Window {
    ipc?: { postMessage: (message: string) => void };
  }
}

export function StudioHome({ shell }: { shell?: "desktop" } = {}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await bootNotes();
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  if (!ready) return <Boot shell={shell} />;
  return <Studio shell={shell} />;
}

function Studio({ shell }: { shell: Shell }) {
  const wide = useWide();
  const mac = useModMac();
  const focus = useNotes((s) => s.settings.focus);
  const mobilePane = useNotes((s) => s.mobilePane);
  const showRail = wide && !focus;
  const showList = !focus && (wide || mobilePane === "browse");
  const showEditor = focus || wide || mobilePane === "write";

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const state = useNotes.getState();
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable === true;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (event.key === "Escape") {
        if (state.paletteOpen) {
          state.setPaletteOpen(false);
          return;
        }
        if (state.settingsOpen) {
          state.setSettingsOpen(false);
          return;
        }
        if (state.shortcutsOpen) {
          state.setShortcutsOpen(false);
          return;
        }
        if (state.findOpen) {
          state.setFindOpen(false);
          return;
        }
        if (typing) return;
        if (state.settings.focus) {
          state.updateSettings({ focus: false });
          return;
        }
        if (!wide && state.mobilePane === "write") state.setMobilePane("browse");
        return;
      }

      if (!mod) return;
      if (key === "k") {
        event.preventDefault();
        state.setPaletteOpen(!state.paletteOpen);
        return;
      }
      if (event.repeat) return;
      if (key === "n") {
        event.preventDefault();
        state.createNote();
        return;
      }
      if (key === "f") {
        event.preventDefault();
        state.setFindOpen(true);
        return;
      }
      if (key === "\\") {
        event.preventDefault();
        state.updateSettings({ focus: !state.settings.focus });
        return;
      }
      if (key === "s") {
        event.preventDefault();
        if (state.settings.sound) playCue("save");
        state.flash("Saved");
        return;
      }
      if (key === "p" && event.shiftKey && state.activeNoteId) {
        event.preventDefault();
        state.togglePin(state.activeNoteId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wide]);

  return (
    <div className="app-shell">
      {shell === "desktop" && <DesktopBar />}
      <div className={cn("studio-grid", focus && "is-focus")}>
        {showRail && <Sidebar />}
        {showList && <NoteList wide={wide} />}
        {showEditor && <Editor wide={wide} />}
        <CommandPalette />
        <SettingsDialog />
        <ShortcutsDialog mac={mac} />
      </div>
      {shell === "desktop" && <ResizeEdges />}
    </div>
  );
}

function DesktopBar() {
  const [maxed, setMaxed] = useState(false);
  const send = (message: string) => window.ipc?.postMessage(message);
  return (
    <header
      className="desktop-bar"
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest("button")) return;
        if (event.detail >= 2) {
          send("maximize");
          setMaxed((open) => !open);
          return;
        }
        send("drag");
      }}
    >
      <span className="logo-mark">Vellum</span>
      <div className="flex">
        <button type="button" className="win-btn" aria-label="Minimize" onClick={() => send("minimize")}>
          <Minus className="size-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="win-btn"
          aria-label={maxed ? "Restore" : "Maximize"}
          onClick={() => {
            send("maximize");
            setMaxed((open) => !open);
          }}
        >
          <Square className="size-3" strokeWidth={1.75} />
        </button>
        <button type="button" className="win-btn is-close" aria-label="Close" onClick={() => send("close")}>
          <X className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}

const EDGES = ["n", "s", "e", "w", "nw", "ne", "sw", "se"] as const;

function ResizeEdges() {
  return (
    <>
      {EDGES.map((edge) => (
        <div
          key={edge}
          className={`resize-edge resize-${edge}`}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            window.ipc?.postMessage(`resize:${edge}`);
          }}
        />
      ))}
    </>
  );
}

function useWide() {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function Boot({ shell }: { shell: Shell }) {
  return (
    <div className="app-shell">
      {shell === "desktop" && <DesktopBar />}
      <div className="studio-grid">
        <div className="flex items-center justify-center">
          <div className="boot-in glass-card flex flex-col items-center rounded-2xl px-10 py-9 text-center">
            <span className="logo-mark">Vellum</span>
            <p className="mt-4 text-sm text-muted">Opening your notes</p>
          </div>
        </div>
      </div>
    </div>
  );
}