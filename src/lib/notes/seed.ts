import type { Note, Notebook } from "@/lib/notes/types";

export function createSeed(now = Date.now()): { notebooks: Notebook[]; notes: Note[] } {
  const notebooks: Notebook[] = [
    { id: "nb-desk", name: "Desk", icon: "desk", createdAt: now - 86400000 * 12 },
    { id: "nb-journal", name: "Journal", icon: "journal", createdAt: now - 86400000 * 20 },
    { id: "nb-ideas", name: "Ideas", icon: "spark", createdAt: now - 86400000 * 4 },
  ];

  const notes: Note[] = [
    {
      id: "note-welcome",
      notebookId: "nb-desk",
      title: "Welcome to Vellum",
      pinned: true,
      color: "wax",
      trashed: false,
      tags: ["start"],
      createdAt: now - 1000 * 60 * 50,
      updatedAt: now - 1000 * 60 * 12,
      body: `This is a desk, not a pile of files. Notes live in notebooks, wear tags, and stay on this device — quietly, in the browser.

## Write in place

Formatting appears as you type. There is no separate preview.

- Type \`- \` for a bullet, \`1. \` for a number, or \`[] \` for a task
- \`# \` makes a heading, \`> \` a quote, and three backticks a code block
- Tab indents. Enter continues the list. An empty item steps back out
- Type \`/\` for a block menu, \`==highlight==\`, or \`~~strike~~\`

- [ ] Indent a bullet with Tab
- [x] Tick a task without leaving the page

> The page you are reading is the page you are editing.

## Keep the room quiet

Focus mode puts the furniture away. Typewriter mode holds the line you are on near the middle of the page. The sounds are original glass tones made in the browser — short, soft, and not copied from anyone's operating system.

## A few doors

Search looks through titles, pages, and tags. Trash is a drawer, not a shredder, until you say otherwise. Export a page as Markdown, or the whole library as a file you can carry.
`,
    },
    {
      id: "note-field",
      notebookId: "nb-journal",
      title: "Field notes before the day starts",
      pinned: false,
      color: "moss",
      trashed: false,
      tags: ["journal"],
      createdAt: now - 86400000 * 2,
      updatedAt: now - 1000 * 60 * 90,
      body: `The useful hour is the one that still feels unfinished. Coffee cools. The street outside has not decided what kind of morning it is.

## What I noticed

A delivery rider waited out the rain under a thin awning and still nodded at the guard. Small courtesies are a kind of infrastructure.

> Do not confuse a full calendar with a day that meant something.

## Leave on the desk

1. One page, not five tabs.
2. A sentence I would not be embarrassed to read aloud.
3. Stop before the writing turns into arranging.
`,
    },
    {
      id: "note-session",
      notebookId: "nb-desk",
      title: "Session checklist",
      pinned: false,
      color: "brass",
      trashed: false,
      tags: ["practice"],
      createdAt: now - 86400000,
      updatedAt: now - 1000 * 60 * 240,
      body: `Forty focused minutes. Phone in another room. One notebook open.

- [ ] Name the page before decorating it
- [ ] Write the ugly version first
- [ ] Mark what is actually done
- [ ] File it in the right notebook before leaving

When the timer in the corner fills, stand up. The note will still be here.
`,
    },
    {
      id: "note-rooms",
      notebookId: "nb-ideas",
      title: "Rooms the app could grow into",
      pinned: false,
      color: "none",
      trashed: false,
      tags: ["ideas", "product"],
      createdAt: now - 86400000 * 3,
      updatedAt: now - 1000 * 60 * 400,
      body: `Not a roadmap. A shelf.

## Organization

- Linked notes, the way a footnote points across a book
- A weekly review that gathers what was pinned

## The page

- A citation drawer for classes
- Ink colors that mean something only to you

## Keep

Vellum should stay a desk. If a feature needs a dashboard, it does not belong here.
`,
    },
  ];

  return { notebooks, notes };
}
