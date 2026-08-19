"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  TrophyIcon,
  ClipboardIcon,
  XIcon,
  MapPinIcon,
  ShieldIcon,
  WalletIcon,
  ZapIcon,
} from "@/components/Icons";
import { optionsApi } from "@/lib/api/optionsApi";
import { type OptionsData } from "@/lib/models";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const orgTypeIconMap: Record<string, IconComponent> = {
  educationalInstitute: GraduationCapIcon,
  sportsAcademy: ClipboardIcon,
  sportsClub: TrophyIcon,
  corporate: BuildingIcon,
  sportsVenue: MapPinIcon,
  federation: ShieldIcon,
  brandSponsor: ZapIcon,
  vendorSeller: WalletIcon,
};

const orgTypeDescriptionMap: Record<string, string> = {
  sportsClub: "A local club that runs regular matches, ladders, and weekend tournaments for members. Needs member management, recurring events, scheduling, and simple payments/refunds.",
  sportsAcademy: "A coaching-led organization managing batches, training schedules, and player progress. Needs players grouped into batches, attendance, coach notes, reports, and action plans.",
  educationalInstitute: "An institution onboarding students even when they don't have phones, using roll/admission numbers + parent contacts. Needs verified org status, controlled rosters, house teams, and inter-school tournament workflows. Similar to schools, but with more autonomy: college teams, fests, leagues, inter-college circuits. Needs team/department structure, tryouts, tournaments, and event operations across venues.",
  corporate: "A company running internal leagues and team-bonding sports events for employees. Needs corporate login/access control (often corporate email), employee-only tournaments, and simple onboarding.",
  sportsVenue: "A physical place that hosts matches/tournaments and wants higher occupancy. Needs venue profile, availability, booking/slot logic, and tournament court assignment.",
  federation: "An authority that sanctions tournaments and cares about rules + credibility. Needs verification workflows, standardized rule-set templates, certified scorer model, and dispute resolution.",
  brandSponsor: "A commercial partner funding tournaments or offering rewards/points/redemptions. Needs campaign targeting, measurable outcomes, and integration into tournament prize/sponsor flows.",
  vendorSeller: "A seller listing sports gear (and potentially rentals like nets/cameras) to your active user base. Needs catalog, local targeting, offer/coupon hooks, and possible loyalty redemption integration.",
};

function getOrgTypeIcon(code: string): IconComponent {
  return orgTypeIconMap[code] ?? BuildingIcon;
}

export default function OrgOnboardingPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
      <OrgOnboardingContent />
    </React.Suspense>
  );
}

function OrgOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orgTypes, setOrgTypes] = useState<OptionsData[]>([]);
  const [selected, setSelected] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const selectedFromQuery = searchParams.get("orgTypeCode");
    if (selectedFromQuery) {
      setSelected(selectedFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadOrgTypes = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await optionsApi.getOrgTypeOptions();
        if (!isMounted) return;

        setOrgTypes(data);
        setSelected((current) => {
          if (current && data.some((item) => item.code === current)) {
            return current;
          }
          return "";
        });
      } catch (error) {
        console.error("Failed to load organization types", error);
        if (isMounted) {
          setErrorMessage("Unable to load organization types right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrgTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGetStarted = () => {
    if (!selected) return;
    router.push(`/org/create?orgTypeCode=${encodeURIComponent(selected)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Step 1 of 3
          </p>
          <h1 className="font-semibold">Choose organization type</h1>
        </div>
        <Link
          href="/user/settings"
          className="p-2 hover:bg-[var(--color-surface-elevated)] rounded-lg"
          aria-label="Close organization setup"
        >
          <XIcon size={20} />
        </Link>
      </div>

      <div className="flex-1 p-4 pb-24">
        <p className="text-sm text-[var(--color-muted)] mb-6">
          Pick the organization type that best matches how you will use
          Forehand.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[76px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse"
              />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 text-sm font-semibold text-red-700"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orgTypes.map((type) => {
              const Icon = getOrgTypeIcon(type.code);
              const isSelected = selected === type.code;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelected(type.code)}
                  className={`w-full p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-[var(--color-surface-elevated)] text-[var(--color-text)]"
                    }`}
                  >
                    {isSelected ? (
                      <CheckIcon size={18} className="text-white" />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text)]">
                      {type.label}
                    </p>
                    <p className="text-sm text-[var(--color-muted)] mt-1">
                      {orgTypeDescriptionMap[type.code] || "This will shape your organization profile setup."}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={!selected || isLoading}
          className="w-full min-h-[52px] rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "var(--gradient-orange)" }}
        >
          Get Started
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
