import { getDateOnlyEndTime, parseDateOnlyLocal } from "@/lib/utils";

type StatusMeta = {
  label: string;
  className: string;
};

function baseBadgeClass(
  kind: "success" | "warning" | "primary" | "neutral" | "danger",
) {
  if (kind === "success") {
    return "bg-green-500/15 text-green-600 border-green-200";
  }

  if (kind === "danger") {
    return "bg-red-500/15 text-red-600 border-red-200";
  }

  if (kind === "warning") {
    return "bg-amber-500/15 text-amber-700 border-amber-300";
  }

  if (kind === "primary") {
    return "bg-primary/15 text-primary border-primary/20";
  }

  return "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]";
}

export function getTournamentStatusMeta(state?: string | null): StatusMeta {
  const normalized = (state || "").toLowerCase();

  if (normalized === "completed") {
    return { label: "Completed", className: baseBadgeClass("success") };
  }

  if (normalized === "cancelled") {
    return { label: "Cancelled", className: baseBadgeClass("warning") };
  }

  if (normalized === "in_progress") {
    return { label: "Live", className: baseBadgeClass("primary") };
  }

  if (normalized === "published") {
    return { label: "Open", className: baseBadgeClass("primary") };
  }

  if (normalized === "drafted") {
    return { label: "Draft", className: baseBadgeClass("neutral") };
  }

  return { label: state || "Open", className: baseBadgeClass("neutral") };
}

export function getEventStatusMeta(
  state?: string | null,
  dueDate?: string | null,
): StatusMeta {
  const normalized = (state || "").toLowerCase();
  const isClosedByDate = !isEventRegistrationOpen(state, dueDate);

  if (normalized === "completed") {
    return { label: "Completed", className: baseBadgeClass("success") };
  }

  if (normalized === "round_over") {
    return { label: "Round Over", className: baseBadgeClass("warning") };
  }

  if (normalized === "in_progress") {
    return { label: "Live", className: baseBadgeClass("primary") };
  }

  if (isClosedByDate) {
    return { label: "Closed", className: baseBadgeClass("danger") };
  }

  if (normalized === "scheduled") {
    return { label: "Scheduled", className: baseBadgeClass("primary") };
  }

  if (normalized === "participants_finalized") {
    return { label: "Fixtures Ready", className: baseBadgeClass("success") };
  }

  return { label: "Open", className: baseBadgeClass("success") };
}

export function isEventRegistrationOpen(
  state?: string | null,
  dueDate?: string | null,
) {
  const normalized = (state || "").toLowerCase();
  if (normalized === "registration_closed") {
    const dueDateOnly = parseDateOnlyLocal(dueDate);
    if (!dueDateOnly) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDateOnly.getTime() > today.getTime();
  }
  if (!dueDate) return true;
  const dueDateEndTime = getDateOnlyEndTime(dueDate);
  if (dueDateEndTime === null) return true;
  return Date.now() <= dueDateEndTime;
}
