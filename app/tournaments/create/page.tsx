"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import TournamentWizard from "@/components/Wizard/TournamentWizard";
import type { TournamentData } from "@/lib/models";
import { tournamentApi } from "@/lib/api/tournamentApi";
import { eventApi } from "@/lib/api/eventApi";
import { storageApi } from "@/lib/api/storageApi";
import { useApp } from "@/components/AppProvider";
import { TournamentFormData } from "@/lib/validators/tournamentSchema";

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

export default function CreateTournamentPage() {
  const router = useRouter();
  const { activeOrganization } = useApp();
  const [isPublishing, setIsPublishing] = useState(false);

  const handleComplete = async (
    form: TournamentFormData,
    state: "created" | "draft",
  ) => {
    if (!activeOrganization?.id) {
      alert("Please select an organization first.");
      return;
    }

    try {
      setIsPublishing(true);

      const tournamentData: TournamentData = {
        organizationId: activeOrganization.id,
        name: form.name,
        description: form.description || "",
        startDate: form.startDate,
        endDate: form.endDate,
        venueName: form.venueName,
        venueAddress: form.addressLine,
        venueCity: form.city,
        venueState: form.state,
        venuePostalCode: form.zipCode,
        venueCourts: form.numCourts,
        contactName: form.organizerName,
        contactEmail: form.organizerEmail,
        contactPhone: normalizePhone(form.organizerPhone),
        upiId: form.upiId || null,
        tournamentState: "drafted",
      };

      const tournamentId = await tournamentApi.createTournament(tournamentData);

      if (form.logo instanceof File) {
        await storageApi.uploadTournamentLogo(form.logo, tournamentId);
      }

      if (form.events.length > 0) {
        await eventApi.createEvents(
          form.events.map((event) => ({
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
          })),
        );
      }

      if (state === "created") {
        await tournamentApi.updateTournamentState(tournamentId, "published");
      }

      router.push("/org/tournaments");
    } catch (error) {
      console.error("Failed to create tournament", error);
      alert(
        error instanceof Error ? error.message : "Failed to create tournament",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => router.push("/org/tournaments");

  return (
    <Layout showBottomNav={false}>
      <TournamentWizard
        onComplete={handleComplete}
        onClose={handleClose}
        isPublishing={isPublishing}
      />
    </Layout>
  );
}
