import { Users, GitCommitHorizontal, Database, Cpu } from "lucide-react";

const FOUNDATIONS = [
  { label: "People", icon: Users },
  { label: "Process", icon: GitCommitHorizontal },
  { label: "Data", icon: Database },
  { label: "Technology", icon: Cpu },
];

const PRINCIPLES = ["Connect", "Simplify", "Digitize", "Automate", "Track", "Analyze", "Improve"];

export function BrandStory() {
  return (
    <section className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            The System Behind S47
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            S stands for Systems.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every S47 build rests on the same four foundations and moves through the same seven
            principles — the architecture behind the name, not a slogan we repeat on every page.
          </p>
        </div>

        {/* 4 Foundations — compact nodes, no line between them: they're the
            ground the system stands on, not a sequence. */}
        <div className="mt-12">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            4 Foundations
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FOUNDATIONS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-cobalt/30 bg-cobalt/10">
                  <Icon className="size-4 text-cobalt-soft" />
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7 Principles — a connected sequence: this is the flow the work
            moves through, so a line joining the nodes is meaningful here. */}
        <div className="mt-10">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            7 Principles
          </p>
          <div className="relative mt-5">
            <div
              aria-hidden
              className="absolute top-4 right-4 left-4 hidden h-px bg-gradient-to-r from-cobalt/40 via-violet/40 to-cyan/40 sm:block"
            />
            <ol className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
              {PRINCIPLES.map((step) => (
                <li key={step} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-violet/30 bg-background text-xs font-medium text-violet-soft">
                    {step.slice(0, 1)}
                  </span>
                  <span className="text-xs text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          4 Foundations. 7 Principles.{" "}
          <span className="text-foreground">One Connected System.</span>
        </p>
      </div>
    </section>
  );
}
