"use client";

import SwitchAccountModal from "@/components/SwitchAccountModal";
import CreateProfileModal from "@/components/CreateProfileModal";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/components/AppProvider";
import BottomNav from "@/components/BottomNav";
import { routes } from "@/routes";
import {
  LockIcon,
  HelpCircleIcon,
  MailIcon,
  LogOutIcon,
  MoonIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  ShieldIcon,
  PhoneIcon,
} from "@/components/Icons";
import { Bell, Settings2 } from "lucide-react";

export default function UserSettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { logout, userProfile } = useApp();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const settingsItems = [
    /*
    {
      href: routes.userSettingsNotifications(),
      icon: Bell,
      label: "Notifications",
      sub: "Manage Preferences",
    },
    {
      href: routes.userSettingsPrivacy(),
      icon: ShieldIcon,
      label: "Privacy & Policy",
      sub: "Control your settings",
    },
    {
      href: routes.userSettingsPreferences(),
      icon: Settings2,
      label: "Preferences",
      sub: "App preferences",
    },
    */
    {
      href: routes.userSettingsHelp(),
      icon: HelpCircleIcon,
      label: "Help & Support",
      sub: "Connect with our support team",
    },
  ];

  const initials = userProfile?.name.trim().charAt(0).toUpperCase();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[var(--color-background)] text-[var(--color-text)] flex flex-col overflow-hidden">
      <header className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="flex items-center justify-between h-14 px-5">
          <button
            type="button"
            onClick={() => setShowSwitchModal(true)}
            className="flex items-center gap-1.5 font-bold text-[20px] tracking-tight hover:opacity-80 transition-opacity"
            aria-expanded={showSwitchModal}
          >
            Profile Switcher
            <ChevronDownIcon
              size={20}
              className="text-[var(--color-text)] mt-0.5 shrink-0"
            />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-10 h-10 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <PlusIcon size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-4 pt-6 pb-4 space-y-8">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex flex-shrink-0 items-center justify-center text-white text-2xl font-bold overflow-hidden border border-[var(--color-border)]">
              {userProfile?.profilePicUrl ? (
                <img
                  src={userProfile.profilePicUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">
                {userProfile?.name ?? "Player"}
              </h2>
              <div className="mt-1 space-y-1 text-sm text-[var(--color-text-muted)]">
                <p className="flex items-center gap-2 truncate">
                  <PhoneIcon
                    size={14}
                    className="shrink-0 text-[var(--color-text)]"
                  />
                  {"  +91 "}
                  {userProfile?.phone ?? "No Contact"}
                </p>
              </div>
            </div>
          </div>
          <Link
            href={routes.userSettingsProfile()}
            className="mt-5 block w-full py-2.5 rounded-xl bg-[var(--color-primary)] border border-[var(--color-primary)] text-white text-center font-bold text-[15px] hover:opacity-90 transition-opacity"
          >
            Edit Profile
          </Link>
        </div>

        <div>
          <h3 className="text-xs font-bold text-[var(--color-text-muted)] mb-3 px-1 uppercase tracking-wider">
            Preferences
          </h3>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-[var(--color-surface-elevated)] transition-colors text-left border-b border-[var(--color-border)]"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] shrink-0">
                  <MoonIcon size={20} />
                </div>
                <div>
                  <p className="font-semibold text-[15px]">Appearance</p>
                  <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                    {theme === "dark" ? "Dark Theme" : "Light Theme"}
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 text-xs font-bold rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                Toggle
              </div>
            </button>

            {settingsItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`flex items-center justify-between p-4 hover:bg-[var(--color-surface-elevated)] transition-colors ${
                    idx !== settingsItems.length - 1
                      ? "border-b border-[var(--color-border)]"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] shrink-0">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-[15px]">{item.label}</p>
                      <p className="text-[13px] text-[var(--color-text-muted)] mt-0.5">
                        {item.sub}
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon
                    size={20}
                    className="text-[var(--color-text-muted)] shrink-0"
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full py-3.5 rounded-2xl border-2 border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <LogOutIcon size={18} className="shrink-0" />{" "}
            {isSigningOut ? "Signing Out..." : "Log Out"}
          </button>
        </div>

        {/* Spacer to clear BottomNav */}
        <div className="h-32 pb-safe" />
      </main>

      <BottomNav />

      <SwitchAccountModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />

      <CreateProfileModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
