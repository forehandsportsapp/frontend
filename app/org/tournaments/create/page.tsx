"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import TournamentWizard from "@/components/Wizard/TournamentWizard";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { eventApi } from "@/lib/api/eventApi";
import { storageApi } from "@/lib/api/storageApi";
import type { TournamentFormData } from "@/lib/validators/tournamentSchema";
import type { TournamentData } from "@/lib/models";

function normalizePhone(value: string) {
  let clean = value.replace(/\D/g, "");
  if (clean.length > 10) {
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(-10);
    } else if (clean.length === 11 && clean.startsWith("0")) {
      clean = clean.slice(-10);
    }
  }
  return clean;
}

function mapGender(value: string): "male" | "female" | null {
  if (value === "male" || value === "female") return value;
  return null;
}

function mapPaymentModeCode(value: string | null | undefined, isFree: boolean) {
  if (isFree) return null;
  return value || null;
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapTournamentToFormData(tournament: TournamentData): TournamentFormData {
  return {
    name: tournament.name || "",
    description: tournament.description || "",
    startDate: toDateInputValue(tournament.startDate),
    endDate: toDateInputValue(tournament.endDate),
    logo: null,
    venueName: tournament.venueName || "",
    city: tournament.venueCity || "",
    state: tournament.venueState || "",
    addressLine: tournament.venueAddress || "",
    zipCode: tournament.venuePostalCode || "",
    numCourts: Number(tournament.venueCourts || 1),
    organizerName: tournament.contactName || "",
    organizerPhone: tournament.contactPhone || "",
    organizerEmail: tournament.contactEmail || "",
    upiId: tournament.upiId || "",
    events: (tournament.events ?? []).map((event) => ({
      id: event.id || undefined,
      name: event.name || "",
      sport: event.sportsOptionCode || event.sportsOption?.code || "",
      format: event.eventFormatCode || event.eventFormat?.code || "",
      regDueDate: toDateInputValue(event.dueDate),
      startDate: toDateInputValue(event.startDate),
      gender: event.gender || "mixed",
      partType: event.teamTypeCode || event.teamType?.code || "",
      sets: String(event.setsPerMatch || ""),
      points: String(event.pointsPerSet || ""),
      ageRestricted: toDateInputValue(event.playerBornAfter),
      isFree: Number(event.amount || 0) <= 0,
      paymentOption:
        Number(event.amount || 0) <= 0
          ? ""
          : event.paymentModeCode || event.paymentMode?.code || "",
      fee: String(event.amount || 0),
    })),
  };
}

export default function CreateOrgTournamentPage() {
  const router = useRouter();
  const { activeOrganization } = useApp();
  const activeOrgId = activeOrganization?.id ?? null;
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTournament, setDraftTournament] = useState<TournamentData | null>(
    null,
  );
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState("");
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("draftId");
    setDraftId(id);
  }, []);

  useEffect(() => {
    if (!draftId) return;

    let active = true;
    const loadDraft = async () => {
      try {
        setIsLoadingDraft(true);
        setDraftLoadError("");
        const tournament = await tournamentApi.getInfo(draftId);
        if (!active) return;

        if (tournament.tournamentState !== "drafted") {
          setDraftLoadError("Only drafted tournaments can be completed here.");
          setDraftTournament(null);
          return;
        }

        setDraftTournament(tournament);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load draft tournament", error);
        setDraftLoadError(
          error instanceof Error ? error.message : "Unable to load draft.",
        );
      } finally {
        if (active) setIsLoadingDraft(false);
      }
    };

    void loadDraft();
    return () => {
      active = false;
    };
  }, [draftId]);

  const draftInitialData = useMemo(
    () => (draftTournament ? mapTournamentToFormData(draftTournament) : null),
    [draftTournament],
  );

  const handleComplete = async (
    tournament: TournamentFormData,
    state: "created" | "draft",
  ) => {
    if (submitInFlightRef.current) return;

    if (!activeOrgId) {
      alert("No active organization selected.");
      return;
    }

    try {
      submitInFlightRef.current = true;
      setIsPublishing(true);

      // 1. Create the tournament
      const tournamentData: TournamentData = {
        organizationId: activeOrgId,
        name: tournament.name,
        description: tournament.description || "",
        startDate: tournament.startDate,
        endDate: tournament.endDate || null,
        venueName: tournament.venueName,
        venueAddress: tournament.addressLine || "",
        venueCity: tournament.city,
        venueState: tournament.state,
        venuePostalCode: tournament.zipCode,
        venueCourts: tournament.numCourts,
        contactName: tournament.organizerName,
        contactEmail: tournament.organizerEmail,
        contactPhone: normalizePhone(tournament.organizerPhone),
        upiId: tournament.upiId || null,
        tournamentState: "drafted",
      };

      const tournamentId = draftId || (await tournamentApi.createTournament(tournamentData));

      if (draftId) {
        await tournamentApi.updateTournament(draftId, {
          name: tournamentData.name,
          description: tournamentData.description,
          startDate: tournamentData.startDate,
          endDate: tournamentData.endDate,
          venueName: tournamentData.venueName,
          venueAddress: tournamentData.venueAddress,
          venueCity: tournamentData.venueCity,
          venueState: tournamentData.venueState,
          venuePostalCode: tournamentData.venuePostalCode,
          venueCourts: tournamentData.venueCourts,
          contactName: tournamentData.contactName,
          contactEmail: tournamentData.contactEmail,
          contactPhone: tournamentData.contactPhone,
          upiId: tournamentData.upiId,
        });
      }

      // 2. Upload logo if provided
      if (tournament.logo && tournament.logo instanceof File) {
        await storageApi.uploadTournamentLogo(tournament.logo, tournamentId);
      }

      // 3. Create events
      if (tournament.events.length > 0) {
        const eventsData = tournament.events.map((event) => ({
          tournamentId,
          name: event.name.trim(),
          sportsOptionCode: event.sport,
          eventFormatCode: event.format,
          dueDate: event.regDueDate,
          startDate: event.startDate,
          gender: mapGender(event.gender),
          teamTypeCode: event.partType,
          setsPerMatch: Number(event.sets),
          pointsPerSet: Number(event.points),
          playerBornAfter: event.ageRestricted || null,
          paymentModeCode: mapPaymentModeCode(
            event.paymentOption,
            event.isFree,
          ),
          amount: event.isFree ? 0 : Number(event.fee || 0),
        }));

        const existingEventIds = new Set(
          (draftTournament?.events ?? [])
            .map((event) => event.id)
            .filter(Boolean) as string[],
        );
        const submittedEventIds = new Set(
          tournament.events
            .map((event) => (typeof event.id === "string" ? event.id : null))
            .filter(Boolean) as string[],
        );

        if (draftId) {
          await Promise.all(
            [...existingEventIds]
              .filter((eventId) => !submittedEventIds.has(eventId))
              .map((eventId) => eventApi.deleteEvent(eventId)),
          );

          await Promise.all(
            tournament.events.map((event, index) => {
              const eventPayload = eventsData[index];
              if (typeof event.id === "string") {
                return eventApi.updateEvent(event.id, eventPayload);
              }
              return eventApi.createEvents([eventPayload]);
            }),
          );
        } else {
          await eventApi.createEvents(eventsData);
        }
      }

      // 4. Publish if requested
      if (state === "created") {
        await tournamentApi.publishTournament(tournamentId);
      }

      router.push("/org/tournaments");
    } catch (error) {
      console.error("Failed to create tournament", error);
      alert(
        error instanceof Error ? error.message : "Failed to create tournament.",
      );
      submitInFlightRef.current = false;
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    router.push("/org/tournaments");
  };

  if (isLoadingDraft) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (draftLoadError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-6">
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
          {draftLoadError}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <TournamentWizard
        isPublishing={isPublishing}
        initialData={draftInitialData}
        initialStep={draftInitialData ? 4 : undefined}
        onComplete={handleComplete}
        onClose={handleClose}
      />
    </div>
  );
}
