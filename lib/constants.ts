/**
 * Single source of truth for site-wide constants — contact details and
 * primary navigation. Every component that needs a contact action imports
 * from here rather than hardcoding a value, so there is exactly one place
 * to update if any of these ever change.
 */

export const SITE_NAME = "S47 DIGITAL";
export const SITE_TAGLINE = "Digital Systems for Modern Operations.";

export const CONTACT_EMAIL = "saud.almutairi091@gmail.com";
export const CONTACT_PHONE_DISPLAY = "0530111882";
export const CONTACT_PHONE_INTL = "+966530111882";
export const WHATSAPP_NUMBER = "966530111882";
export const WHATSAPP_MESSAGE =
  "Hello, I’m interested in discussing a digital systems project with S47 DIGITAL.";

export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "S47 DIGITAL - Contact"
)}`;
export const CONTACT_CALL_HREF = `tel:${CONTACT_PHONE_INTL}`;
export const CONTACT_WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "What We Build", href: "#what-we-build" },
  { label: "Case Study", href: "#case-study" },
  { label: "How We Work", href: "#how-we-work" },
  { label: "Contact", href: "#contact" },
];

export const PROJECT_TYPES = [
  "Internal Portal",
  "Workflow System",
  "Dashboard",
  "Compliance / Inspection System",
  "Visitor Management",
  "Other",
] as const;
