"use client";

import SwitchAccountModal from "@/components/SwitchAccountModal";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import {
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HelpCircleIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  MoonIcon,
  PhoneIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/Icons";
import { useTheme } from "@/components/ThemeProvider";

function getStringField(
  source: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function getDisplayField(value: string, fallback = "Not added") {
  return value || fallback;
}

export default function OrgProfilePage() {
  const router = useRouter();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const {
    isLoading,
    activeOrganization: organization,
    userProfile: profile,
    logout,
  } = useApp();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };
  const orgName = organization?.name || "Organization";
  const orgType =
    typeof organization?.orgType === "object" &&
    organization.orgType !== null &&
    "name" in organization.orgType
      ? String(organization.orgType.name)
      : "Organization";
  const description = getStringField(organization as any, "description");
  const contactEmail = getStringField(organization as any, "contactEmail");
  const contactPhone = getStringField(organization as any, "contactPhone");
  const website = getStringField(organization as any, "website");
  const address = getStringField(organization as any, "address");
  const city = getStringField(organization as any, "city");
  const state = getStringField(organization as any, "state");
  const postalCode = getStringField(organization as any, "postalCode");
  const establishedYear =
    typeof organization?.establishedYear === "number"
      ? String(organization.establishedYear)
      : getStringField(organization as any, "establishedYear");
  const adminName = profile?.name || "Organizer";
  const orgInitial = orgName.trim().charAt(0).toUpperCase() || "O";
  const location = [city, state, postalCode].filter(Boolean).join(", ");

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowSwitchModal(true)}
            className="font-semibold text-[var(--color-text)] flex items-center gap-1"
            aria-expanded={showSwitchModal}
          >
            Organizer Profile
            <ChevronDownIcon size={16} className="text-[var(--color-muted)]" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg border border-[var(--color-border)] min-h-[44px] min-w-[44px] flex items-center justify-center text-xl font-medium"
            aria-label="Add"
          >
            +
          </button>
        </div>
        {isLoading ? (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Loading organization...
          </p>
        ) : null}
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0 overflow-hidden border border-[var(--color-border)]">
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
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate">{orgName}</h2>
              <p className="text-sm text-[var(--color-muted)] truncate">
                {orgType}
              </p>
              <p className="text-sm text-[var(--color-muted)] truncate">
                Admin: {adminName}
              </p>
              <p className="text-sm text-[var(--color-muted)] truncate">
                {getDisplayField(contactPhone, "No phone added")}
              </p>
              <p className="text-sm text-[var(--color-muted)] truncate">
                {getDisplayField(contactEmail, "No email added")}
              </p>
              <Link
                href="/org/profile/edit"
                className="mt-3 inline-flex min-h-[44px] px-4 py-2 rounded-[var(--radius-button)] bg-primary text-[var(--color-primary-contrast)] font-medium"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        <section className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-3">
            <BuildingIcon size={18} className="text-[var(--color-muted)]" />
            <h3 className="font-semibold">Organization Details</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[var(--color-muted)]">Description</p>
              <p className="mt-1 text-[var(--color-text)]">
                {getDisplayField(description, "No description added.")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[var(--color-muted)]">Type</p>
                <p className="mt-1 font-medium">{orgType}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted)]">Established</p>
                <p className="mt-1 font-medium">
                  {getDisplayField(establishedYear)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
          <h3 className="font-semibold mb-3">Contact</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MailIcon
                size={18}
                className="mt-0.5 text-[var(--color-muted)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-muted)]">Email</p>
                <p className="text-sm truncate">
                  {getDisplayField(contactEmail, "No email added")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <PhoneIcon
                size={18}
                className="mt-0.5 text-[var(--color-muted)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-muted)]">Phone</p>
                <p className="text-sm truncate">
                  {getDisplayField(contactPhone, "No phone added")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPinIcon
                size={18}
                className="mt-0.5 text-[var(--color-muted)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-muted)]">Address</p>
                <p className="text-sm">
                  {getDisplayField(address, "No address added.")}
                </p>
                {location ? (
                  <p className="text-sm text-[var(--color-muted)]">
                    {location}
                  </p>
                ) : null}
              </div>
            </div>
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[var(--radius-button)] border border-[var(--color-border)] px-4 py-3 text-center text-sm font-medium text-primary"
              >
                Visit Website
              </a>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
        >
          <div className="flex items-center gap-3">
            <MoonIcon size={20} className="text-[var(--color-muted)]" />
            <div className="text-left">
              <span className="font-medium">Theme</span>
              <p className="text-sm text-[var(--color-muted)]">
                {theme === "dark" ? "Dark" : "Light"} mode
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-sm">
            Switch
          </span>
        </button>
        <nav className="space-y-1" aria-label="Settings">
          {/* <Link
            href="/org/settings/notifications"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <BellIcon
              size={20}
              className="text-[var(--color-muted)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Notifications</span>
              <p className="text-sm text-[var(--color-muted)]">
                Manage preferences.
              </p>
            </div>
            <ChevronRightIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0"
            />
          </Link> */}
          <Link
            href="/org/settings/members"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <UsersIcon
              size={20}
              className="text-[var(--color-muted)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Organization Members</span>
              <p className="text-sm text-[var(--color-muted)]">
                Manage members.
              </p>
            </div>
            <ChevronRightIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0"
            />
          </Link>
          {/* <Link
            href="/org/settings/privacy"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <LockIcon
              size={20}
              className="text-[var(--color-muted)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Privacy &amp; Policy</span>
              <p className="text-sm text-[var(--color-muted)]">
                Control your settings.
              </p>
            </div>
            <ChevronRightIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0"
            />
          </Link>
          <Link
            href="/org/settings"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <SettingsIcon
              size={20}
              className="text-[var(--color-muted)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Settings</span>
              <p className="text-sm text-[var(--color-muted)]">
                App preferences.
              </p>
            </div>
            <ChevronRightIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0"
            />
          </Link> */}
          <Link
            href="/org/settings/help"
            className="flex items-center gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <HelpCircleIcon
              size={20}
              className="text-[var(--color-muted)] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="font-medium">Help &amp; Support</span>
              <p className="text-sm text-[var(--color-muted)]">
                Get support from our support team.
              </p>
            </div>
            <ChevronRightIcon
              size={18}
              className="text-[var(--color-muted)] shrink-0"
            />
          </Link>
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full min-h-[44px] rounded-[var(--radius-button)] bg-primary text-[var(--color-primary-contrast)] font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSigningOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      <SwitchAccountModal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
      />
    </Layout>
  );
}
