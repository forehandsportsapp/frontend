"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validators/registrationForm";
import { userApi } from "@/lib/api/userApi";
import { storageApi } from "@/lib/api/storageApi";
import {
  getAuthRedirectFromUrl,
  getStoredAuthRedirect,
  saveAuthRedirect,
  withAuthRedirect,
} from "@/lib/authRedirect";
import {
  CameraIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  DumbbellIcon,
  TrophyIcon,
  ChevronRightIcon,
  InfoIcon,
  UsersIcon,
} from "@/components/Icons";
import { FloatingIcons } from "@/components/FloatingIcons";

const InputField = ({
  id,
  label,
  icon: Icon,
  children,
  error,
  type,
  ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    // If clicking the input/select directly, let the browser handle it
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    const input = (e.currentTarget as HTMLElement).querySelector(
      "input, select",
    ) as HTMLInputElement | HTMLSelectElement;
    if (input) {
      if (type === "date" && (input as any).showPicker) {
        try {
          (input as any).showPicker();
        } catch {
          input.focus();
        }
      } else {
        input.focus();
      }
    }
  };

  return (
    <div
      className="w-full min-w-0 space-y-1.5"
      onClick={(e) => {
        if (type !== "date") handleClick(e);
      }}
    >
      <div
        className={`relative h-14 flex items-center rounded-full border bg-[var(--color-surface)] transition-all ${error ? "border-red-500/50" : "border-[var(--color-border)] focus-within:border-[#ff7a1a]"}`}
      >
        <div
          className="pl-4 text-[#ff7a1a] opacity-80 flex-shrink-0 cursor-pointer h-full flex items-center"
          onClick={(e) => {
            if (type === "date") {
              e.stopPropagation();
              handleClick(e);
            }
          }}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0 flex items-center h-full">
          {children || (
            <input
              id={id}
              type={type === "date" && !isFocused && !props.value ? "text" : type}
              onFocus={(e) => {
                setIsFocused(true);
                if (props.onFocus) props.onFocus(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                if (props.onBlur) props.onBlur(e);
              }}
              className="w-full bg-transparent px-4 text-[15px] font-medium text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-secondary)] placeholder:opacity-30"
              {...props}
            />
          )}
        </div>
      </div>
      {error && (
        <p className="ml-4 text-[11px] font-bold text-red-500">{error}</p>
      )}
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, userProfile, session, logout, register } =
    useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/home");

  const [formData, setFormData] = useState<RegistrationFormData>({
    name: "",
    contactNumber: "",
    gender: "" as any,
    dob: "",
    playingHand: undefined,
    primarySport: "",
  });

  useEffect(() => {
    setNextPath(saveAuthRedirect(getAuthRedirectFromUrl()));
  }, []);

  // Real-time contact uniqueness check
  useEffect(() => {
    const contact = formData.contactNumber;
    if (!contact || contact.length < 10) {
      setFieldErrors((prev) => {
        const { contactNumber, ...rest } = prev;
        return rest;
      });
      return;
    }

    const timer = setTimeout(async () => {
      const result = await registrationSchema.safeParseAsync(formData);
      if (!result.success) {
        const contactError = result.error.issues.find(
          (i) => i.path[0] === "contactNumber",
        );
        if (contactError) {
          setFieldErrors((prev) => ({
            ...prev,
            contactNumber: contactError.message,
          }));
        } else {
          setFieldErrors((prev) => {
            const { contactNumber, ...rest } = prev;
            return rest;
          });
        }
      } else {
        setFieldErrors((prev) => {
          const { contactNumber, ...rest } = prev;
          return rest;
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.contactNumber, formData]);

  useEffect(() => {
    if (isLoading) return;
    const redirectPath = getStoredAuthRedirect(nextPath);
    if (!isAuthenticated) {
      router.replace(withAuthRedirect("/login", redirectPath));
      return;
    }
    if (userProfile) {
      router.replace(redirectPath);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      name:
        prev.name ||
        session?.user?.user_metadata?.full_name ||
        session?.user?.user_metadata?.name ||
        "",
    }));
  }, [isAuthenticated, isLoading, nextPath, userProfile, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const result = await registrationSchema.safeParseAsync(formData);
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
      let cleanPhone = validatedData.contactNumber.replace(/\D/g, "");
      if (cleanPhone.length > 10) {
        if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
          cleanPhone = cleanPhone.slice(-10);
        } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
          cleanPhone = cleanPhone.slice(-10);
        }
      }

      await register({
        name: validatedData.name,
        phone: cleanPhone,
        gender: validatedData.gender,
        dob: validatedData.dob,
        playingHand: validatedData.playingHand ?? null,
        primarySport: validatedData.primarySport ?? null,
      });

      if (avatarFile) {
        try {
          await storageApi.uploadProfileAvatar(avatarFile);
        } catch (uploadErr) {
          console.error("Avatar upload failed:", uploadErr);
        }
      }
      router.replace(getStoredAuthRedirect(nextPath));
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.replace(withAuthRedirect("/login", getStoredAuthRedirect(nextPath)));
    } catch {
      setIsSigningOut(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ff7a1a] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--color-background)] overflow-x-hidden">
      {/* Orange Diagonal Background - Top Section */}
      <svg
        className="absolute top-0 left-0 w-full h-[40vh] text-[#ff7a1a] fill-current z-0"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon points="0,0 100,0 100,20 0,55" />
      </svg>

      {/* Dynamic Floating Icons */}
      <FloatingIcons count={20} page="register" />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pb-12 pt-16">
        {/* Avatar Section */}
        <div className="relative mb-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-[#3a2a57] shadow-xl overflow-hidden flex items-center justify-center relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-[var(--color-text-secondary)] opacity-30">
                  <UserIcon size={48} />
                </div>
              )}
              <label className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 z-10">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () =>
                        setAvatarPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            {/* Camera Badge at Top Right */}
            <div className="absolute -top-1 -right-1 bg-[#ff7a1a] text-white p-2 rounded-full shadow-lg border-[3px] border-[var(--color-background)] z-20">
              <CameraIcon size={16} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-black text-white leading-tight mb-2 drop-shadow-sm">
            Finalize <span className="text-[#ff7a1a]">Registration</span>
          </h1>
          <p className="text-[16px] font-medium text-[var(--color-text-secondary)] opacity-60">
            Let's set up your player profile
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[360px] flex flex-col items-center space-y-4"
        >
          <InputField
            id="name"
            placeholder="Full Name"
            icon={UserIcon}
            value={formData.name}
            onChange={(e: any) =>
              setFormData({ ...formData, name: e.target.value })
            }
            error={fieldErrors.name}
          />

          <InputField
            id="contact"
            placeholder="Contact Number"
            type="tel"
            icon={PhoneIcon}
            value={formData.contactNumber}
            onChange={(e: any) =>
              setFormData({ ...formData, contactNumber: e.target.value })
            }
            error={fieldErrors.contactNumber}
          />

          <InputField id="gender" icon={UsersIcon} error={fieldErrors.gender}>
            <div className="relative flex-1 flex items-center">
              {" "}
              <select
                value={formData.gender || ""}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value as any })
                }
                className="flex-1 bg-transparent px-4 py-4 text-[16px] font-medium text-[var(--color-text)] outline-none appearance-none"
              >
                <option
                  value=""
                  disabled
                  className="bg-[var(--color-background)]"
                >
                  Gender
                </option>
                <option value="male" className="bg-[var(--color-background)]">
                  Male
                </option>
                <option value="female" className="bg-[var(--color-background)]">
                  Female
                </option>
              </select>
              <div className="absolute right-4 pointer-events-none opacity-40">
                <ChevronRightIcon size={16} className="rotate-90" />
              </div>
            </div>
          </InputField>

          <InputField
            id="dob"
            type="date"
            placeholder="Date of Birth"
            icon={CalendarIcon}
            value={formData.dob}
            onChange={(e: any) =>
              setFormData({ ...formData, dob: e.target.value })
            }
            error={fieldErrors.dob}
          />

          <div className="flex gap-3 w-full">
            <div className="flex-1">
              <InputField
                id="playingHand"
                icon={DumbbellIcon}
                error={fieldErrors.playingHand}
              >
                <div className="relative flex-1 flex items-center">
                  <select
                    value={formData.playingHand || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        playingHand: e.target.value as any,
                      })
                    }
                    className="flex-1 bg-transparent px-3 py-4 text-[15px] font-medium text-[var(--color-text)] outline-none appearance-none"
                  >
                    <option
                      value=""
                      disabled
                      className="bg-[var(--color-background)]"
                    >
                      Playing Hand
                    </option>
                    <option
                      value="right"
                      className="bg-[var(--color-background)]"
                    >
                      Right
                    </option>
                    <option
                      value="left"
                      className="bg-[var(--color-background)]"
                    >
                      Left
                    </option>
                  </select>
                  <div className="absolute right-3 pointer-events-none opacity-40">
                    <ChevronRightIcon size={14} className="rotate-90" />
                  </div>
                </div>
              </InputField>
            </div>
            <div className="flex-1">
              <InputField
                id="sport"
                placeholder="Primary sport"
                icon={TrophyIcon}
                value={formData.primarySport}
                onChange={(e: any) =>
                  setFormData({ ...formData, primarySport: e.target.value })
                }
                error={fieldErrors.primarySport}
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm font-bold text-red-500 text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-[340px] h-14 mt-8 flex items-center justify-center rounded-full bg-[#ff7a1a] text-[18px] font-black text-white shadow-lg transition-all hover:bg-[#ff8a33] active:scale-[0.98] disabled:opacity-70 group"
          >
            {isSubmitting ? "Creating profile..." : "Create Profile"}
          </button>

          <p className="text-sm font-medium text-[var(--color-text-secondary)] text-center mt-6">
            Wrong account?{" "}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-[#ff7a1a] font-bold hover:underline disabled:opacity-60"
            >
              Sign out
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
