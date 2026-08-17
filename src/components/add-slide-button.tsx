"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
export function AddSlideButton({
  onAdd,
  label,
  className,
}: {
  onAdd: () => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/add relative flex h-5.5 items-center justify-center",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-brand-1/25 opacity-0 transition-opacity duration-150 group-focus-within/add:opacity-100 group-hover/add:opacity-100"
      />
      <button
        type="button"
        onClick={onAdd}
        aria-label={label}
        title={label}
        className={cn(
          "relative z-10 flex size-6 cursor-pointer items-center justify-center rounded-full",
          "border border-border bg-card text-detail shadow-soft",
          "opacity-0 transition-all duration-150 ease-out",
          "group-focus-within/add:opacity-100 group-hover/add:opacity-100",
          "hover:scale-110 hover:border-brand-1 hover:bg-brand-1 hover:text-white",
          "focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
