import {
  LayoutGrid,
  GitBranch,
  Gauge,
  ShieldCheck,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const SERVICES: Service[] = [
  {
    icon: LayoutGrid,
    title: "Custom Internal Portals",
    description:
      "Role-gated systems your teams log into every day, built around your actual departments — not a generic intranet template.",
  },
  {
    icon: GitBranch,
    title: "Workflow & Approval Systems",
    description:
      "Requests, sign-offs, and escalations that move on their own — no more chasing a signature over email.",
  },
  {
    icon: Gauge,
    title: "Operational Dashboards",
    description:
      "The numbers your business runs on, calculated live from real activity instead of an end-of-week spreadsheet.",
  },
  {
    icon: ShieldCheck,
    title: "Inspection & Compliance Systems",
    description:
      "Checklists, audits, and corrective actions that produce a record you can hand an auditor, not a pile of paper.",
  },
  {
    icon: UserCheck,
    title: "Visitor & Access Management",
    description:
      "Who's on site, who approved them, and when they left — logged automatically, not on a paper sign-in sheet.",
  },
  {
    icon: Wrench,
    title: "Custom Business Tools",
    description:
      "A specific process nobody else has built for — quoting, scheduling, tracking. If it's yours, we design around it.",
  },
];

export function Services() {
  return (
    <section id="what-we-build" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            What We Build
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Six ways we turn a workflow into a system.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/40"
            >
              <div className="flex size-10 items-center justify-center rounded-lg border border-violet/25 bg-violet/10">
                <Icon className="size-5 text-violet-soft" />
              </div>
              <h3 className="mt-4 text-base font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
