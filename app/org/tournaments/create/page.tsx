"use client";

import React, { useState } from "react";
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

export default function CreateOrgTournamentPage() {
  const router = useRouter();
  const { activeOrganization } = useApp();
  const activeOrgId = activeOrganization?.id ?? null;
  const [isPublishing, setIsPublishing] = useState(false);

  const handleComplete = async (
    tournament: TournamentFormData,
    state: "created" | "draft",
  ) => {
    if (!activeOrgId) {
      alert("No active organization selected.");
      return;
    }

    try {
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

      const tournamentId = await tournamentApi.createTournament(tournamentData);

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

        await eventApi.createEvents(eventsData);
      }

      // 4. Publish if requested
      if (state === "created") {
        await tournamentApi.updateTournamentState(tournamentId, "published");
      }

      router.push("/org/tournaments");
    } catch (error) {
      console.error("Failed to create tournament", error);
      alert(
        error instanceof Error ? error.message : "Failed to create tournament.",
      );
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    router.push("/org/tournaments");
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <TournamentWizard
        isPublishing={isPublishing}
        onComplete={handleComplete}
        onClose={handleClose}
      />
    </div>
  );
}
