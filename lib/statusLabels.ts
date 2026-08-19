type StatusMeta = {
  label: string;
  className: string;
};

function baseBadgeClass(kind: "success" | "warning" | "primary" | "neutral") {
  if (kind === "success") {
    return "bg-green-500/15 text-green-600 border-green-200";
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
  const isClosedByDate = (() => {
    if (normalized === "registration_closed") return true;
    if (!dueDate) return false;
    const date = new Date(dueDate);
    if (Number.isNaN(date.getTime())) return false;
    date.setHours(23, 59, 59, 999);
    return Date.now() > date.getTime();
  })();

  if (normalized === "completed") {
    return { label: "Completed", className: baseBadgeClass("success") };
  }

  if (normalized === "round_over") {
    return { label: "Round Over", className: baseBadgeClass("warning") };
  }

  if (normalized === "in_progress") {
    return { label: "Live", className: baseBadgeClass("primary") };
  }

  if (normalized === "scheduled") {
    return { label: "Scheduled", className: baseBadgeClass("primary") };
  }

  if (normalized === "participants_finalized") {
    return { label: "Fixtures Ready", className: baseBadgeClass("success") };
  }

  if (isClosedByDate) {
    return { label: "Closed", className: baseBadgeClass("warning") };
  }

  return { label: "Open", className: baseBadgeClass("neutral") };
}
