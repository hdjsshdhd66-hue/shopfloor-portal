import Image from "next/image";

import { CONTACT_EMAIL_HREF, NAV_LINKS, SITE_TAGLINE } from "@/lib/constants";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 sm:px-8 md:grid-cols-4">
        <div className="col-span-2 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/s47-mark.png" alt="S47" width={1253} height={518} className="h-7 w-auto" />
            <span className="text-sm font-medium tracking-[0.2em] text-foreground/90">DIGITAL</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{SITE_TAGLINE}</p>
          <p className="mt-4 text-xs text-muted-foreground/70">© {YEAR} S47 DIGITAL. All rights reserved.</p>
        </div>

        <div>
          <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Navigation</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">Contact</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li>
              <a href="#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Start a project
              </a>
            </li>
            <li>
              <a
                href={CONTACT_EMAIL_HREF}
                aria-label="Email S47 DIGITAL"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Email S47
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
