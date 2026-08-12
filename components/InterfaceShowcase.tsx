"use client";

import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { useCountUp } from "@/lib/useCountUp";

function KpiCard({ label, target, suffix = "" }: { label: string; target: number; suffix?: string }) {
  const { ref, value } = useCountUp(target);
  return (
    <div ref={ref} className="rounded-xl border border-border bg-nearblack/50 p-4">
      <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold text-foreground">
        {value}
        {suffix}
      </p>
    </div>
  );
}

const ACTIONS = [
  { id: "NCR-0231", dept: "Quality", priority: "High", status: "In Review" },
  { id: "WO-1042", dept: "Maintenance", priority: "Medium", status: "Assigned" },
  { id: "PTW-008", dept: "Safety", priority: "High", status: "Pending Approval" },
  { id: "INSP-334", dept: "Quality", priority: "Low", status: "Completed" },
];

const CHART_BARS = [40, 65, 50, 80, 60, 90, 72];

const priorityTone: Record<string, string> = {
  High: "text-red-400 bg-red-400/10",
  Medium: "text-status-pending bg-status-pending/10",
  Low: "text-status-ok bg-status-ok/10",
};

export function InterfaceShowcase() {
  return (
    <section className="border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeInUp} className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">Interface Showcase</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Designed for the people running the operation.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            A UI demonstration of an operations overview interface — illustrative, not live data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7 }}
          className="mt-10 overflow-hidden rounded-2xl border border-border bg-card/50"
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Operations Overview</p>
              <p className="text-[11px] text-muted-foreground">Demonstration interface</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-1.5 sm:flex">
                {["Safety", "Quality", "Maintenance", "Production"].map((d) => (
                  <span key={d} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
                    {d}
                  </span>
                ))}
              </div>
              <span className="relative flex size-8 items-center justify-center rounded-full border border-border">
                <Bell className="size-3.5 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-purple" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-[1fr_1.3fr]">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Open Actions" target={14} />
                <KpiCard label="Pending Reviews" target={5} />
                <KpiCard label="Completed" target={92} suffix="%" />
              </div>

              <div className="rounded-xl border border-border bg-nearblack/50 p-4">
                <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Weekly Throughput</p>
                <div className="mt-3 flex h-20 items-end gap-1.5">
                  {CHART_BARS.map((h, i) => (
                    <motion.span
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.6, delay: 0.15 + i * 0.06 }}
                      className="flex-1 rounded-sm bg-gradient-to-t from-purple/70 to-purple-soft/70"
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-nearblack/50 p-4">
                <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Recent Activity</p>
                <ul className="mt-3 flex flex-col gap-2.5 text-xs text-muted-foreground">
                  <li className="flex justify-between"><span className="text-foreground">Inspection submitted — Line 2</span><span>2 min ago</span></li>
                  <li className="flex justify-between"><span className="text-foreground">Work order assigned</span><span>18 min ago</span></li>
                  <li className="flex justify-between"><span className="text-foreground">Permit approved</span><span>1 hr ago</span></li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-nearblack/50 p-2 sm:p-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                      <th className="px-3 py-2 font-medium">Action</th>
                      <th className="px-3 py-2 font-medium">Department</th>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={staggerContainer(0.08)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                  >
                    {ACTIONS.map((a) => (
                      <motion.tr key={a.id} variants={fadeInUp} className="border-t border-border">
                        <td className="px-3 py-2.5 font-mono text-xs text-foreground">{a.id}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{a.dept}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityTone[a.priority]}`}>
                            {a.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{a.status}</td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
