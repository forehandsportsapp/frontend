"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  UserIcon,
  XIcon,
} from "@/components/Icons";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useApp } from "./AppProvider";
import { organizationApi } from "@/lib/api/organizationApi";
import { OrganizationData } from "@/lib/models";

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AccountTileProps = {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  active?: boolean;
  trailing?: React.ReactNode;
  imageUrl?: string | null;
};

function AccountTile({
  href,
  onClick,
  icon,
  iconTone,
  title,
  subtitle,
  active = false,
  trailing,
  imageUrl,
}: AccountTileProps) {
  const content = (
    <div
      className={`flex items-center gap-3 rounded-[22px] border px-4 py-3.5 transition-colors ${
        active
          ? "border-primary bg-primary/10"
          : "border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div
        className={`grid h-11 w-11 shrink-0 place-content-center rounded-full overflow-hidden ${iconTone}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--color-text)]">
          {title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">
          {subtitle}
        </p>
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}

export default function SwitchAccountModal({
  isOpen,
  onClose,
}: SwitchAccountModalProps) {
  const dragControls = useDragControls();
  const { userProfile, activeOrganization, setOrganization } = useApp();
  const activeOrgId = activeOrganization?.id ?? null;
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<OrganizationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function fetchOrgs() {
      console.log(
        "[SwitchAccountModal] fetching organizations for current user",
      );
      try {
        const orgs = await organizationApi.getUserOrganizations();
        console.log("[SwitchAccountModal] organizations fetched", {
          count: Array.isArray(orgs) ? orgs.length : 0,
          orgIds: Array.isArray(orgs) ? orgs.map((org) => org.id) : [],
        });
        setOrgs(orgs);
      } catch (error) {
        console.error(
          "[SwitchAccountModal] failed to fetch organizations",
          error,
        );
      } finally {
        setIsLoading(false);
        console.log("[SwitchAccountModal] fetch organizations completed");
      }
    }

    fetchOrgs();
  }, [isOpen]);

  const isIndividualActive = pathname.startsWith("/user/");
  const userName = userProfile?.name || "User";
  const userInitials = userName.charAt(0).toUpperCase();
  const activeOrg = orgs.find(
    (org) => pathname.startsWith("/org/") && activeOrgId === org.id,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px]"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.85 }}
            onDragEnd={(event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 300) {
                onClose();
              }
            }}
            className="relative z-10 w-full max-w-md rounded-t-[28px] bg-[var(--color-surface)] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.16)] flex flex-col max-h-[85vh] max-h-[85dvh] overflow-hidden"
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 rounded-full bg-[var(--color-border)] opacity-50" />
            </div>

            {/* Header */}
            <div className="mt-4 flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3 shrink-0">
              <div className="flex items-start gap-2.5">
                <button
                  onClick={onClose}
                  className="p-1 mt-0.5 rounded-full hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] transition-colors"
                  aria-label="Close"
                >
                  <XIcon size={20} />
                </button>
                <div>
                  <h2 className="text-[20px] font-bold text-[var(--color-text)]">
                    Switch Account
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                    {activeOrg
                      ? "Choose the profile you want to continue with."
                      : "Pick your active profile for this session."}
                  </p>
                </div>
              </div>
              {activeOrg || isIndividualActive ? (
                <div className="rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary shrink-0">
                  Active
                </div>
              ) : null}
            </div>

            {/* Content List */}
            <div className="mt-4 space-y-3 overflow-y-auto hide-scrollbar pb-2">
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Personal
                </p>
                <AccountTile
                  href={isIndividualActive ? undefined : "/user/home"}
                  onClick={
                    isIndividualActive
                      ? undefined
                      : () => {
                          setOrganization(null);
                          onClose();
                        }
                  }
                  icon={
                    <UserIcon
                      size={18}
                      className={
                        isIndividualActive ? "text-[#ff8a24]" : "text-[#6b7280]"
                      }
                    />
                  }
                  iconTone={
                    isIndividualActive
                      ? "border border-primary/30 bg-primary/20"
                      : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                  }
                  title={userName}
                  subtitle="Individual profile"
                  active={isIndividualActive}
                  imageUrl={userProfile?.profilePicUrl}
                  trailing={
                    isIndividualActive ? (
                      <span className="grid h-6 w-6 place-content-center rounded-full bg-[#ff8a24] text-white">
                        <CheckIcon size={13} />
                      </span>
                    ) : (
                      <ChevronRightIcon
                        size={18}
                        className="text-[var(--color-text-muted)]"
                      />
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Organizations
                </p>
                {isLoading ? (
                  <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-center text-[13px] text-[var(--color-text-muted)] shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                    Loading organizations...
                  </div>
                ) : orgs.length === 0 ? (
                  <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-center text-[13px] text-[var(--color-text-muted)] shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
                    No organizations found yet.
                  </div>
                ) : (
                  orgs.map((org) => {
                    const isThisOrgActive =
                      pathname.startsWith("/org/") && activeOrgId === org.id;

                    return (
                      <AccountTile
                        key={org.id}
                        href={isThisOrgActive ? undefined : "/org/home"}
                        onClick={
                          isThisOrgActive
                            ? undefined
                            : () => {
                                setOrganization(org.id);
                                onClose();
                              }
                        }
                        icon={
                          <BuildingIcon
                            size={18}
                            className={
                              isThisOrgActive ? "text-[#ff8a24]" : "text-[#6b7280]"
                            }
                          />
                        }
                        iconTone={
                          isThisOrgActive
                            ? "border border-primary/30 bg-primary/20"
                            : "border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                        }
                        title={org.name}
                        subtitle={org.orgType?.label || "Organization"}
                        active={isThisOrgActive}
                        imageUrl={org.logoUrl}
                        trailing={
                          isThisOrgActive ? (
                            <span className="grid h-6 w-6 place-content-center rounded-full bg-[#ff8a24] text-white">
                              <CheckIcon size={13} />
                            </span>
                          ) : (
                            <ChevronRightIcon
                              size={18}
                              className="text-[var(--color-text-muted)]"
                            />
                          )
                        }
                      />
                    );
                  })
                )}
              </div>

              <Link
                href="/org/create"
                className="mt-2 flex items-center gap-3 rounded-[22px] border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-left shadow-sm"
                onClick={onClose}
              >
                <div className="grid h-11 w-11 shrink-0 place-content-center rounded-full bg-primary/20 text-[22px] font-light leading-none text-primary">
                  +
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[var(--color-text)]">
                    Add organization
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    Create or connect another profile
                  </p>
                </div>
                <ChevronRightIcon
                  size={18}
                  className="text-[var(--color-text-muted)]"
                />
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
