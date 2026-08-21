"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "@/components/Icons";
import { useApp } from "@/components/AppProvider";
import NotificationsSlideOver, {
  NotificationItem,
} from "@/components/NotificationsSlideOver";
import { notificationApi } from "@/lib/api/notificationApi";

type TopNavProps = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  showNotifications?: boolean;
};

// Bell icon component
function BellIcon({ size = 24 }: { size?: number }) {
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

export default function TopNav({
  title,
  showBack = false,
  onBack,
  right,
  showNotifications = false,
}: TopNavProps) {
  const pathname = usePathname();
  const { userProfile, activeOrganization } = useApp();
  const isOrg = pathname.startsWith("/org");

  // CHANGED: Routes correctly to Settings instead of Profile
  const profileHref = isOrg ? "/org/settings" : "/user/settings";

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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

  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== "undefined") window.history.back();
  };

  const initial = isOrg
    ? activeOrganization?.name?.charAt(0) || "O"
    : userProfile?.name?.charAt(0) || "P";

  const picUrl = isOrg
    ? activeOrganization?.logoUrl
    : userProfile?.profilePicUrl;

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-[var(--shadow-nav)]"
        role="banner"
      >
        <div className="flex items-center justify-between h-14 px-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="p-2 -ml-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Go back"
              >
                <ArrowLeftIcon size={20} />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold truncate" id="page-title">
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showNotifications && (
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Notifications"
              >
                <BellIcon size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}
            {/* Profile Avatar */}
            <Link
              href={profileHref}
              className="p-1 rounded-full hover:bg-[var(--color-surface-elevated)] min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
              aria-label="Profile"
            >
              {picUrl ? (
                <img
                  src={picUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/10">
                  {initial}
                </span>
              )}
            </Link>
            {right}
          </div>
        </div>
      </header>

      {/* Notifications SlideOver */}
      {showNotifications && (
        <NotificationsSlideOver
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          items={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={() =>
            setReadIds(new Set(notifications.map((notification) => notification.id)))
          }
          onClearAll={() => setNotifications([])}
        />
      )}
    </>
  );
}
