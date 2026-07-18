"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { useApp } from "@/components/AppProvider";
import { ArrowLeftIcon, CameraIcon } from "@/components/Icons";
import { organizationApi } from "@/lib/api/organizationApi";
import { storageApi } from "@/lib/api/storageApi";
import { organizationSchema } from "@/lib/validators/organizationSchema";
import { OrganizationData } from "@/lib/models";

export default function OrgProfileEditPage() {
  const router = useRouter();
  const { activeOrganization: organization, setOrganization } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    orgTypeCode: "sportsClub",
    description: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    establishedYear: new Date().getFullYear(),
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        orgTypeCode: organization.orgTypeCode || "sportsClub",
        description: organization.description || "",
        contactEmail: organization.contactEmail || "",
        contactPhone: organization.contactPhone || "",
        website: organization.website || "",
        address: organization.address || "",
        city: organization.city || "",
        state: organization.state || "",
        postalCode: organization.postalCode || "",
        establishedYear:
          organization.establishedYear || new Date().getFullYear(),
      });
      if (organization.logoUrl) {
        setAvatarPreview(organization.logoUrl);
      }
    }
  }, [organization]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    if (!organization?.id) return;

    const result = organizationSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    const validatedData = result.data;

    try {
      setIsSubmitting(true);

      // 1. Update Org Info
      const cleanPhone = validatedData.contactPhone.replace(/\D/g, "");
      const updateData: OrganizationData = {
        id: organization.id,
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
        verified: organization.verified || false,
      };

      await organizationApi.updateOrganization(updateData);

      // 2. Upload Logo if selected
      if (logoFile) {
        try {
          await storageApi.uploadOrganizationLogo(logoFile, organization.id);
        } catch (uploadErr) {
          console.error("Logo upload failed:", uploadErr);
        }
      }

      await setOrganization(organization.id);
      router.back();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update organization.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1 ml-1">{message}</p>;
  };

  const orgInitial = (formData.name || organization?.name || "O")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <Layout showBottomNav={false} title="Edit Profile">
      <div className="p-4 space-y-6 max-w-md mx-auto pb-24">
        <div className="flex justify-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-4 border-[var(--color-surface)] shadow-md flex items-center justify-center relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary text-3xl font-bold">
                  {orgInitial}
                </span>
              )}
              <label className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100">
                <CameraIcon size={24} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setAvatarPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-[var(--color-surface)] pointer-events-none">
              <CameraIcon size={14} />
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Organization Name
            </span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.name ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.name} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Organization Type
            </span>
            <select
              value={formData.orgTypeCode}
              onChange={(e) =>
                setFormData({ ...formData, orgTypeCode: e.target.value })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.orgTypeCode ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            >
              <option value="educationalInstitute">
                Educational Institute
              </option>
              <option value="sportsAcademy">Sports Academy</option>
              <option value="sportsClub">Sports Club</option>
              <option value="corporate">Corporate</option>
              <option value="other">Other</option>
            </select>
            <InputError message={fieldErrors.orgTypeCode} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Description
            </span>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.description ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] resize-none focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.description} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                Contact Email
              </span>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.contactEmail ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
              />
              <InputError message={fieldErrors.contactEmail} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                Contact Phone
              </span>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.contactPhone ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
              />
              <InputError message={fieldErrors.contactPhone} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Website
            </span>
            <input
              type="url"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.website ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.website} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Established Year
            </span>
            <input
              type="number"
              value={formData.establishedYear}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  establishedYear: parseInt(e.target.value) || 0,
                })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.establishedYear ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.establishedYear} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Address
            </span>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.address ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.address} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                City
              </span>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.city ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
              />
              <InputError message={fieldErrors.city} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-text)]">
                State
              </span>
              <input
                type="text"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.state ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
              />
              <InputError message={fieldErrors.state} />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Postal Code
            </span>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) =>
                setFormData({ ...formData, postalCode: e.target.value })
              }
              className={`mt-1 w-full p-3 rounded-[var(--radius-input)] border ${fieldErrors.postalCode ? "border-red-500" : "border-[var(--color-border)]"} bg-[var(--color-surface)] text-[var(--color-text)] focus:border-primary outline-none`}
            />
            <InputError message={fieldErrors.postalCode} />
          </label>

          {errorMessage && (
            <p className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] rounded-[var(--radius-button)] bg-primary text-[var(--color-primary-contrast)] font-bold shadow-md active:scale-95 transition-all disabled:opacity-70 mt-4"
          >
            {isSubmitting ? "Saving Changes..." : "Update Organization Profile"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
