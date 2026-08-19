"use client";

import React from "react";
import Link from "next/link";
import { EventData } from "@/lib/models";
import { getEventStatusMeta } from "@/lib/statusLabels";

type EventCardProps = {
  event: EventData;
  cta?: "Add" | "View" | "Manage" | "Joined";
  onCta?: () => void;
  href?: string;
};

export default function EventCard({
  event,
  cta = "View",
  onCta,
  href,
}: EventCardProps) {
  const isJoined = cta === "Joined";
  const statusMeta = getEventStatusMeta(event.eventState, event.dueDate);

  const content = (
    <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border)]">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{event.name}</h3>
          <p className="text-sm text-[var(--color-muted)]">
            {event.sportsOption?.label || event.sportsOptionCode || "—"} ·{" "}
            {event.eventFormat?.label || event.eventFormatCode || "—"} ·{" "}
            {event.startDate}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            {event.amount != null && (
              <span className="text-xs">
                {event.amount === 0 ? "Free" : `₹${event.amount}`}
              </span>
            )}
          </div>
        </div>
        {onCta && !isJoined && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onCta();
            }}
            className="shrink-0 px-3 py-1.5 rounded-[var(--radius-button)] bg-primary text-white text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {cta}
          </button>
        )}
        {isJoined && (
          <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
            Joined
          </span>
        )}
      </div>
    </div>
  );

  if (href && !onCta) {
    return (
      <Link href={href} className="block hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}
