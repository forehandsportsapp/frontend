"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  TrophyIcon,
  XIcon,
} from "@/components/Icons";
import { tournamentApi, TournamentUpdatePayload } from "@/lib/api/tournamentApi";
import { storageApi } from "@/lib/api/storageApi";
import { TournamentData } from "@/lib/models";
import { sanitizeLogoUrl } from "@/lib/logo";

type TournamentSettingsForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueState: string;
  venuePostalCode: string;
  venueCourts: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

function toDateValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

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

function toForm(tournament: TournamentData): TournamentSettingsForm {
  return {
    name: tournament.name || "",
    description: tournament.description || "",
    startDate: toDateValue(tournament.startDate),
    endDate: toDateValue(tournament.endDate),
    venueName: tournament.venueName || "",
    venueAddress: tournament.venueAddress || "",
    venueCity: tournament.venueCity || "",
    venueState: tournament.venueState || "",
    venuePostalCode: tournament.venuePostalCode || "",
    venueCourts: tournament.venueCourts || 1,
    contactName: tournament.contactName || "",
    contactEmail: tournament.contactEmail || "",
    contactPhone: tournament.contactPhone || "",
  };
}

function toIsoOrNull(value: string) {
  return value ? new Date(value).toISOString() : null;
}

const settingsSchema = z.object({
  name: z
    .string()
    .min(3, "Tournament name must be at least 3 characters")
    .max(100),
  description: z.string().max(1000).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  venueName: z.string().min(2, "Venue name is required"),
  venueAddress: z.string().min(5, "Full address is required"),
  venueCity: z.string().min(2, "City is required"),
  venueState: z.string().min(2, "State is required"),
  venuePostalCode: z.string().regex(/^\d{6}$/, "Zip code must be 6 digits"),
  venueCourts: z.number().min(1, "At least 1 court is required"),
  contactName: z.string().min(2, "Organizer name is required"),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  contactEmail: z.string().email("Invalid email address"),
}).refine(
  (data) => {
    if (data.endDate && data.startDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: "Tournament end date must be after start date",
    path: ["endDate"],
  }
);


function TournamentSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("t") || "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [form, setForm] = useState<TournamentSettingsForm>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    venueName: "",
    venueAddress: "",
    venueCity: "",
    venueState: "",
    venuePostalCode: "",
    venueCourts: 1,
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [originalForm, setOriginalForm] = useState<TournamentSettingsForm | null>(
    null,
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!tournamentId) {
      setErrorMessage("Tournament id is missing.");
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setErrors({});
        const data = await tournamentApi.getInfo(tournamentId);
        if (!active) return;
        const nextForm = toForm(data);
        setTournament(data);
        setForm(nextForm);
        setOriginalForm(nextForm);
        setLogoFile(null);
        setLogoPreview(null);
        setImageFailed(false);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load tournament settings", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load tournament settings.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadTournament();
    return () => {
      active = false;
    };
  }, [tournamentId]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const logoUrl = logoPreview || sanitizeLogoUrl(tournament?.logoUrl);
  const hasLogo = Boolean(logoUrl) && !imageFailed;

  const hasFieldChanges = useMemo(() => {
    if (!originalForm) return false;
    return (
      form.name !== originalForm.name ||
      form.description !== originalForm.description ||
      form.startDate !== originalForm.startDate ||
      form.endDate !== originalForm.endDate ||
      form.venueName !== originalForm.venueName ||
      form.venueAddress !== originalForm.venueAddress ||
      form.venueCity !== originalForm.venueCity ||
      form.venueState !== originalForm.venueState ||
      form.venuePostalCode !== originalForm.venuePostalCode ||
      Number(form.venueCourts) !== Number(originalForm.venueCourts) ||
      form.contactName !== originalForm.contactName ||
      form.contactEmail !== originalForm.contactEmail ||
      form.contactPhone !== originalForm.contactPhone
    );
  }, [form, originalForm]);

  useEffect(() => {
    const validationResult = settingsSchema.safeParse({
      ...form,
      venueCourts: Number(form.venueCourts),
    });
    const currentIssues: Record<string, string> = {};
    if (!validationResult.success) {
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (path) currentIssues[path] = issue.message;
      });
    }

    setErrors((prevErrors) => {
      if (Object.keys(prevErrors).length === 0) return prevErrors;
      const updatedErrors = { ...prevErrors };
      let changed = false;
      Object.keys(prevErrors).forEach((key) => {
        if (!currentIssues[key]) {
          delete updatedErrors[key];
          changed = true;
        } else if (currentIssues[key] !== prevErrors[key]) {
          updatedErrors[key] = currentIssues[key];
          changed = true;
        }
      });
      return changed ? updatedErrors : prevErrors;
    });
  }, [form]);

  const isDirty = hasFieldChanges || Boolean(logoFile);

  const updateField = <K extends keyof TournamentSettingsForm>(
    key: K,
    value: TournamentSettingsForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setImageFailed(false);
    event.target.value = "";
  };

  const handleDiscard = () => {
    if (!originalForm) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setForm(originalForm);
    setLogoFile(null);
    setLogoPreview(null);
    setImageFailed(false);
    setErrorMessage("");
    setErrors({});
  };

  const buildPayload = () => {
    if (!originalForm) return {};
    const payload: TournamentUpdatePayload = {};

    if (form.name !== originalForm.name) payload.name = form.name.trim();
    if (form.description !== originalForm.description) {
      payload.description = form.description.trim();
    }
    if (form.startDate !== originalForm.startDate) {
      payload.startDate = new Date(form.startDate).toISOString();
    }
    if (form.endDate !== originalForm.endDate) {
      payload.endDate = toIsoOrNull(form.endDate);
    }
    if (form.venueName !== originalForm.venueName) {
      payload.venueName = form.venueName.trim();
    }
    if (form.venueAddress !== originalForm.venueAddress) {
      payload.venueAddress = form.venueAddress.trim();
    }
    if (form.venueCity !== originalForm.venueCity) {
      payload.venueCity = form.venueCity.trim();
    }
    if (form.venueState !== originalForm.venueState) {
      payload.venueState = form.venueState.trim();
    }
    if (form.venuePostalCode !== originalForm.venuePostalCode) {
      payload.venuePostalCode = form.venuePostalCode.trim();
    }
    if (Number(form.venueCourts) !== Number(originalForm.venueCourts)) {
      payload.venueCourts = Number(form.venueCourts);
    }
    if (form.contactName !== originalForm.contactName) {
      payload.contactName = form.contactName.trim();
    }
    if (form.contactEmail !== originalForm.contactEmail) {
      payload.contactEmail = form.contactEmail.trim();
    }
    if (form.contactPhone !== originalForm.contactPhone) {
      payload.contactPhone = normalizePhone(form.contactPhone);
    }

    return payload;
  };

  const handleSave = async () => {
    if (!tournamentId || !originalForm) return;

    setErrors({});
    const validationResult = settingsSchema.safeParse({
      ...form,
      venueCourts: Number(form.venueCourts),
    });

    if (!validationResult.success) {
      const newErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (path && !newErrors[path]) {
          newErrors[path] = issue.message;
        }
      });
      setErrors(newErrors);
      setErrorMessage("Please correct the errors in the form.");
      return;
    }

    const payload = buildPayload();

    try {
      setIsSaving(true);
      setErrorMessage("");

      if (logoFile) {
        await storageApi.uploadTournamentLogo(logoFile, tournamentId);
      }
      if (Object.keys(payload).length > 0) {
        await tournamentApi.updateTournament(tournamentId, payload);
      }

      const updated = await tournamentApi.getInfo(tournamentId);
      const nextForm = toForm(updated);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setTournament(updated);
      setForm(nextForm);
      setOriginalForm(nextForm);
      setLogoFile(null);
      setLogoPreview(null);
      setImageFailed(false);
    } catch (error) {
      console.error("Failed to save tournament settings", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTournament = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage("");
      await tournamentApi.deleteTournament(tournamentId);
      router.push("/org/tournaments");
    } catch (error) {
      console.error("Failed to delete tournament", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete tournament.",
      );
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-32 text-[var(--color-text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => router.back()}
            className="grid h-10 w-10 place-content-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            aria-label="Back"
          >
            <ArrowLeftIcon size={20} />
          </button>
          <h1 className="text-[20px] font-bold">Tournament Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        {errorMessage ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <section className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative h-28 w-28 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
            aria-label="Update tournament logo"
          >
            {hasLogo ? (
              <img
                src={logoUrl || ""}
                alt="Tournament logo"
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--color-muted)]">
                <TrophyIcon size={34} />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon size={24} />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
        </section>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Tournament Name <span className="text-red-500">*</span>
          </span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={`h-12 w-full rounded-2xl border ${errors.name ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name}</p>}
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Description
          </span>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={5}
            className={`w-full resize-none rounded-2xl border ${errors.description ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 py-3 text-[15px] font-medium leading-relaxed text-[var(--color-text)] outline-none focus:border-primary`}
          />
          {errors.description && <p className="text-xs text-red-500 mt-1 ml-1">{errors.description}</p>}
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Start <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => updateField("startDate", event.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={`h-12 w-full rounded-2xl border ${errors.startDate ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-3 text-[13px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.startDate && <p className="text-xs text-red-500 mt-1 ml-1">{errors.startDate}</p>}
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              End
            </span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => updateField("endDate", event.target.value)}
              min={form.startDate || new Date().toISOString().split("T")[0]}
              className={`h-12 w-full rounded-2xl border ${errors.endDate ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-3 text-[13px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.endDate && <p className="text-xs text-red-500 mt-1 ml-1">{errors.endDate}</p>}
          </label>
        </div>

        {/* Venue Details Section */}
        <div className="pt-6 border-t border-[var(--color-border)] space-y-5">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Venue Details</h2>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Venue Name <span className="text-red-500">*</span>
            </span>
            <input
              value={form.venueName}
              onChange={(event) => updateField("venueName", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.venueName ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.venueName && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venueName}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Venue Address <span className="text-red-500">*</span>
            </span>
            <input
              value={form.venueAddress}
              onChange={(event) => updateField("venueAddress", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.venueAddress ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.venueAddress && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venueAddress}</p>}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                City <span className="text-red-500">*</span>
              </span>
              <input
                value={form.venueCity}
                onChange={(event) => updateField("venueCity", event.target.value)}
                className={`h-12 w-full rounded-2xl border ${errors.venueCity ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
              />
              {errors.venueCity && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venueCity}</p>}
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                State <span className="text-red-500">*</span>
              </span>
              <select
                value={form.venueState}
                onChange={(event) => updateField("venueState", event.target.value)}
                className={`h-12 w-full rounded-2xl border ${errors.venueState ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
              >
                <option value="">Select State</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                <option value="Delhi">Delhi</option>
                <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                <option value="Ladakh">Ladakh</option>
                <option value="Lakshadweep">Lakshadweep</option>
                <option value="Puducherry">Puducherry</option>
              </select>
              {errors.venueState && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venueState}</p>}
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Zip Code <span className="text-red-500">*</span>
            </span>
            <input
              value={form.venuePostalCode}
              onChange={(event) => updateField("venuePostalCode", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.venuePostalCode ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.venuePostalCode && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venuePostalCode}</p>}
          </label>
          
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Number of Courts <span className="text-red-500">*</span>
            </span>
            <div className="flex h-12 items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => updateField("venueCourts", Math.max(1, Number(form.venueCourts) - 1))}
                className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition text-lg font-bold flex items-center justify-center"
              >
                −
              </button>
              <span className="text-2xl font-extrabold text-[var(--color-text)] min-w-[30px] text-center">
                {form.venueCourts}
              </span>
              <button
                type="button"
                onClick={() => updateField("venueCourts", Number(form.venueCourts) + 1)}
                className="w-10 h-10 rounded-xl bg-primary text-white hover:opacity-90 transition text-lg font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
            {errors.venueCourts && <p className="text-xs text-red-500 mt-1 ml-1">{errors.venueCourts}</p>}
          </label>
        </div>

        {/* Organizer Details Section */}
        <div className="pt-6 border-t border-[var(--color-border)] space-y-5">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Organizer Details</h2>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Organizer Name <span className="text-red-500">*</span>
            </span>
            <input
              value={form.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.contactName ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.contactName && <p className="text-xs text-red-500 mt-1 ml-1">{errors.contactName}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Organizer Phone <span className="text-red-500">*</span>
            </span>
            <input
              value={form.contactPhone}
              onChange={(event) => updateField("contactPhone", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.contactPhone ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.contactPhone && <p className="text-xs text-red-500 mt-1 ml-1">{errors.contactPhone}</p>}
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Organizer Email <span className="text-red-500">*</span>
            </span>
            <input
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
              className={`h-12 w-full rounded-2xl border ${errors.contactEmail ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] px-4 text-[15px] font-semibold text-[var(--color-text)] outline-none focus:border-primary`}
            />
            {errors.contactEmail && <p className="text-xs text-red-500 mt-1 ml-1">{errors.contactEmail}</p>}
          </label>
        </div>

        {/* Delete Tournament Button Section */}
        <div className="pt-6 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full h-12 rounded-2xl bg-[#c94141] hover:bg-[#b03535] text-white active:scale-[0.98] transition font-bold text-[15px]"
          >
            Delete Tournament
          </button>
        </div>
      </main>

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[#f7f7f7] dark:bg-[#4e3c6c] p-3 dark:text-white shadow-2xl">
            <p className="min-w-0 flex-1 text-sm font-semibold">
              You have unsaved changes.
            </p>
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="grid h-10 w-10 place-content-center rounded-full bg-white/10 dark:text-white transition-colors hover:bg-white/15 disabled:opacity-50"
              aria-label="Discard changes"
            >
              <XIcon size={18} />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-10 items-center gap-2 rounded-full bg-[#22c55e] px-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <CheckIcon size={16} />
              {isSaving ? "Saving" : "Save"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[3px]"
          />

          {/* Dialog Container */}
          <div className="relative z-10 w-full max-w-sm rounded-[24px] bg-[var(--color-surface)] border border-[var(--color-border)] p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-[var(--color-text)]">
              Are you sure?
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              Are you sure you want to delete this tournament? This action is permanent and <strong className="text-red-500">deleted tournaments cannot be recovered</strong>.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] font-bold text-[14px] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTournament}
                disabled={isDeleting}
                className="flex-1 h-12 rounded-2xl bg-[#c94141] font-bold text-[14px] text-white hover:bg-[#b03535] transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting</span>
                  </span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TournamentSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <TournamentSettingsContent />
    </Suspense>
  );
}
