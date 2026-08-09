"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  TrashIcon,
  PhoneIcon,
  MailIcon,
} from "@/components/Icons";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { teamApi } from "@/lib/api/teamApi";
import { useApp } from "@/components/AppProvider";
import { TournamentData, EventData } from "@/lib/models";
import { QRCodeSVG } from "qrcode.react";
import {
  saveAuthRedirect,
  withAuthRedirect,
} from "@/lib/authRedirect";

function getTournamentLogoUrl(tournament?: TournamentData | null) {
  if (!tournament) return null;
  const raw = tournament as any;
  return (
    tournament.logoUrl ||
    raw?.logoURL ||
    raw?.logo ||
    raw?.imageUrl ||
    raw?.image ||
    null
  );
}

export default function TournamentCheckoutScreen() {
  const [completed, setCompleted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: isAuthLoading, userProfile, session } = useApp();
  const INR = "\u20B9";

  const tournamentId = searchParams.get("id");
  const selectedEventIds = useMemo(
    () => searchParams.get("selected")?.split(",").filter(Boolean) || [],
    [searchParams],
  );

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await tournamentApi.getInfo(tournamentId);
        setTournament(data);
      } catch (err) {
        console.error("Failed to load checkout data", err);
      } finally {
        setIsLoading(false);
      }
    };
    void loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (isAuthLoading) return;

    const nextPath = saveAuthRedirect("/home");
    if (!session?.user) {
      router.replace(withAuthRedirect("/login", nextPath));
      return;
    }
    if (!userProfile) {
      router.replace(withAuthRedirect("/register", nextPath));
    }
  }, [isAuthLoading, router, session?.user, userProfile]);

  const selectedEvents = useMemo(() => {
    if (!tournament?.events) return [];
    return tournament.events.filter(
      (ev) => ev.id && selectedEventIds.includes(ev.id),
    );
  }, [tournament, selectedEventIds]);

  const isOnlinePayment = (ev: EventData) => {
    const code = ev.paymentModeCode?.toLowerCase() || "";
    const label = ev.paymentMode?.label?.toLowerCase() || "";
    return (
      code.includes("online") ||
      label.includes("online") ||
      code.includes("upi") ||
      label.includes("upi")
    );
  };

  const totals = useMemo(() => {
    return selectedEvents.reduce(
      (acc, ev) => {
        const amt = ev.amount || 0;
        acc.total += amt;
        if (isOnlinePayment(ev)) {
          acc.online += amt;
        } else {
          acc.venue += amt;
        }
        return acc;
      },
      { total: 0, online: 0, venue: 0 },
    );
  }, [selectedEvents]);

  const upiUrl = useMemo(() => {
    if (!tournament?.upiId || totals.online <= 0) return "";
    const name = encodeURIComponent(tournament.name);
    return `upi://pay?pa=${tournament.upiId}&pn=${name}&am=${totals.online}&cu=INR`;
  }, [tournament, totals.online]);

  const handleConfirmRegistration = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      const nextPath = saveAuthRedirect("/home");
      router.replace(withAuthRedirect("/login", nextPath));
      return;
    }

    if (!userProfile) {
      const nextPath = saveAuthRedirect("/home");
      router.replace(withAuthRedirect("/register", nextPath));
      return;
    }

    if (selectedEvents.length === 0) {
      alert("No events selected for registration.");
      return;
    }

    try {
      setIsRegistering(true);

      for (const ev of selectedEvents) {
        if (!ev.id) continue;

        // Fetch the existing team for this event (created in the detail page)
        const team = await teamApi.getMyTeam(ev.id).catch(() => null);

        if (!team || !team.id) {
          console.error(`No team found for event ${ev.name}`);
          continue; // Skip if no team found, or throw if mandatory
        }

        // Update the team state to registered
        await teamApi.updateTeamState(team.id, "registered");
      }

      setCompleted(true);
    } catch (err) {
      console.error("Registration failed", err);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already registered")) {
        alert(
          "You are already registered for one or more of these events. Please go back and check your registrations.",
        );
      } else {
        alert(message || "Registration failed. Please try again.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading || isAuthLoading || !session?.user || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff7a1a] border-t-transparent"></div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#22c55e]/20 text-[#22c55e] shadow-lg shadow-green-500/20">
            <CheckCircleIcon size={64} />
          </div>
          <h1 className="mt-8 text-3xl font-bold">Registration Completed</h1>
          <p className="mt-4 text-[16px] text-[var(--color-text-secondary)] leading-relaxed">
            You are on the waiting list now.
            <br />
            For further info Contact your tournament Organizer.
          </p>

          <div className="mt-8 space-y-3">
            <a
              href={`tel:${tournament?.contactPhone}`}
              className="flex items-center justify-center gap-2 text-[#ff7a1a] font-bold text-[18px]"
            >
              <PhoneIcon size={20} />
              {tournament?.contactPhone}
            </a>
          </div>

          <Link
            href="/home"
            className="mt-12 flex h-14 items-center justify-center rounded-full bg-[#ff7a1a] px-8 text-[18px] font-bold text-white shadow-lg active:scale-95 transition-transform"
          >
            Go Home
            <ChevronRightIcon size={18} className="ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-32 text-[var(--color-text)]">
      <div className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),16px)]">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="grid h-10 w-10 place-content-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="text-2xl font-bold">Confirm Your Spot</h1>
        </div>

        {/* Tournament Info */}
        <div className="mt-8 flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm">
            {getTournamentLogoUrl(tournament) ? (
              <img
                src={getTournamentLogoUrl(tournament) || ""}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[var(--color-text-secondary)]">
                SOFT
              </div>
            )}
          </div>
          <div>
            <h2 className="text-[20px] font-bold leading-tight">
              {tournament?.name}
            </h2>
            <p className="text-[14px] text-[var(--color-text-secondary)] opacity-60">
              {tournament?.organization?.name}
            </p>
          </div>
        </div>

        {/* Selected Events */}
        <section className="mt-8">
          <h3 className="text-[18px] font-bold text-[var(--color-text-secondary)] uppercase tracking-widest opacity-60">
            Your Registrations
          </h3>
          <div className="mt-4 space-y-4">
            {selectedEvents.map((ev) => {
              const online = isOnlinePayment(ev);
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 relative group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold text-white ${online ? "bg-[#22c55e]" : "bg-[#f97316]"}`}
                    >
                      {ev.paymentMode?.label ||
                        (online ? "PAY ONLINE" : "PAY AT VENUE")}
                    </span>
                    <button className="text-[var(--color-text-secondary)] hover:text-red-500 transition-colors opacity-60">
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-[18px] font-bold">{ev.name}</p>
                    <p className="text-[22px] font-extrabold text-[#ff7a1a]">
                      <span className="currency-inr mr-0.5">{INR}</span>
                      {ev.amount}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Payment Summary */}
        <section className="mt-8 space-y-3 border-t border-[var(--color-border)] pt-6">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="text-[16px] font-medium">Total Fees</span>
            <span className="text-[18px] font-bold text-[var(--color-text)]">
              <span className="currency-inr mr-1">{INR}</span>
              {totals.total}
            </span>
          </div>
          {totals.venue > 0 && (
            <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
              <span className="text-[16px] font-medium">Pay at Venue</span>
              <span className="text-[18px] font-bold text-[#f97316]">
                -<span className="currency-inr mr-1">{INR}</span>
                {totals.venue}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[22px] font-bold">To Pay Now</span>
            <span className="text-[28px] font-black text-[#ff7a1a]">
              <span className="currency-inr mr-1">{INR}</span>
              {totals.online}
            </span>
          </div>
        </section>

        {/* UPI Section */}
        {tournament?.upiId && totals.online > 0 && (
          <section className="mt-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl bg-[var(--color-surface-elevated)] p-4 shadow-xl">
              <QRCodeSVG value={upiUrl} size={144} />
            </div>
            <p className="mt-4 text-[16px] font-bold">
              Scan to pay{" "}
              <span className="text-[#ff7a1a]">
                <span className="currency-inr">{INR}</span>
                {totals.online}
              </span>
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)] font-medium opacity-60">
              UPI ID: {tournament.upiId}
            </p>
          </section>
        )}

        {/* Notice */}
        <section className="mt-6 rounded-2xl border border-[#ff7a1a]/20 bg-[#ff7a1a]/10 p-4">
          <p className="text-[15px] font-bold text-[#ff7a1a]">
            Payment Verification
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-secondary)] leading-relaxed opacity-80">
            {totals.online > 0
              ? "Please share the transaction receipt with the organizer after successful payment to confirm your spot."
              : "Please ensure you have the registration fee ready to pay at the venue desk."}
          </p>
        </section>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-background)] p-5 pb-[max(env(safe-area-inset-bottom),20px)]">
        <button
          onClick={handleConfirmRegistration}
          disabled={isRegistering}
          className="flex h-16 w-full items-center justify-center rounded-full bg-[#ff811f] text-[20px] font-bold text-white shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70 disabled:active:scale-100"
        >
          {isRegistering ? (
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
          ) : (
            <>
              Confirm Registration
              <ChevronRightIcon size={20} className="ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
