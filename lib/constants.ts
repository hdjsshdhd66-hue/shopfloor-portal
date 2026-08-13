/**
 * Single source of truth for site-wide constants — contact details and
 * primary navigation. Every component that needs a contact action imports
 * from here rather than hardcoding a value, so there is exactly one place
 * to update if any of these ever change.
 */

export const SITE_NAME = "S47 DIGITAL";
export const SITE_TAGLINE = "Operational Interfaces. Built Around Your Workflow.";
export const SITE_POSITIONING = "Built for your operation. Integrated by your IT.";

// Business contact — email only. No phone/WhatsApp number is published.
export const CONTACT_EMAIL = "contact@s47digital.com";

export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "S47 DIGITAL - Contact"
)}`;

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: "Solutions", href: "#solutions" },
  { label: "Capabilities", href: "#what-we-build" },
  { label: "Industries", href: "#industries" },
  { label: "How We Work", href: "#how-we-work" },
  { label: "About", href: "#about" },
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
