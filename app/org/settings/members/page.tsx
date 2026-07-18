"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { inviteApi } from "@/lib/api/inviteApi";
import { notificationApi } from "@/lib/api/notificationApi";
import { HierarchyIcon } from "@/components/Icons";
import {
  IntroWithIcon,
  MemberRow,
  SettingsShell,
} from "../_components/SettingsScaffold";

type OrganizationMemberInvite = {
  id: string;
  name?: string;
  phone?: string;
  status?: string;
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 10) return digits.slice(-10);
  return digits.slice(-10);
}

export default function OrgMembersPage() {
  const { activeOrganization, isLoading } = useApp();

  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [members, setMembers] = useState<OrganizationMemberInvite[]>([]);

  useEffect(() => {
    let active = true;
    const organizationId = activeOrganization?.id;
    if (!organizationId || isLoading) return;

    const loadInvites = async () => {
      try {
        const rows =
          await inviteApi.getOrganizationMemberInvites(organizationId);
        if (!active) return;
        setMembers(rows);
      } catch {
        if (!active) return;
        setMembers([]);
        setFeedback(
          "Organization member invite list API is not available yet.",
        );
      }
    };

    void loadInvites();

    return () => {
      active = false;
    };
  }, [activeOrganization?.id, isLoading]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const organizationId = activeOrganization?.id;
    if (!organizationId) {
      setFeedback("No active organization selected.");
      return;
    }

    const cleanPhone = normalizePhone(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFeedback("Enter a valid 10-digit Indian phone number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback("");
      const created = await inviteApi.sendOrganizationMemberInvite({
        phone: cleanPhone,
        organizationId,
      });

      try {
        await notificationApi.sendOrgInviteNotification({
          phone: cleanPhone,
          organizationId,
          organizationName: activeOrganization?.name || "the organization",
          role: "Admin",
        });
      } catch (err) {
        console.warn("Failed to send org invite notification", err);
      }

      const newInvite: OrganizationMemberInvite = {
        id: created.inviteId || created.id || String(Date.now()),
        name: created.receiverName || created.name || "",
        phone: created.receiverPhone || created.phone || cleanPhone,
        status: created.inviteState || created.status || "pending",
      };
      setMembers((prev) => [newInvite, ...prev]);
      setPhone("");
      setFeedback("Invitation sent successfully.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to send invitation right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (member: OrganizationMemberInvite) => {
    const organizationId = activeOrganization?.id;
    if (!organizationId) return;
    try {
      await inviteApi.removeOrganizationMemberInvite(member.id, organizationId);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setFeedback("Member invite removed.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to remove member invite.",
      );
    }
  };

  return (
    <SettingsShell title="Organization Members">
      <IntroWithIcon
        title="Manage Members"
        subtitle="Add or remove organization members"
      />

      <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <HierarchyIcon size={24} className="text-[var(--color-text)]" />
          <h2 className="text-[22px] font-bold">Add Members</h2>
        </div>

        <div className="mt-8">
          <p className="text-[14px] font-bold text-[var(--color-text)]">
            Add Members
          </p>
          <form onSubmit={handleAdd} className="mt-3">
            <div className="flex items-center gap-3">
              <input
                type="tel"
                placeholder="Enter Member's Phone No."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 flex-1 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff7a00] text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                aria-label="Add member"
              >
                <span className="text-2xl font-light leading-none">+</span>
              </button>
            </div>
            {feedback ? (
              <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                {feedback}
              </p>
            ) : null}
          </form>
        </div>

        <ul className="mt-8 flex flex-col gap-3">
          {members.map((m) => (
            <MemberRow
              key={m.id}
              name={m.name || m.phone || "Invited User"}
              onRemove={() => void handleRemove(m)}
            />
          ))}
        </ul>
      </section>
    </SettingsShell>
  );
}
