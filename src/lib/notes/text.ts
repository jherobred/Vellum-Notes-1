import type { Note } from "@/lib/notes/types";

export function countWords(text: string): number {
  const match = text.trim().match(/\S+/g);
  return match ? match.length : 0;
}

export function readingLabel(words: number): string {
  if (words === 0) return "Empty page";
  const mins = Math.max(1, Math.round(words / 220));
  return mins === 1 ? "1 min read" : `${mins} min read`;
}

export function snippet(body: string): string {
  const line =
    body
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s.length > 0 && !s.startsWith("#")) ?? "";
  return line
    .replace(/^[-*]\s+(\[[ xX]\]\s+)?/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 110);
}

export function headings(body: string): { level: number; text: string; raw: string }[] {
  return body.split("\n").flatMap((raw) => {
    const match = /^(#{1,3})\s+(\S.*)$/.exec(raw.trim());
    if (!match) return [];
    return [{ level: match[1].length, text: match[2].trim(), raw: raw.trim() }];
  });
}

export function noteTitle(note: Pick<Note, "title">): string {
  const title = note.title.trim();
  return title.length > 0 ? title : "Untitled";
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[^\w.\- ]+/g, "").trim() || "vellum.md";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toggleTaskLine(body: string, raw: string): string {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const idx = lines.findIndex((line) => line === raw);
  if (idx < 0) return body;
  const line = lines[idx] ?? "";
  if (line.includes("[ ]")) lines[idx] = line.replace("[ ]", "[x]");
  else lines[idx] = line.replace(/\[(x|X)\]/, "[ ]");
  return lines.join("\n");
}

export function slugFile(title: string): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${clean || "note"}.md`;
}
