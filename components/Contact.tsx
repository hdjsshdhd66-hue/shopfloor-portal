"use client";

import { useId, useState, type FormEvent } from "react";
import { Mail, Phone, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_CALL_HREF,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP_HREF,
  PROJECT_TYPES,
} from "@/lib/constants";

type FormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  projectType: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  projectType: "",
  message: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The single seam for delivering an enquiry. There is no backend yet (see
 * project notes), so this opens a prefilled email as the fallback. Swap the
 * body for `await fetch("/api/enquiries", { method: "POST", body: ... })`
 * once backend infrastructure exists — nothing else in this component needs
 * to change.
 */
function deliverEnquiry(data: FormState) {
  const subject = `S47 DIGITAL Project Enquiry - ${data.company}`;
  const body = [
    `Name: ${data.name}`,
    `Company: ${data.company}`,
    `Work email: ${data.email}`,
    `Phone: ${data.phone || "(not provided)"}`,
    `Project type: ${data.projectType}`,
    "",
    "What they want to digitize:",
    data.message,
  ].join("\n");

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

export function Contact() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "invalid">("idle");
  const formId = useId();

  function validate(values: FormState): FormErrors {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Enter your name.";
    if (!values.company.trim()) next.company = "Enter your company name.";
    if (!EMAIL_RE.test(values.email.trim())) next.email = "Enter a valid email address.";
    if (!values.projectType) next.projectType = "Select a project type.";
    if (!values.message.trim()) next.message = "Tell us a little about the project.";
    return next;
  }

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setStatus("invalid");
      const firstInvalidKey = Object.keys(validationErrors)[0];
      document.getElementById(`${formId}-${firstInvalidKey}`)?.focus();
      return;
    }

    setStatus("submitting");
    deliverEnquiry(form);
    setStatus("sent");
  }

  return (
    <section id="contact" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Get In Touch
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Discuss your project.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Tell us what your team is still running on paper, in spreadsheets, or in a system
              that no longer fits. We&rsquo;ll tell you honestly whether a custom system is worth
              building.
            </p>

            <div className="mt-8 flex max-w-sm flex-col gap-2.5">
              <a
                href={CONTACT_EMAIL_HREF}
                aria-label="Email S47 DIGITAL"
                className="flex min-h-11 items-center gap-3.5 rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:border-violet/40"
              >
                <Mail className="size-[18px] shrink-0 text-violet-soft" />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-foreground">Email S47 DIGITAL</span>
                  <span className="text-xs text-muted-foreground">{CONTACT_EMAIL}</span>
                </span>
              </a>
              <a
                href={CONTACT_CALL_HREF}
                aria-label="Call S47 DIGITAL"
                className="flex min-h-11 items-center gap-3.5 rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:border-violet/40"
              >
                <Phone className="size-[18px] shrink-0 text-violet-soft" />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-foreground">Call S47 DIGITAL</span>
                  <span className="text-xs text-muted-foreground">{CONTACT_PHONE_DISPLAY}</span>
                </span>
              </a>
              <a
                href={CONTACT_WHATSAPP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contact S47 DIGITAL on WhatsApp"
                className="flex min-h-11 items-center gap-3.5 rounded-xl border border-border bg-card/60 px-4 py-3 transition-colors hover:border-violet/40"
              >
                <MessageCircle className="size-[18px] shrink-0 text-violet-soft" />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-medium text-foreground">WhatsApp S47 DIGITAL</span>
                  <span className="text-xs text-muted-foreground">{CONTACT_PHONE_DISPLAY}</span>
                </span>
              </a>
            </div>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-name`}>
                  Name <span className="text-violet">*</span>
                </Label>
                <Input
                  id={`${formId}-name`}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${formId}-name-error` : undefined}
                  className="h-11"
                />
                {errors.name && (
                  <p id={`${formId}-name-error`} className="text-xs text-red-400">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-company`}>
                  Company <span className="text-violet">*</span>
                </Label>
                <Input
                  id={`${formId}-company`}
                  autoComplete="organization"
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  aria-invalid={Boolean(errors.company)}
                  aria-describedby={errors.company ? `${formId}-company-error` : undefined}
                  className="h-11"
                />
                {errors.company && (
                  <p id={`${formId}-company-error`} className="text-xs text-red-400">
                    {errors.company}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-email`}>
                  Work Email <span className="text-violet">*</span>
                </Label>
                <Input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${formId}-email-error` : undefined}
                  className="h-11"
                />
                {errors.email && (
                  <p id={`${formId}-email-error`} className="text-xs text-red-400">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${formId}-phone`}>
                  Phone <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id={`${formId}-phone`}
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-projectType`}>
                  Project Type <span className="text-violet">*</span>
                </Label>
                <Select
                  value={form.projectType}
                  onValueChange={(value) => handleChange("projectType", value)}
                >
                  <SelectTrigger
                    id={`${formId}-projectType`}
                    className="h-11 w-full"
                    aria-invalid={Boolean(errors.projectType)}
                    aria-describedby={errors.projectType ? `${formId}-projectType-error` : undefined}
                  >
                    <SelectValue placeholder="Select a project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.projectType && (
                  <p id={`${formId}-projectType-error`} className="text-xs text-red-400">
                    {errors.projectType}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={`${formId}-message`}>
                  What would you like to digitize? <span className="text-violet">*</span>
                </Label>
                <Textarea
                  id={`${formId}-message`}
                  rows={4}
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? `${formId}-message-error` : undefined}
                />
                {errors.message && (
                  <p id={`${formId}-message-error`} className="text-xs text-red-400">
                    {errors.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={status === "submitting"}
              className="mt-6 h-11 w-full text-base"
            >
              {status === "submitting" ? "Opening email…" : "Discuss Your Project"}
            </Button>

            <p className="mt-3 text-xs text-muted-foreground">
              Submitting opens an email to S47 DIGITAL with these details prefilled — nothing is
              sent automatically or stored elsewhere.
            </p>

            <div role="status" aria-live="polite" className="mt-3">
              {status === "invalid" && (
                <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  Check the highlighted fields and try again.
                </p>
              )}
              {status === "sent" && (
                <p className="rounded-lg border border-cyan/25 bg-cyan/10 px-3 py-2 text-sm text-cyan">
                  Opening an email to S47 DIGITAL with your project details filled in.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
