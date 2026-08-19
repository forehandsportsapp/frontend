"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  ArrowLeftIcon,
  BuildingIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  XIcon,
} from "@/components/Icons";
import { organizationApi } from "@/lib/api/organizationApi";
import { storageApi } from "@/lib/api/storageApi";
import { OrganizationData } from "@/lib/models";
import {
  organizationSchema,
  type OrganizationFormData,
} from "@/lib/validators/organizationSchema";

const STEP_ONE_FIELDS: (keyof OrganizationFormData)[] = [
  "orgTypeCode",
  "name",
  "description",
  "establishedYear",
  "logo",
];

const STEP_TWO_FIELDS: (keyof OrganizationFormData)[] = [
  "website",
  "contactEmail",
  "contactPhone",
  "address",
  "city",
  "state",
  "postalCode",
];

function isOrganizationFormField(
  value: unknown,
): value is keyof OrganizationFormData {
  return typeof value === "string";
}

function formatOrgTypeLabel(orgTypeCode: string) {
  if (!orgTypeCode) return "Not selected";

  return orgTypeCode
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (match) => match.toUpperCase());
}

export default function CreateOrgPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>}>
      <CreateOrgContent />
    </React.Suspense>
  );
}

function CreateOrgContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOrganization } = useApp();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<OrganizationFormData>({
    orgTypeCode: "",
    name: "",
    description: "",
    establishedYear: new Date().getFullYear(),
    logo: null,
    website: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  useEffect(() => {
    const orgTypeCode = searchParams.get("orgTypeCode");

    if (!orgTypeCode) {
      router.replace("/org/onboarding");
      return;
    }

    setFormData((current) => ({
      ...current,
      orgTypeCode,
    }));
  }, [router, searchParams]);

  useEffect(() => {
    const result = organizationSchema.safeParse(formData);
    const currentIssues: Record<string, string> = {};
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          currentIssues[issue.path[0].toString()] = issue.message;
        }
      });
    }

    setFieldErrors((prevErrors) => {
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

  const validateFields = (fields: (keyof OrganizationFormData)[]) => {
    setFieldErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        delete next[field];
      });
      return next;
    });

    const result = organizationSchema.safeParse(formData);
    if (result.success) {
      return true;
    }

    const stepErrors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0];
      if (typeof field !== "string") return;
      if (!fields.includes(field as keyof OrganizationFormData)) return;
      if (!stepErrors[field]) {
        stepErrors[field] = issue.message;
      }
    });

    if (Object.keys(stepErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...stepErrors }));
      return false;
    }

    return true;
  };

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
      return;
    }

    router.push(
      `/org/onboarding?orgTypeCode=${encodeURIComponent(formData.orgTypeCode)}`,
    );
  };

  const handleNext = () => {
    if (validateFields(STEP_ONE_FIELDS)) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    const result = organizationSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(errors);

      const hasStepOneErrors = result.error.issues.some((issue) => {
        const field = issue.path[0];
        return (
          isOrganizationFormField(field) && STEP_ONE_FIELDS.includes(field)
        );
      });

      if (hasStepOneErrors) {
        setStep(1);
      } else if (
        result.error.issues.some((issue) => {
          const field = issue.path[0];
          return (
            isOrganizationFormField(field) && STEP_TWO_FIELDS.includes(field)
          );
        })
      ) {
        setStep(2);
      }

      return;
    }

    setIsSubmitting(true);
    try {
      const validatedData = result.data;

      let cleanPhone = validatedData.contactPhone.replace(/\D/g, "");
      if (cleanPhone.length > 10) {
        if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
          cleanPhone = cleanPhone.slice(-10);
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
          cleanPhone = cleanPhone.slice(-10);
        }
      }

      const payload: OrganizationData = {
        name: validatedData.name,
        orgTypeCode: validatedData.orgTypeCode,
        description: validatedData.description || "",
        establishedYear: validatedData.establishedYear,
        website: validatedData.website || null,
        contactEmail: validatedData.contactEmail,
        contactPhone: cleanPhone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        postalCode: validatedData.postalCode,
        verified: false,
      };

      const orgId = await organizationApi.createOrganization(payload);

      if (formData.logo) {
        try {
          await storageApi.uploadOrganizationLogo(formData.logo, orgId);
        } catch (uploadError) {
          console.error("Logo upload failed:", uploadError);
        }
      }

      setOrganization(orgId);
      router.push(`/org/home?orgId=${orgId}`);
    } catch (error) {
      console.error("Failed to register organization", error);
      alert("An error occurred during registration");
      setIsSubmitting(false);
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1 ml-1">{message}</p>;
  };

  const currentStepLabel = step === 1 ? "Step 2 of 3" : "Step 3 of 3";
  const currentStepTitle =
    step === 1 ? "Organization details" : "Contact details";
  const closeHref = `/org/onboarding${
    formData.orgTypeCode
      ? `?orgTypeCode=${encodeURIComponent(formData.orgTypeCode)}`
      : ""
  }`;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
            {currentStepLabel}
          </p>
          <h1 className="font-semibold">{currentStepTitle}</h1>
        </div>
        <Link
          href={closeHref}
          className="p-2 hover:bg-[var(--color-surface-elevated)] rounded-lg"
        >
          <XIcon size={20} />
        </Link>
      </div>

      {step === 1 && (
        <div className="p-4 space-y-5 pb-24">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Organization type
            </p>
            <p className="mt-1 font-medium text-[var(--color-text)]">
              {formatOrgTypeLabel(formData.orgTypeCode)}
            </p>
            <Link
              href={closeHref}
              className="mt-3 inline-flex text-sm font-medium text-primary"
            >
              Change type
            </Link>
          </div>

          <h2 className="font-semibold flex items-center gap-2">
            <BuildingIcon size={18} /> Basic information
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              placeholder="Enter organization name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.name
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.name} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              placeholder="Brief description of your organization"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.description
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none resize-none`}
            />
            <InputError message={fieldErrors.description} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Established Year *
            </label>
            <input
              type="number"
              placeholder="YYYY (e.g. 2023)"
              value={formData.establishedYear}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  establishedYear: parseInt(e.target.value, 10) || 0,
                })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.establishedYear
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.establishedYear} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Organization Logo
            </label>
            <div className="relative border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/png, image/jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFormData({ ...formData, logo: e.target.files[0] });
                  }
                }}
              />
              <div className="w-16 h-16 mx-auto bg-[var(--color-surface-elevated)] rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                {formData.logo ? (
                  <img
                    src={URL.createObjectURL(formData.logo)}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-[var(--color-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ pointerEvents: "none" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              <p className="font-medium">
                {formData.logo
                  ? formData.logo.name
                  : "Upload Organization Logo"}
              </p>
              <p className="text-sm text-[var(--color-muted)]">
                PNG, JPG up to 15 MB
              </p>
              <button
                type="button"
                className="mt-3 text-primary text-sm font-medium"
              >
                {formData.logo ? "Change File" : "Choose File"}
              </button>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-between items-center">
            <button
              type="button"
              onClick={handleGoBack}
              className="text-[var(--color-muted)] flex items-center gap-1"
            >
              <ArrowLeftIcon size={16} /> Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 rounded-lg font-semibold text-white"
              style={{ background: "var(--gradient-orange)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="p-4 space-y-5 pb-24">
          <h2 className="font-semibold flex items-center gap-2">
            <PhoneIcon size={18} /> Contact information
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                type="email"
                placeholder="contact@example.com"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                  fieldErrors.contactEmail
                    ? "border-red-500"
                    : "border-[var(--color-border)]"
                } text-[var(--color-text)] focus:border-primary focus:outline-none`}
              />
              <InputError message={fieldErrors.contactEmail} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Phone *</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                  fieldErrors.contactPhone
                    ? "border-red-500"
                    : "border-[var(--color-border)]"
                } text-[var(--color-text)] focus:border-primary focus:outline-none`}
              />
              <InputError message={fieldErrors.contactPhone} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.website
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.website} />
          </div>

          <h2 className="font-semibold flex items-center gap-2 pt-4">
            <MapPinIcon size={18} /> Address
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Street Address *
            </label>
            <input
              type="text"
              placeholder="Complete address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.address
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.address} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">City *</label>
              <input
                type="text"
                placeholder="City Name"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                  fieldErrors.city
                    ? "border-red-500"
                    : "border-[var(--color-border)]"
                } text-[var(--color-text)] focus:border-primary focus:outline-none`}
              />
              <InputError message={fieldErrors.city} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State *</label>
              <input
                type="text"
                placeholder="State Name"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                  fieldErrors.state
                    ? "border-red-500"
                    : "border-[var(--color-border)]"
                } text-[var(--color-text)] focus:border-primary focus:outline-none`}
              />
              <InputError message={fieldErrors.state} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pin Code *</label>
            <input
              type="text"
              placeholder="123456"
              value={formData.postalCode}
              onChange={(e) =>
                setFormData({ ...formData, postalCode: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${
                fieldErrors.postalCode
                  ? "border-red-500"
                  : "border-[var(--color-border)]"
              } text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.postalCode} />
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-between items-center">
            <button
              type="button"
              onClick={handleGoBack}
              disabled={isSubmitting}
              className="text-[var(--color-muted)] flex items-center gap-1 disabled:opacity-50"
            >
              <ArrowLeftIcon size={16} /> Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-70"
              style={{ background: "var(--gradient-orange)" }}
            >
              {isSubmitting ? "Creating..." : "Create Organization"}
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
