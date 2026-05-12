"use client";

import SwitchAccountModal from "@/components/SwitchAccountModal";
import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/components/AppProvider";
import BottomNav from "@/components/BottomNav";
import {
  LockIcon,
  HelpCircleIcon,
  PhoneIcon,
  MailIcon,
  MoonIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@/components/Icons";
import { Bell, Settings2,Users2 } from "lucide-react";
export default function OrgSettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { activeOrganization: organization } = useApp();
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const orgName = organization?.name || "Organization";
  const orgInitial = orgName.trim().charAt(0).toUpperCase() || "O";
  const contactEmail =
    typeof organization?.contactEmail === "string" &&
    organization.contactEmail.trim()
      ? organization.contactEmail
      : "No email added";
  const contactPhone =
    typeof organization?.contactPhone === "string" &&
    organization.contactPhone.trim()
      ? organization.contactPhone
      : "No phone added";

  const orgSettingsItems = [
    {
      href: "/org/settings/notifications",
      icon: Bell,
      label: "Notifications",
      sub: "Manage preferences",
    },
    {
      href: "/org/settings/preferences",
      icon: Settings2,
      label: "Settings",
      sub: "App preferences",
    },
    {
      href: "/org/settings/members",
      icon: Users2,
      label: "Organization Members",
      sub: "Add or remove members",
    },
    {
      href: "/org/settings/privacy",
      icon: LockIcon,
      label: "Privacy & Policy",
      sub: "Control your settings",
    },
    {
      href: "/org/settings/help",
      icon: HelpCircleIcon,
      label: "Help & Support",
      sub: "Connect with support team",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] flex flex-col">
      <header className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="flex items-center h-14 px-5">
          <button
            type="button"
            onClick={() => setShowSwitchModal(true)}
            className="flex items-center gap-1.5 font-bold text-[17px] tracking-tight hover:opacity-80 transition-opacity"
            aria-expanded={showSwitchModal}
          >
            Profile Switcher
            <ChevronDownIcon
              size={18}
              className="text-[var(--color-text-muted)] mt-0.5 shrink-0"
            />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 pb-safe px-4 pt-6 space-y-8 overflow-y-auto">
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex flex-shrink-0 items-center justify-center text-white text-2xl font-bold overflow-hidden border border-[var(--color-border)]">
              {organization?.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt="Organization logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                orgInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{orgName}</h2>
              <div className="mt-1 space-y-1 text-sm text-[var(--color-text-muted)]">
                <p className="flex items-center gap-2 truncate">
                  <PhoneIcon
                    size={14}
                    className="shrink-0 text-[var(--color-text)]"
                  />{" "}
                  {contactPhone}
                </p>
                <p className="flex items-center gap-2 truncate">
                  <MailIcon
                    size={14}
                    className="shrink-0 text-[var(--color-text)]"
                  />{" "}
                  {contactEmail}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/org/profile/edit"
            className="mt-5 block w-full py-2.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] text-center font-semibold text-[15px] hover:bg-[var(--color-border)] transition-colors"
          >
            Edit Organization Profile
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

            {orgSettingsItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className={`flex items-center justify-between p-4 hover:bg-[var(--color-surface-elevated)] transition-colors ${
                    idx !== orgSettingsItems.length - 1
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
      </main>

      <BottomNav />

      <SwitchAccountModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />
    </div>
  );
}
