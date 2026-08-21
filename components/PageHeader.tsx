"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import NotificationsSlideOver, {
  NotificationItem,
} from "@/components/NotificationsSlideOver";
import { notificationApi } from "@/lib/api/notificationApi";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function PageHeader({
  title,
  subtitle,
  action,
  hideTopRow = false,
  showNotifications = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  hideTopRow?: boolean;
  showNotifications?: boolean;
}) {
  const { userProfile: profile, activeOrganization: organization } = useApp();
  const pathname = usePathname();
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
    if (hideTopRow || !showNotifications) return;
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
  }, [readIds, hideTopRow, showNotifications]);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const profileLink = pathname.startsWith("/org") ? "/org/settings" : "/user/settings";

  return (
    <header className={`bg-[var(--color-background)] text-[var(--color-text)] ${hideTopRow ? 'pt-8' : 'pt-10'} pb-4 px-5 transition-colors duration-300`}>
      <div className="flex flex-col gap-6">
        {!hideTopRow ? (
          <div className="flex items-center gap-4">
            <Link href={profileLink} className="shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden flex items-center justify-center shadow-md transition-transform active:scale-95">
                {(profileLink === "/user/settings" ? profile?.profilePicUrl : (organization?.logoUrl || profile?.profilePicUrl)) ? (
                  <img
                    src={(profileLink === "/user/settings" ? profile?.profilePicUrl : (organization?.logoUrl || profile?.profilePicUrl)) || ""}
                    alt={(profileLink === "/user/settings" ? profile?.name : (organization?.name || profile?.name)) || "Profile"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {(profileLink === "/user/settings" ? profile?.name : (organization?.name || profile?.name || "O"))?.charAt(0)}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex flex-col min-w-0">
              <h1 className="text-[24px] font-bold leading-tight tracking-tight truncate text-[var(--color-text)]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[14px] text-[var(--color-text-secondary)] font-medium tracking-wide truncate opacity-80">
                  {subtitle}
                </p>
              )}
            </div>

            {showNotifications && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative w-12 h-12 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface)] transition-all active:scale-95 shadow-sm text-[var(--color-text)]"
                aria-label="Notifications"
              >
                <BellIcon size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--color-background)]">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 min-w-0">
              <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[var(--color-text)]">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[15px] text-[var(--color-text-secondary)] font-medium tracking-wide opacity-80">
                  {subtitle}
                </p>
              )}
            </div>
            {action && (
              <div className="shrink-0">
                {action}
              </div>
            )}
          </div>
        )}
      </div>

      {!hideTopRow && showNotifications && (
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
