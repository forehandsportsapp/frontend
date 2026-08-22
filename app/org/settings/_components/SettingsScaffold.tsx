"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { playerFAQs, orgFAQs } from "./faqData";
import Layout from "@/components/Layout";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  IconProps,
  InfoIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "@/components/Icons";

type OptionCardProps = {
  title: string;
  subtitle: string;
};

export function OptionCard({ title, subtitle }: OptionCardProps) {
  return (
    <section className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5">
      <p className="text-[12px] font-semibold">{title}</p>
      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{subtitle}</p>
    </section>
  );
}

type ToggleRowProps = {
  label: string;
  subtitle: string;
  on: boolean;
  onToggle: () => void;
};

export function ToggleRow({ label, subtitle, on, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
      aria-pressed={on}
    >
      <div>
        <p className="text-[14px] font-bold">{label}</p>
        <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{subtitle}</p>
      </div>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[#ff7a00]" : "bg-[var(--color-border)]"}`}
        aria-hidden
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm ${on ? "right-1" : "left-1"}`}
        />
      </span>
    </button>
  );
}


type SelectRowProps = {
  label: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
};

export function SelectRow({ label, subtitle, value, onChange, options }: SelectRowProps) {
  return (
    <div className="relative">
      <div className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-[14px] font-bold">{label}</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
        <ChevronDownIcon size={20} className="text-[var(--color-text-muted)]" />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type SettingsShellProps = {
  title: string;
  children: React.ReactNode;
};

export function SettingsShell({ title, children }: SettingsShellProps) {
  const router = useRouter();
  return (
    <Layout hideTopNav>
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col gap-5 px-4 pt-6 pb-24">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition-colors hover:bg-[var(--color-surface-elevated)]"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <h1 className="text-[22px] font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </Layout>
  );
}

export function HelpCard({ type = "user" }: { type?: "user" | "org" }) {
  const faqs = type === "user" ? playerFAQs : orgFAQs;

  return (
    <section className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm flex flex-col gap-4">
      <div className="rounded-[16px] bg-[var(--color-surface-elevated)] p-5 border border-[var(--color-border)]">
        <p className="text-[14px] font-bold">Contact Support</p>
        <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
          Need help? Our support team is available 24/7.
        </p>
        <div className="flex flex-col items-start gap-2 mt-4">
          <a
            href="mailto:forehandsportsapp@gmail.com"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-[#ff7a00] transition-colors hover:text-[#e66a00]"
          >
            Email Support &rarr;
          </a>
          <a
            href="tel:+919522195954"
            className="inline-flex items-center gap-1 text-[14px] font-bold text-[#ff7a00] transition-colors hover:text-[#e66a00]"
          >
            +91 9522195954 &rarr;
          </a>
        </div>
      </div>

      <div className="rounded-[16px] bg-[var(--color-surface-elevated)] p-5 border border-[var(--color-border)]">
        <p className="text-[14px] font-bold">FAQ</p>
        <div className="mt-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
          {faqs.map((faq, i) => (
            <details key={i} className="group border-b border-[var(--color-border)] pb-3 last:border-b-0">
              <summary className="flex cursor-pointer list-none items-start justify-between font-semibold text-[13px] text-[var(--color-text)]">
                <span className="pr-4">{faq.question}</span>
                <span className="transition-transform group-open:rotate-180 flex-shrink-0 text-[var(--color-text-muted)] mt-0.5">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M6 9l6 6 6-6"></path></svg>
                </span>
              </summary>
              <p className="text-[12px] text-[var(--color-text-muted)] mt-2 leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

type MemberRowProps = {
  name: string;
  onRemove: () => void;
};

export function MemberRow({ name, onRemove }: MemberRowProps) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex items-center justify-center">
          <span className="text-[16px] font-bold text-[var(--color-text-secondary)]">{name.charAt(0).toUpperCase()}</span>
        </div>
        <p className="text-[15px] font-semibold">{name}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50"
        aria-label={`Remove ${name}`}
      >
        <TrashIcon size={18} />
      </button>
    </li>
  );
}

export function AppVersionCard() {
  return (
    <section className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-bold text-[var(--color-text)]">App Version</span>
        <span className="text-[13px] text-[var(--color-text-muted)]">v1.0.4</span>
      </div>
      <button
        type="button"
        className="mt-6 block text-[14px] font-semibold text-red-500 transition-colors hover:text-red-600"
      >
        Delete Account
      </button>
    </section>
  );
}

type IntroWithIconProps = OptionCardProps & {
  icon?: React.ComponentType<IconProps>;
};

export function IntroWithIcon({ title, subtitle, icon: Icon }: IntroWithIconProps) {
  return (
    <section className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <div className="flex items-start gap-3">
        {Icon ? (
          <Icon size={18} className="mt-0.5 text-[var(--color-text)]" />
        ) : (
          <InfoIcon size={18} className="mt-0.5 text-[var(--color-text-muted)]" />
        )}
        <div>
          <p className="text-[14px] font-bold">{title}</p>
          <p className="mt-1 text-[12px] leading-tight text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}
