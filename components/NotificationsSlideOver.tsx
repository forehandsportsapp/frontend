"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  XIcon,
} from "@/components/Icons";

export type NotificationItem = {
  id: string;
  inviteId?: string;
  type: "invite" | "registration" | "match_start" | "info";
  inviteState?: "pending" | "accepted" | "rejected";
  contextType?: string;
  organizationId?: string | null;
  tournamentId?: string | null;
  eventId?: string | null;
  role?: string | null;
  title: string;
  body?: string;
  source?: string;
  timeAgo: string;
  unread: boolean;
  actionHref?: string;
  actionLabel?: string;
  onAccept?: () => void;
  onReject?: () => void;
  onSeeMatch?: () => void;
};

type NotificationsSlideOverProps = {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
  unreadCount: number;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
};

export default function NotificationsSlideOver({
  open,
  onClose,
  items,
  unreadCount,
  onMarkAllRead,
  onClearAll,
}: NotificationsSlideOverProps) {
  const [activeTab, setActiveTab] = React.useState<"inbox" | "previous">(
    "inbox",
  );
  const [acceptingIds, setAcceptingIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [acceptedConfirmationIds, setAcceptedConfirmationIds] = React.useState<
    Set<string>
  >(new Set());
  const confirmationTimeoutsRef = React.useRef<Record<string, number>>({});

  React.useEffect(
    () => () => {
      Object.values(confirmationTimeoutsRef.current).forEach((timeoutId) =>
        window.clearTimeout(timeoutId),
      );
    },
    [],
  );

  if (!open) return null;

  const isPreviousInvite = (item: NotificationItem) =>
    item.inviteState === "accepted" || item.inviteState === "rejected";
  const inboxItems = items.filter(
    (item) =>
      !isPreviousInvite(item) ||
      acceptingIds.has(item.id) ||
      acceptedConfirmationIds.has(item.id),
  );
  const previousItems = items.filter(isPreviousInvite);
  const visibleItems = activeTab === "previous" ? previousItems : inboxItems;

  const handleAccept = async (item: NotificationItem) => {
    if (!item.onAccept || acceptingIds.has(item.id)) return;

    setAcceptingIds((prev) => new Set(prev).add(item.id));

    try {
      await item.onAccept();
      setAcceptedConfirmationIds((prev) => new Set(prev).add(item.id));

      const existingTimeoutId = confirmationTimeoutsRef.current[item.id];
      if (existingTimeoutId) window.clearTimeout(existingTimeoutId);

      confirmationTimeoutsRef.current[item.id] = window.setTimeout(() => {
        setAcceptedConfirmationIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        delete confirmationTimeoutsRef.current[item.id];
      }, 1800);
    } catch (error) {
      console.error("Failed to accept invitation", error);
    } finally {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-[var(--color-surface)] p-5 text-[var(--color-text)] shadow-xl"
        role="dialog"
        aria-label="Notifications"
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-3xl font-semibold">
              Notifications
            </h2>
            <p className="mt-1 text-base text-[var(--color-text-secondary)]">
              {unreadCount} unread
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]"
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("inbox")}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "inbox"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            Inbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("previous")}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "previous"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-secondary)]"
            }`}
          >
            Previous
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          {onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              Mark all as read
            </button>
          )}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              Clear all
            </button>
          )}
        </div>

        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
          {visibleItems.length === 0 ? (
            <li className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 text-sm text-[var(--color-muted)]">
              {activeTab === "previous"
                ? "No accepted or rejected invites from the last 3 days"
                : "No notifications"}
            </li>
          ) : (
            visibleItems.map((item) => {
              const isAccepting = acceptingIds.has(item.id);
              const isAcceptedConfirmation = acceptedConfirmationIds.has(
                item.id,
              );
              const isAccepted = item.inviteState === "accepted";
              const isRejected = item.inviteState === "rejected";
              const showAcceptedState = isAccepted || isAcceptedConfirmation;
              const statusLabel = showAcceptedState
                ? "Accepted"
                : isRejected
                  ? "Rejected"
                  : "";
              const showStatusPill = statusLabel && activeTab !== "previous";

              return (
                <li
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    showAcceptedState
                      ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10"
                      : isRejected
                        ? "border-[var(--color-error)]/30 bg-[var(--color-error)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                          showAcceptedState
                            ? "bg-[var(--color-success)] text-white"
                            : isRejected
                              ? "bg-[var(--color-error)] text-white"
                            : "bg-[var(--color-chip)] text-primary"
                        }`}
                      >
                        {showAcceptedState ? (
                          <CheckIcon size={16} />
                        ) : isRejected ? (
                          <XIcon size={16} />
                        ) : (
                          <CheckCircleIcon size={14} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xl font-semibold">
                            {isAcceptedConfirmation
                              ? "Invitation accepted"
                              : item.title}
                          </p>
                          {showStatusPill && (
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
                                isRejected
                                  ? "bg-[var(--color-error)]"
                                  : "bg-[var(--color-success)]"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          )}
                        </div>
                        {item.source && !isAcceptedConfirmation && (
                          <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-text)]">
                            {item.source}
                          </p>
                        )}
                        {(item.body || isAcceptedConfirmation) && (
                          <p className="mt-1 text-base text-[var(--color-text-secondary)]">
                            {isAcceptedConfirmation
                              ? "You're now part of this match/event."
                              : item.body}
                          </p>
                        )}
                        {!isAcceptedConfirmation && (
                          <p className="text-sm text-[var(--color-muted)]">
                          {item.timeAgo}
                          </p>
                        )}
                        <div className="mt-2 flex gap-2">
                          {item.onAccept && !isPreviousInvite(item) && (
                            <button
                              type="button"
                              onClick={() => void handleAccept(item)}
                              disabled={isAccepting}
                              className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-70"
                            >
                              {isAccepting ? "Accepting..." : "Accept"}
                            </button>
                          )}
                          {item.onReject && !isPreviousInvite(item) && (
                            <button
                              type="button"
                              onClick={item.onReject}
                              disabled={isAccepting}
                              className="rounded-lg bg-[var(--color-error)] px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reject
                            </button>
                          )}
                          {isAccepted && !isAcceptedConfirmation && item.actionHref && (
                            <Link
                              href={item.actionHref}
                              onClick={onClose}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
                            >
                              {item.actionLabel || "Open"}
                              <ArrowRightIcon size={14} />
                            </Link>
                          )}
                          {item.onSeeMatch && (
                            <button
                              type="button"
                              onClick={item.onSeeMatch}
                              className="rounded-lg px-2 py-1 text-sm text-primary"
                            >
                              See Match
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.unread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>
    </>
  );
}
