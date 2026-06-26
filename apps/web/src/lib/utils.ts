import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object to "01 Jan 2026"
 * Handles ISO strings like "2026-06-26T00:00:00.000Z" correctly
 * by treating date-only strings as UTC to avoid timezone day shifts.
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    let date: Date;
    if (typeof value === "string") {
      // If it's a date-only string (YYYY-MM-DD), parse as UTC to avoid TZ shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split("-").map(Number);
        date = new Date(Date.UTC(y, m - 1, d));
      } else {
        date = new Date(value);
      }
    } else {
      date = value;
    }
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return String(value);
  }
}

/**
 * Format a datetime string to "01 Jan 2026, 09:00"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + ", " + date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return String(value);
  }
}
