const STEPS = [
  { n: 1, title: "Discovery", description: "Understand the business, the team, and the problem worth solving." },
  {
    n: 2,
    title: "Workflow Mapping",
    description: "Document how the work actually happens today — not how the org chart says it should.",
  },
  { n: 3, title: "System Design", description: "Design the screens, roles, and data model around that real workflow." },
  { n: 4, title: "Development", description: "Build the system, in step with the team that will use it." },
  { n: 5, title: "Testing", description: "Run it against real cases, on the actual devices your team will use." },
  {
    n: 6,
    title: "Handover",
    description: "Documentation, training, and a system your team — or your IT department — can own.",
  },
];

export function Process() {
  return (
    <section id="how-we-work" className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            How We Work
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            We map the workflow before we design the system.
          </h2>
        </div>

        {/* Desktop / tablet: horizontal connected flow. Mobile: vertical. */}
        <div className="relative mt-14">
          <div
            aria-hidden
            className="absolute top-4 right-6 left-6 hidden h-px bg-gradient-to-r from-cobalt/40 via-violet/40 to-cyan/40 md:block"
          />
          <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((step) => (
              <li key={step.n} className="text-left">
                <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
                  {step.n}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
