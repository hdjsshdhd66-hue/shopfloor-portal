import type { ReactNode } from "react";
import { FileSpreadsheet, FileText, Smartphone, Wifi } from "lucide-react";

const CAPABILITIES = [
  "Quality",
  "Safety",
  "Maintenance",
  "Production",
  "Visitor Management",
  "Risk Assessment",
  "Near Miss",
  "CAPA",
  "Operational Dashboards",
  "Mobile / Desktop PWA",
];

const MAINTENANCE_CHECKS = [
  "PM schedules that trigger themselves",
  "Work orders logged from the tablet on the line",
  "Downtime captured the moment it happens",
];

const TIMELINE = [
  { time: "06:00", tag: "Preventive Maintenance", title: "Line 3 changeover — PM check due", tone: "cobalt" as const },
  { time: "10:30", tag: "Quality", title: "Metal detector calibration", tone: "violet" as const },
  { time: "14:00", tag: "Visitor Management", title: "Visitor induction in progress", tone: "cyan" as const, live: true },
];

const PORTAL_STATUS = [
  { name: "Quality", tone: "cobalt" as const },
  { name: "Safety", tone: "violet" as const },
  { name: "Maintenance", tone: "cobalt" as const },
  { name: "Production", tone: "cyan" as const },
  { name: "Visitor Management", tone: "violet" as const },
];

const TONE_DOT: Record<"cobalt" | "violet" | "cyan", string> = {
  cobalt: "bg-cobalt",
  violet: "bg-violet",
  cyan: "bg-cyan",
};

