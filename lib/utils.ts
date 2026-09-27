import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type Primitive = string | number | boolean | null | undefined;
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})/;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toQuery(params: Record<string, Primitive>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export function parseDateOnlyLocal(value?: string | Date | null) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const match = value.match(dateOnlyPattern);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getDateOnlyEndTime(value?: string | Date | null) {
  const date = parseDateOnlyLocal(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function formatDateOnlyDisplay(value?: string | Date | null) {
  const date = parseDateOnlyLocal(value);
  if (!date) return value ? String(value) : "TBA";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
