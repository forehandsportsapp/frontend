"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { useApp } from "@/components/AppProvider";
import {
  EditIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  HandIcon,
  GamepadIcon,
  CameraIcon,
  ChevronDownIcon,
} from "@/components/Icons";
import { userApi } from "@/lib/api/userApi";
import { storageApi } from "@/lib/api/storageApi";
import { registrationSchema } from "@/lib/validators/registrationForm";
import { ProfileData } from "@/lib/models";

export default function EditProfilePage() {
  const router = useRouter();
  const { userProfile: profile, isLoading, refreshProfile } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDobFocused, setIsDobFocused] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    gender: "" as any,
    dateOfBirth: "",
    playingHand: "" as any,
    primarySport: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.name,
        contactNumber: profile.phone,
        gender: profile.gender,
        dateOfBirth: profile.dob
          ? new Date(profile.dob).toISOString().split("T")[0]
          : "",
        playingHand: profile.playingHand || "",
        primarySport: profile.primarySport || "",
      });
      if (profile.profilePicUrl) {
        setAvatarPreview(profile.profilePicUrl);
      }
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setFieldErrors({});

    // Map local form fields to registrationSchema expected fields
    const dataToValidate = {
      name: formData.fullName,
      contactNumber: formData.contactNumber,
      gender: formData.gender,
      dob: formData.dateOfBirth,
      playingHand: formData.playingHand || undefined,
      primarySport: formData.primarySport || undefined,
    };

    const result = await registrationSchema.safeParseAsync(dataToValidate);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          const field = issue.path[0].toString();
          // Map back to local form fields if needed
          const mappedField =
            field === "name"
              ? "fullName"
              : field === "dob"
                ? "dateOfBirth"
                : field;
          errors[mappedField] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    const validatedData = result.data;

    try {
      setIsSubmitting(true);

      // 1. Update Profile Info
      const cleanPhone = validatedData.contactNumber.replace(/\D/g, "");
      const updateData: ProfileData = {
        name: validatedData.name,
        phone: cleanPhone,
        gender: validatedData.gender,
        dob: validatedData.dob,
        playingHand: (validatedData.playingHand as any) || null,
        primarySport: validatedData.primarySport || null,
      };

      await userApi.updateProfile(updateData);

      // 2. Upload Avatar if selected
      if (avatarFile) {
        try {
          await storageApi.uploadProfileAvatar(avatarFile);
        } catch (uploadErr) {
          console.error("Avatar upload failed:", uploadErr);
        }
      }

      await refreshProfile();
      router.back();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1 ml-1">{message}</p>;
  };

  const initials = (formData.fullName || profile?.name || "P")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <Layout title="Edit Profile" showBack>
      <div className="p-4 space-y-4 pb-24 max-w-md mx-auto">
        {/* Profile Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 border-4 border-[var(--color-surface)] shadow-md flex items-center justify-center relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-bold">
                  {initials}
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
                      setAvatarFile(file);
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
              <EditIcon size={14} />
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Loading profile...
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Fields */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <UserIcon size={14} /> Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.fullName ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.fullName} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <PhoneIcon size={14} /> Contact Number
            </label>
            <input
              type="tel"
              value={formData.contactNumber}
              onChange={(e) =>
                setFormData({ ...formData, contactNumber: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.contactNumber ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.contactNumber} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <UserIcon size={14} /> Gender
            </label>
            <div className="relative flex items-center">
              <select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as any })
                }
                className={`w-full px-4 py-3 pr-10 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.gender ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none appearance-none`}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <div className="absolute right-4 pointer-events-none opacity-40 text-[var(--color-text)]">
                <ChevronDownIcon size={16} />
              </div>
            </div>
            <InputError message={fieldErrors.gender} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <CalendarIcon size={14} /> Date of Birth
            </label>
            <input
              type={isDobFocused || formData.dateOfBirth ? "date" : "text"}
              placeholder="Date of Birth"
              value={formData.dateOfBirth}
              onFocus={() => setIsDobFocused(true)}
              onBlur={() => setIsDobFocused(false)}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.dateOfBirth ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.dateOfBirth} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <HandIcon size={14} /> Playing Hand
            </label>
            <div className="relative flex items-center">
              <select
                value={formData.playingHand}
                onChange={(e) =>
                  setFormData({ ...formData, playingHand: e.target.value as any })
                }
                className={`w-full px-4 py-3 pr-10 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.playingHand ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none appearance-none`}
              >
                <option value="">Select</option>
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
              <div className="absolute right-4 pointer-events-none opacity-40 text-[var(--color-text)]">
                <ChevronDownIcon size={16} />
              </div>
            </div>
            <InputError message={fieldErrors.playingHand} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1">
              <GamepadIcon size={14} /> Primary Sport
            </label>
            <input
              type="text"
              value={formData.primarySport}
              onChange={(e) =>
                setFormData({ ...formData, primarySport: e.target.value })
              }
              className={`w-full px-4 py-3 rounded-lg bg-[var(--color-surface)] border ${fieldErrors.primarySport ? "border-red-500" : "border-[var(--color-border)]"} text-[var(--color-text)] focus:border-primary focus:outline-none`}
            />
            <InputError message={fieldErrors.primarySport} />
          </div>

          {errorMessage && (
            <p className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-200">
              {errorMessage}
            </p>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full mt-6 disabled:opacity-70"
          >
            {isSubmitting ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
