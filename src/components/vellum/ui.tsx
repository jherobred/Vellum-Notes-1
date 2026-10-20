import { cva, type VariantProps } from "class-variance-authority";
import {
  BookMarked,
  BookOpen,
  Feather,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";
import type { NotebookIcon } from "@/lib/notes/types";

const buttonStyles = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 ease-out select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        solid: "rounded-lg bg-wax text-on-wax hover:bg-wax-deep",
        ghost: "text-ink hover:bg-ink/5",
        quiet: "text-muted hover:bg-ink/5 hover:text-ink",
        rail: "text-muted hover:bg-ink/5 hover:text-ink",
        danger: "rounded-lg bg-danger text-cream hover:bg-danger-deep",
      },
      size: {
        md: "h-11 px-4 text-sm",
        sm: "h-11 px-3 text-sm",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { ref?: Ref<HTMLButtonElement> };

export function Button({ className, variant, size, type = "button", ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  );
}

export function Seal({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md bg-wax text-xs font-semibold text-on-wax",
        className,
      )}
      aria-hidden="true"
    >
      V
    </span>
  );
}

const ICONS: Record<NotebookIcon, LucideIcon> = {
  desk: Feather,
  journal: BookOpen,
  spark: Lightbulb,
  book: BookMarked,
};

export function NotebookGlyph({ icon, className }: { icon: NotebookIcon; className?: string }) {
  const Icon = ICONS[icon] ?? BookMarked;
  return <Icon className={cn("size-4", className)} strokeWidth={1.75} aria-hidden="true" />;
}

export function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-medium text-muted">{children}</span>;
}
