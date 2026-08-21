"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import NotificationsSlideOver, {
  NotificationItem,
} from "@/components/NotificationsSlideOver";
import { notificationApi } from "@/lib/api/notificationApi";
import Link from "next/link";

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

type HomeHeaderProps = {
  showNotifications?: boolean;
};

export default function HomeHeader({ showNotifications = false }: HomeHeaderProps) {
  const { userProfile: profile, activeOrganization: organization } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const userFirstName = (profile?.name || "User").split(" ")[0];
  const orgName = organization?.name || "Organization";

  const attachActions = (items: NotificationItem[]) =>
    items.map((item) => ({
      ...item,
      unread: item.unread && !readIds.has(item.id),
      onAccept:
        item.type === "invite"
          ? async () => {
              await notificationApi.respondToInvite(item.id, "accept");
              setNotifications((prev) => prev.filter((n) => n.id !== item.id));
            }
          : undefined,
      onReject:
        item.type === "invite"
          ? async () => {
              await notificationApi.respondToInvite(item.id, "reject");
              setNotifications((prev) => prev.filter((n) => n.id !== item.id));
            }
          : undefined,
    }));

  useEffect(() => {
    if (!showNotifications) return;
    let active = true;
    const loadNotifications = async () => {
      try {
        const items = await notificationApi.getUserNotifications();
        if (!active) return;
        setNotifications(attachActions(items));
      } catch (error) {
        if (!active) return;
        console.error("Failed to load notifications", error);
        setNotifications([]);
      }
    };
    void loadNotifications();
    return () => {
      active = false;
    };
  }, [readIds, showNotifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="bg-[var(--color-background)] text-[var(--color-text)] pt-12 pb-6 px-4 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar / Logo */}
          <Link href="/org/settings" className="shrink-0">
            <div className="w-14 h-14 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden flex items-center justify-center shadow-sm">
              {organization?.logoUrl || profile?.profilePicUrl ? (
                <img
                  src={organization?.logoUrl || profile?.profilePicUrl || ""}
                  alt={orgName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-primary">
                  {orgName.charAt(0)}
                </span>
              )}
            </div>
          </Link>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">
              Hey {userFirstName}!
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium truncate">
              {orgName}
            </p>
          </div>
        </div>

        {showNotifications && (
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface)] transition-all active:scale-95"
            aria-label="Notifications"
          >
            <BellIcon size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--color-background)]">
                {unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {showNotifications && (
        <NotificationsSlideOver
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          items={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={() =>
            setReadIds(
              new Set(notifications.map((notification) => notification.id))
            )
          }
          onClearAll={() => setNotifications([])}
        />
      )}
    </header>
  );
}
