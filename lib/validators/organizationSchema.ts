import { z } from "zod";

const WEBSITE_ERROR =
  "Enter a valid website, like example.com or https://example.com";
const WEBSITE_PROTOCOL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;

function normalizeWebsiteInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (WEBSITE_PROTOCOL_PATTERN.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidWebsite(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    const hostname = url.hostname;

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      hostname.includes(".") &&
      !hostname.startsWith(".") &&
      !hostname.endsWith(".")
    );
  } catch {
    return false;
  }
}

export const organizationSchema = z.object({
  orgTypeCode: z.string().min(1, "Please select an organization type"),
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
  description: z.string().max(1000).optional(),
  establishedYear: z.coerce.number().min(1800).max(new Date().getFullYear()),
  website: z.preprocess(
    (value) =>
      typeof value === "string" ? normalizeWebsiteInput(value) : value,
    z.string().refine(isValidWebsite, WEBSITE_ERROR),
  ),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number (10 digits starting with 6-9)"),
  address: z.string().min(5, "Full address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().regex(/^\d{6}$/, "Zip code must be 6 digits"),
  logo: z.any().optional().nullable(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