function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-card/60 p-6 ${className}`}>{children}</div>
  );
}

export function CaseStudy() {
  return (
    <section id="case-study" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl border border-border bg-gradient-to-b from-violet/[0.06] to-transparent p-6 sm:p-10">
          {/* Header — explicit that this is a project, not the company. */}
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
              Featured Case Study
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Shop Floor Digital Portal
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              A custom digital operations portal S47 DIGITAL designed around real manufacturing
              workflows — five connected portals covering a full shift, from quality checks to
              visitor sign-in.
            </p>
            <p className="mt-3 rounded-lg border-l-2 border-border pl-4 text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">S47 DIGITAL</strong> is the company.{" "}
              <strong className="font-medium text-foreground">Shop Floor Digital Portal</strong>{" "}
              is one project built for one manufacturing client — not a template every S47 system
              inherits. Your system would be mapped to your own workflow and terminology.
            </p>
          </div>

          <ul className="mt-6 flex flex-wrap gap-2">
            {CAPABILITIES.map((cap) => (
              <li
                key={cap}
                className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground"
              >
                {cap}
              </li>
            ))}
          </ul>

          {/* Bento: unified / real-time / offline-as-capability */}
          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Unified
              </p>
              <h3 className="mt-3 text-lg font-medium text-foreground">Five portals, one login</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Role-gated views built around how each team on this client&rsquo;s floor already
                worked — Quality, Safety, Maintenance, Production, and Visitors, in one system.
              </p>
              <span className="mt-4 inline-flex items-center rounded-full border border-violet/25 bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet-soft">
                5 portals · 1 login
              </span>
            </Card>

            <Card className="flex flex-col justify-end bg-gradient-to-br from-violet/10 to-cobalt/[0.06]">
              <h3 className="text-lg font-medium text-foreground">Real-time visibility</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Dashboards, risk scores, and CAPA status calculate themselves the moment a form is
                submitted — no end-of-shift spreadsheet.
              </p>
            </Card>

            <Card>
              <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                Offline-first
              </p>
              <h3 className="mt-3 text-lg font-medium text-foreground">Built for patchy signal</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Entries queue locally on the tablet and sync once the connection returns.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-xs font-medium text-cyan">
                <Wifi className="size-3" />
                Available capability — implemented for this project
              </span>
            </Card>
          </div>

          {/* Mockup grid: what the shift actually sees */}
          <div className="mt-14">
            <h3 className="text-lg font-medium text-foreground">What the shift actually sees</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A closer look at four screens from inside the portal.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <div className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">NCR-0231</span>
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-red-400 uppercase">
                    High
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">Metal detector reject — Line 3</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-cobalt to-violet" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Root cause under review · 70%</p>
              </div>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Non-conformances, <span className="text-foreground">tracked to closure.</span>
              </p>
            </Card>

            <Card>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                  <FileSpreadsheet className="size-4 shrink-0 text-cyan" />
                  <span className="text-sm text-muted-foreground">Line3_Checklist_Aug.xlsx</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-3">
                  <FileText className="size-4 shrink-0 text-cyan" />
                  <span className="text-sm text-muted-foreground">RiskAssessment_RA-014.pdf</span>
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                One-tap exports, still in the format{" "}
                <span className="text-foreground">your auditors expect.</span>
              </p>
            </Card>

            <Card>
              <div className="flex flex-col gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background/60 px-3.5 py-2.5 text-sm text-muted-foreground">
                  Permit requested — confined space, Line 2
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-cyan/25 bg-cyan/10 px-3.5 py-2.5 text-sm text-cyan">
                  Approved ✓ — HSE Officer · 14:02
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Permits-to-work, <span className="text-foreground">approved from the floor.</span>
              </p>
            </Card>

            <Card>
              <div className="flex flex-col divide-y divide-border">
                {[
                  { initials: "AY", role: "Quality Manager", tone: "violet" as const },
                  { initials: "FS", role: "Maintenance Technician", tone: "cobalt" as const },
                  { initials: "SR", role: "HSE Officer", tone: "cyan" as const },
                ].map((row) => (
                  <div key={row.role} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold text-background ${
                        row.tone === "violet" ? "bg-violet" : row.tone === "cobalt" ? "bg-cobalt" : "bg-cyan"
                      }`}
                    >
                      {row.initials}
                    </span>
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-foreground">{row.role}</span>
                      <span className="text-xs text-muted-foreground">On shift</span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                Access matched to <span className="text-foreground">who&rsquo;s actually on shift.</span>
              </p>
            </Card>
          </div>

          {/* Maintenance timeline */}
          <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-foreground">Maintenance, on the same system</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Preventive maintenance, work orders, and downtime logging live alongside Quality
                and Safety — not in a separate binder.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {MAINTENANCE_CHECKS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className="mt-6 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Discuss a system like this
              </a>
            </div>

            <ol className="relative flex flex-col gap-4 border-l border-dashed border-border pl-6">
              {TIMELINE.map((item) => (
                <li key={item.time} className="relative">
                  <span
                    className={`absolute -left-[1.65rem] top-1 size-2.5 rounded-full ring-4 ring-background ${TONE_DOT[item.tone]}`}
                    aria-hidden
                  />
                  <div className="rounded-xl border border-border bg-card/60 p-4">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.live && (
                        <span className="size-1.5 animate-pulse rounded-full bg-cyan" aria-hidden />
                      )}
                      {item.time} · {item.tag}
                      {item.live && <span className="text-cyan">— Live</span>}
                    </p>
                    <p className="mt-1 text-sm text-foreground">{item.title}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Case study results */}
          <div className="mt-14">
            <h3 className="text-lg font-medium text-foreground">Case study results</h3>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <p className="text-5xl font-semibold text-foreground">05</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                portals unified into one login — Quality, Safety, Maintenance, Production,
                Visitors.
              </p>
              <div className="mt-6 flex gap-1">
                {PORTAL_STATUS.map((p) => (
                  <span key={p.name} className={`h-1.5 flex-1 rounded-full ${TONE_DOT[p.tone]}`} />
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                <Smartphone className="size-3.5" />
                Portal status
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {PORTAL_STATUS.map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <span className={`size-1.5 rounded-full ${TONE_DOT[p.tone]}`} />
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Live</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="flex flex-col justify-between">
              <div>
                <span className="text-4xl leading-none text-violet">&ldquo;</span>
                <p className="mt-1 text-lg leading-snug text-foreground italic">
                  We didn&rsquo;t build another form tool. We built the system the floor was
                  already running on paper.
                </p>
              </div>
              <div className="mt-6">
                <p className="text-xs text-muted-foreground">— from the project notes</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Offline-first", "Role-based", "Audit-ready"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
