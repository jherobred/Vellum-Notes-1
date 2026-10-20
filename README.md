# Vellum

A quiet writing desk. Notebooks, tags, pins, trash, focus mode, and a page that formats as you type.

Notes stay on this computer. Nothing is uploaded.

## Windows

Download the latest release:

- **Vellum-Setup**: installs for your user, no admin, and adds a Start menu shortcut
- **Vellum portable**: one exe, nothing to install

The builds are not code-signed yet. If SmartScreen says Windows protected your PC, choose **More info**, then **Run anyway**.

Notes in the Windows app are separate from notes in a browser. Each one keeps its own copy on the machine.

## Desk

- Notebooks, tags, color labels, pins, search, and trash
- Formatting as you type: lists, tasks, headings, quotes, code, indent
- Focus mode and typewriter scrolling
- Light and dark
- Original glass UI tones, made in the app, not copied from an operating system
- Undo, redo, select all, copy, cut, and paste
- Export a note as Markdown, or the whole library as JSON

## Scripts

```bash
npm install
npm run dev
```

The dev server listens on port `8080`.

The Windows files are built on a tag (`v0.1.1`) by `.github/workflows/release.yml`.
