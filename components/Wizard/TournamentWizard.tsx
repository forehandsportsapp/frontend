"use client";

import React, { useState, useEffect } from "react";
import {
  XIcon,
  ImageIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  InfoIcon,
} from "@/components/Icons";
import {
  tournamentFormSchema,
  tournamentBaseSchema,
  type TournamentFormData,
} from "@/lib/validators/tournamentSchema";
import { optionsApi } from "@/lib/api/optionsApi";
import { OptionsData } from "@/lib/models";
import DatePicker from "@/components/DatePicker";

// --- CUSTOM ICONS FOR DATE PICKER ---
const CalendarIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
    style={{ pointerEvents: "none" }}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// --- REBUILT UI COMPONENTS ---

const InputError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1 ml-1">{message}</p>;
};

// 1. Native Styled Select
const NativeSelect = ({
  label,
  value,
  options,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  options: OptionsData[];
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
}) => (
  <div className="relative">
    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${error ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer font-medium`}
      >
        <option value="" disabled>
          {placeholder || `Select ${label}`}
        </option>
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[var(--color-muted)]">
        <ChevronRightIcon size={16} className="rotate-90" />
      </div>
    </div>
    <InputError message={error} />
  </div>
);

// 2. Clean, Premium Toggle Switch
const ToggleSwitch = ({ checked, onChange, label }: any) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-sm font-semibold text-[var(--color-text)]">
      {label}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
        checked
          ? "bg-primary shadow-[0_0_10px_rgba(255,107,0,0.4)]"
          : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

// 3. Custom Date Picker (Responsive Popover / Bottom Sheet)
const CustomDatePicker = (props: any) => {
  return <DatePicker {...props} />;
};

// --- MAIN COMPONENT ---

interface TournamentWizardProps {
  isPublishing?: boolean;
  onComplete: (
    tournament: TournamentFormData,
    state: "created" | "draft",
  ) => void;
  onClose: () => void;
}

export default function TournamentWizard({
  isPublishing = false,
  onComplete,
  onClose,
}: TournamentWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [showEventWarning, setShowEventWarning] = useState(false);
  const [hasSeenEventWarning, setHasSeenEventWarning] = useState(false);

  const [formData, setFormData] = useState<TournamentFormData>({
    // Step 1
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    logo: null,
    // Step 2
    venueName: "",
    city: "",
    state: "",
    addressLine: "",
    zipCode: "",
    numCourts: 1,
    organizerName: "",
    organizerPhone: "",
    organizerEmail: "",
    upiId: "",
    // Step 3
    events: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [sportsOpts, setSportsOpts] = useState<OptionsData[]>([]);
  const [formatOpts, setFormatOpts] = useState<OptionsData[]>([]);
  const [teamTypeOpts, setTeamTypeOpts] = useState<OptionsData[]>([]);
  const [paymentOpts, setPaymentOpts] = useState<OptionsData[]>([]);

  const genderOpts: OptionsData[] = [
    { id: 1, code: "male", label: "Men's" },
    { id: 2, code: "female", label: "Women's" },
    { id: 3, code: "mixed", label: "Mixed" },
  ];

  const setsOpts: OptionsData[] = [
    { id: 1, code: "1", label: "Best of 1" },
    { id: 2, code: "3", label: "Best of 3" },
    { id: 3, code: "5", label: "Best of 5" },
  ];

  const pointsOpts: OptionsData[] = [
    { id: 1, code: "11", label: "11" },
    { id: 2, code: "15", label: "15" },
    { id: 3, code: "21", label: "21" },
  ];

  useEffect(() => {
    if (step === 3 && !hasSeenEventWarning) {
      setShowEventWarning(true);
      setHasSeenEventWarning(true);
    }
  }, [step, hasSeenEventWarning]);

  useEffect(() => {
    const result = tournamentFormSchema.safeParse(formData);
    const currentIssues: Record<string, string> = {};
    if (!result.success) {
      result.error.issues.forEach((issue) => {
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
  }, [formData]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [sports, formats, teamTypes, payments] = await Promise.all([
          optionsApi.getSportsOptions(),
          optionsApi.getEventFormatOptions(),
          optionsApi.getTeamTypeOptions(),
          optionsApi.getPaymentModeOptions(),
        ]);
        setSportsOpts(sports);
        setFormatOpts(formats);
        setTeamTypeOpts(teamTypes);
        setPaymentOpts(payments);
      } catch (err) {
        console.error("Failed to fetch options", err);
      }
    };
    void fetchOptions();
  }, []);

  const collectErrors = (
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    const newErrors: Record<string, string> = {};
    issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (path && !newErrors[path]) {
        newErrors[path] = issue.message;
      }
    });
    return newErrors;
  };

  const validateStep = (currentStep: number) => {
    setErrors({});
    let stepSchema;

    if (currentStep === 1) {
      stepSchema = tournamentBaseSchema.pick({
        name: true,
        description: true,
        startDate: true,
        endDate: true,
        logo: true,
      });
    } else if (currentStep === 2) {
      stepSchema = tournamentBaseSchema.pick({
        venueName: true,
        city: true,
        state: true,
        addressLine: true,
        zipCode: true,
        numCourts: true,
        organizerName: true,
        organizerPhone: true,
        organizerEmail: true,
        upiId: true,
      });
    } else if (currentStep === 3) {
      stepSchema = tournamentBaseSchema.pick({
        events: true,
      });
    }

    if (stepSchema) {
      // Use the full schema for refinements if it's the last step or we need cross-field validation
      // But for steps, we can use partials.
      // Actually, refinements like startDate < endDate need both fields.
      const result = tournamentFormSchema.safeParse(formData);

      if (!result.success) {
        const newErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          // Only show errors for the current step's fields
          const isStepField =
            (currentStep === 1 &&
              ["name", "description", "startDate", "endDate"].includes(
                issue.path[0] as string,
              )) ||
            (currentStep === 2 &&
              [
                "venueName",
                "city",
                "state",
                "addressLine",
                "zipCode",
                "numCourts",
                "organizerName",
                "organizerPhone",
                "organizerEmail",
                "upiId",
              ].includes(issue.path[0] as string)) ||
            (currentStep === 3 && issue.path[0] === "events");

          if (isStepField) {
            const path = issue.path.join(".");
            if (path && !newErrors[path]) {
              newErrors[path] = issue.message;
            }
          }
        });

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleComplete = (state: "created" | "draft") => {
    const result = tournamentFormSchema.safeParse(formData);

    if (!result.success) {
      setErrors(collectErrors(result.error.issues));

      const firstPath = result.error.issues[0]?.path[0];
      if (
        firstPath &&
        ["name", "description", "startDate", "endDate", "logo"].includes(
          String(firstPath),
        )
      ) {
        setStep(1);
      } else if (
        firstPath &&
        [
          "venueName",
          "city",
          "state",
          "addressLine",
          "zipCode",
          "numCourts",
          "organizerName",
          "organizerPhone",
          "organizerEmail",
          "upiId",
        ].includes(String(firstPath))
      ) {
        setStep(2);
      } else {
        setStep(3);
      }
      return;
    }

    setErrors({});
    onComplete(result.data, state);
  };

  const addEvent = () => {
    setFormData((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          name: "",
          sport: "",
          format: "",
          regDueDate: "",
          startDate: "",
          gender: "",
          partType: "",
          sets: "",
          points: "",
          ageRestricted: "",
          isFree: true,
          paymentOption: "",
          fee: "0",
        },
      ],
    }));
  };

  const updateEvent = (index: number, field: string, value: any) => {
    const newEvents = [...formData.events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setFormData({ ...formData, events: newEvents });
  };

  const removeEvent = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="h-[100dvh] md:h-screen bg-[var(--color-background)] md:py-10 md:px-6 flex justify-center items-start font-sans overflow-hidden">
      {/* Container Column */}
      <div className="w-full max-w-3xl h-full md:h-auto md:max-h-[85vh] bg-[var(--color-surface)] md:rounded-2xl md:shadow-2xl md:border border-[var(--color-border)] flex flex-col relative overflow-hidden">
        {/* HEADER */}
        <div className="flex-none bg-[var(--color-surface)] border-b border-[var(--color-border)] p-5 flex items-center justify-between z-10">
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            Create Tournament
          </h1>
          <button
            onClick={onClose}
            className="p-2 bg-[var(--color-surface-elevated)] text-[var(--color-muted)] hover:text-[var(--color-text)] rounded-full transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* STEPPER */}
        <div className="flex-none px-6 pt-4 pb-2 z-10 bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${step >= i ? "bg-primary" : "bg-[var(--color-border)] opacity-50"}`}
              />
            ))}
          </div>
          <div className="mt-2 text-xs font-bold text-primary text-right tracking-wide">
            STEP {step} OF {totalSteps}
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8 animate-in fade-in duration-300 relative">
          {/* STEP 1: Tournament Info */}
          {step === 1 && (
            <div className="space-y-8 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                  Tournament Info
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Let's start with the basic details of your tournament.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Tournament Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Smash 2025"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.name ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none transition-all`}
                  />
                  <InputError message={errors.name} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your tournament's rules, format, or general info..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.description ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none resize-none transition-all`}
                  />
                  <InputError message={errors.description} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Tournament Logo
                  </label>
                  <label className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          logo: event.target.files?.[0] ?? null,
                        })
                      }
                    />
                    <ImageIcon
                      size={24}
                      className="mb-3 text-[var(--color-muted)]"
                    />
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {formData.logo
                        ? (formData.logo as File).name
                        : "Upload tournament logo"}
                    </span>
                    <span className="mt-1 text-xs text-[var(--color-muted)]">
                      PNG, JPG, or WebP
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h3 className="text-lg font-bold mb-4 text-[var(--color-text)]">
                    Timeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <CustomDatePicker
                        value={formData.startDate}
                        onChange={(date: string) =>
                          setFormData({ ...formData, startDate: date })
                        }
                        placeholder="Select start date"
                        error={errors.startDate}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        End Date
                      </label>
                      <CustomDatePicker
                        value={formData.endDate}
                        onChange={(date: string) =>
                          setFormData({ ...formData, endDate: date })
                        }
                        placeholder="Select end date"
                        error={errors.endDate}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Venue Details */}
          {step === 2 && (
            <div className="space-y-8 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                  Venue Details
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Where is the tournament taking place?
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Venue Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Andheri Sports Complex"
                    value={formData.venueName}
                    onChange={(e) =>
                      setFormData({ ...formData, venueName: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.venueName ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                  />
                  <InputError message={errors.venueName} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Mumbai"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.city ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                    />
                    <InputError message={errors.city} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Maharashtra"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.state ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                    />
                    <InputError message={errors.state} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Zip Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="000000"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.zipCode ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                    />
                    <InputError message={errors.zipCode} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                    Venue Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={formData.addressLine}
                    onChange={(e) =>
                      setFormData({ ...formData, addressLine: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.addressLine ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                  />
                  <InputError message={errors.addressLine} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      Number of Courts
                    </label>
                    <div className="inline-flex items-center gap-4">
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            numCourts: Math.max(1, formData.numCourts - 1),
                          })
                        }
                        className="w-9 h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition"
                      >
                        −
                      </button>
                      <span className="text-3xl font-extrabold text-[var(--color-text)] min-w-[40px] text-center">
                        {formData.numCourts}
                      </span>
                      <button
                        onClick={() =>
                          setFormData({
                            ...formData,
                            numCourts: formData.numCourts + 1,
                          })
                        }
                        className="w-9 h-9 rounded-lg bg-primary text-white hover:opacity-90 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--color-border)]">
                  <h3 className="text-lg font-bold mb-1 text-[var(--color-text)]">
                    Payment Information
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] mb-4 italic">
                    Note: UPI ID is not necessary if you don't want to create an
                    online payment option.
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. name@okhdfc"
                      value={formData.upiId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, upiId: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.upiId ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                    />
                    <InputError message={errors.upiId} />
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--color-border)]">
                  <h3 className="text-lg font-bold mb-4 text-[var(--color-text)]">
                    Organizer Info
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                        Organizer's Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Name"
                        value={formData.organizerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            organizerName: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.organizerName ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                      />
                      <InputError message={errors.organizerName} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={formData.organizerPhone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organizerPhone: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.organizerPhone ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                        />
                        <InputError message={errors.organizerPhone} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="Email"
                          value={formData.organizerEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organizerEmail: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors.organizerEmail ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                        />
                        <InputError message={errors.organizerEmail} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Create Events */}
          {step === 3 && (
            <div className="space-y-6 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                  Create Events
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Set up formats, rules, and entry fees for each category.
                </p>
              </div>

              {formData.events.length === 0 ? (
                <div className="text-center py-16 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-5">
                    <ImageIcon
                      size={20}
                      className="text-[var(--color-muted)]"
                    />
                  </div>
                  <p className="text-lg font-semibold text-[var(--color-text)]">
                    No events created yet
                  </p>
                  <p className="text-sm text-[var(--color-muted)] mt-1 mb-6">
                    Create your first event category to continue.
                  </p>
                  <button
                    onClick={addEvent}
                    className="px-6 py-3 rounded-xl font-semibold text-white shadow-md hover:scale-[1.02] transition-transform"
                    style={{ background: "var(--gradient-orange)" }}
                  >
                    + Add Event
                  </button>
                  <InputError message={errors.events} />
                </div>
              ) : (
                <div className="space-y-8">
                  {formData.events.map((event, index) => (
                    <div
                      key={index}
                      className="p-5 sm:p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm relative overflow-visible"
                    >
                      <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--color-border)]">
                        <h3 className="text-lg font-bold text-[var(--color-text)]">
                          Event {index + 1}
                        </h3>
                        <button
                          onClick={() => removeEvent(index)}
                          className="p-2 text-[var(--color-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>

                      <div className="space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                            Event Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Men's Singles Pro"
                            value={event.name}
                            onChange={(e) =>
                              updateEvent(index, "name", e.target.value)
                            }
                            className={`w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border ${errors[`events.${index}.name`] ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                          />
                          <InputError
                            message={errors[`events.${index}.name`]}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <NativeSelect
                            label="Sport"
                            value={event.sport}
                            options={sportsOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "sport", v)
                            }
                            error={errors[`events.${index}.sport`]}
                          />
                          <NativeSelect
                            label="Format"
                            value={event.format}
                            options={formatOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "format", v)
                            }
                            error={errors[`events.${index}.format`]}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                              Reg. Due Date{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <CustomDatePicker
                              value={event.regDueDate}
                              onChange={(date: string) =>
                                updateEvent(index, "regDueDate", date)
                              }
                              placeholder="Select Due Date"
                              error={errors[`events.${index}.regDueDate`]}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                              Event Start Date{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <CustomDatePicker
                              value={event.startDate}
                              onChange={(date: string) =>
                                updateEvent(index, "startDate", date)
                              }
                              placeholder="Select Start Date"
                              error={errors[`events.${index}.startDate`]}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <NativeSelect
                            label="Gender"
                            value={event.gender}
                            options={genderOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "gender", v)
                            }
                            error={errors[`events.${index}.gender`]}
                          />
                          <NativeSelect
                            label="Participation Type"
                            value={event.partType}
                            options={teamTypeOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "partType", v)
                            }
                            error={errors[`events.${index}.partType`]}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <NativeSelect
                            label="Sets Per Match"
                            value={event.sets}
                            options={setsOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "sets", v)
                            }
                            error={errors[`events.${index}.sets`]}
                          />
                          <NativeSelect
                            label="Points Per Set"
                            value={event.points}
                            options={pointsOpts}
                            onChange={(v: string) =>
                              updateEvent(index, "points", v)
                            }
                            error={errors[`events.${index}.points`]}
                          />
                        </div>

                        <div className="pt-4 border-t border-[var(--color-border)]">
                          <ToggleSwitch
                            label="Free Entry"
                            checked={event.isFree}
                            onChange={(val: boolean) =>
                              updateEvent(index, "isFree", val)
                            }
                          />
                        </div>

                        {!event.isFree && (
                          <div className="p-5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-5 animate-in fade-in duration-300">
                            <NativeSelect
                              label="Payment Option"
                              value={event.paymentOption || ""}
                              options={paymentOpts}
                              onChange={(v: string) =>
                                updateEvent(index, "paymentOption", v)
                              }
                              error={errors[`events.${index}.paymentOption`]}
                            />

                            <div>
                              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                                Entry Fee{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-3.5 text-[var(--color-muted)] font-bold">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  value={event.fee}
                                  onChange={(e) =>
                                    updateEvent(index, "fee", e.target.value)
                                  }
                                  className={`w-full pl-9 pr-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border ${errors[`events.${index}.fee`] ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary outline-none`}
                                />
                              </div>
                              <InputError
                                message={errors[`events.${index}.fee`]}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addEvent}
                    className="w-full flex items-center justify-center py-4 rounded-xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text)] font-semibold hover:border-primary hover:text-primary transition-colors bg-[var(--color-surface-elevated)]"
                  >
                    + Add Another Event
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review & Publish */}
          {step === 4 && (
            <div className="space-y-6 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                  Review & Publish
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Ensure everything looks correct before going live.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <h3 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-4 border-b border-[var(--color-border)] pb-2">
                    Tournament Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">Name</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">
                        Start Date
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.startDate || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <h3 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-4 border-b border-[var(--color-border)] pb-2">
                    Venue & Organizer
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">Venue</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.venueName || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">
                        Location
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {[formData.city, formData.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">Courts</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.numCourts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">
                        Organizer
                      </span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.organizerName || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">Logo</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.logo?.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-muted)]">UPI ID</span>
                      <span className="font-semibold text-[var(--color-text)]">
                        {formData.upiId || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <h3 className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-wider mb-4 border-b border-[var(--color-border)] pb-2">
                    Events ({formData.events.length})
                  </h3>
                  {formData.events.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)] italic">
                      No events created.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.events.map((ev, i) => (
                        <details
                          key={i}
                          className="group border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] open:ring-1 open:ring-primary"
                        >
                          <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 text-sm text-[var(--color-text)]">
                            <span>
                              {ev.name || `Event ${i + 1}`}{" "}
                              <span className="text-[var(--color-muted)] font-normal ml-2">
                                ({ev.sport || "Sport"})
                              </span>
                            </span>
                            <ChevronRightIcon
                              size={16}
                              className="text-[var(--color-muted)] group-open:rotate-90 transition-transform"
                            />
                          </summary>
                          <div className="text-[var(--color-muted)] text-xs px-4 pb-4 space-y-2 border-t border-[var(--color-border)] pt-3">
                            <div className="flex justify-between">
                              <span>Format:</span>{" "}
                              <span className="text-[var(--color-text)] font-semibold">
                                {ev.format}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gender:</span>{" "}
                              <span className="text-[var(--color-text)] font-semibold">
                                {ev.gender}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sets:</span>{" "}
                              <span className="text-[var(--color-text)] font-semibold">
                                {ev.sets}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fee:</span>{" "}
                              <span className="text-[var(--color-text)] font-semibold">
                                {ev.isFree ? "Free Entry" : `₹${ev.fee}`}
                              </span>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex-none bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 md:px-6 flex justify-between items-center z-10 relative">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${step === 1 ? "opacity-0 pointer-events-none" : "text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"}`}
          >
            <ArrowLeftIcon size={16} /> Back
          </button>

          <div className="flex gap-3">
            {step === totalSteps && (
              <button
                onClick={() => handleComplete("draft")}
                disabled={isPublishing}
                className="px-6 py-2.5 rounded-xl font-bold border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] transition-colors"
              >
                Save as Draft
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background: "var(--gradient-orange)" }}
              >
                Continue <ChevronRightIcon size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleComplete("created")}
                disabled={isPublishing}
                className="px-6 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:scale-[1.02] transition-transform"
                style={{ background: "var(--gradient-orange)" }}
              >
                {isPublishing ? "Publishing..." : "Publish"}{" "}
                <ChevronRightIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Event Warning Caution Pop-up Modal */}
      {showEventWarning && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
              <InfoIcon size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">
              Attention: Events Cannot Be Edited
            </h2>
            
            <p className="text-sm text-[var(--color-muted)] leading-relaxed mb-6">
              Please be careful while creating events. Once the tournament is created, you will not be able to edit or delete these events. Double-check all event names, formats, dates, and entry fees before proceeding.
            </p>
            
            <button
              type="button"
              onClick={() => setShowEventWarning(false)}
              className="w-full py-3 rounded-xl font-bold text-white shadow-md active:scale-[0.98] transition-all"
              style={{ background: "var(--gradient-orange)" }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
