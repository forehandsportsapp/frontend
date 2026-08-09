import { literal, z } from "zod";
import { userApi } from "../api/userApi";

const MIN_REGISTRATION_AGE_YEARS = 5;

function toLocalDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMaxAllowedDobValue() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MIN_REGISTRATION_AGE_YEARS);
  return toLocalDateValue(date);
}

function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

export const registrationSchema = z
  .object({
    name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name is too long")
      .trim(),
    contactNumber: z
      .string()
      .regex(
        /^[6-9]\d{9}$/,
        "Invalid phone number (10 digits starting with 6-9)",
      ),
    gender: z.enum(["male", "female"]),
    dob: z.string().min(1, "Date of birth is required"),
    playingHand: z.enum(["right", "left"]).optional(),
    primarySport: z.string().max(30, "Sport name is too long").optional(),
  })
  .refine((data) => isValidIsoDate(data.dob), {
    path: ["dob"],
    message: "Date of birth must be a valid date",
  })
  .refine((data) => data.dob <= getMaxAllowedDobValue(), {
    path: ["dob"],
    message: `You must be at least ${MIN_REGISTRATION_AGE_YEARS} years old to create an account`,
  })
  .superRefine(async (data, ctx) => {
    if (data.contactNumber && data.contactNumber.length >= 10) {
      // Basic format check to avoid unnecessary API calls
      const isFormatValid =
        /^[0-9+\-\s()]*$/.test(data.contactNumber) &&
        data.contactNumber.length <= 15;
      if (isFormatValid) {
        try {
          const isUnique = await userApi.validateContact(data.contactNumber);
          if (!isUnique) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["contactNumber"],
              message: "This contact number is already registered",
            });
          }
        } catch (err) {
          console.error("Uniqueness check failed:", err);
        }
      }
    }
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;
