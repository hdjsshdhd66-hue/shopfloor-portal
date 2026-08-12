import { ArrowRight, FileText } from "lucide-react";

import { BlueMeshyBackground } from "@/components/ui/blue-meshy-background";
import { Button } from "@/components/ui/button";

const INDICATORS = ["Custom Systems", "Connected Operations", "Workflow Digitalization"];

export function Hero() {
  return (
    <section id="top" className="relative flex min-h-[92vh] items-center overflow-hidden pt-16">
      <BlueMeshyBackground />
      {/* Extremely subtle grid over the mesh — detail, not decoration. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            S47 DIGITAL — Digital Systems for Modern Operations
          </p>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Custom digital systems, built around how you actually work.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            S47 DIGITAL designs internal portals, workflow systems, and operational tools around
            real business processes — instead of forcing your team into generic software.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <a href="#contact">
                Discuss Your Project
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <a href="#case-study">
                <FileText className="size-4" />
                View Case Study
              </a>
            </Button>
          </div>

          <ul className="mx-auto mt-14 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {INDICATORS.map((label) => (
              <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-cobalt" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
