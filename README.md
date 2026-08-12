# S47 DIGITAL

Marketing site for S47 DIGITAL — a digital systems company building custom internal
portals, workflow systems, and operational dashboards around how businesses actually
operate. Migrated from a static single-page site to Next.js (App Router) + TypeScript +
Tailwind CSS + shadcn/ui.

## Stack

- **Next.js 16** (App Router, Server Components by default)
- **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first config, `app/globals.css`)
- **shadcn/ui** (`components.json`, primitives under `components/ui/`)
- **Lucide React** for icons
- Raw **WebGL2** for the hero background (`components/ui/blue-meshy-background.tsx`) —
  no animation/3D library dependency

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build     # production build
npm run start      # serve the production build
npm run lint         # ESLint
npx tsc --noEmit  # TypeScript check
```

## Project structure

```
app/
  layout.tsx       # Metadata, fonts, favicons
  page.tsx           # Composes the page from components/
  globals.css        # Tailwind + S47 design tokens (dark-first palette)
  favicon.ico

components/
  Navbar.tsx          # Client — scroll state, accessible mobile menu
  Hero.tsx              # Server — renders BlueMeshyBackground
  Services.tsx          # Server — "What We Build"
  CaseStudy.tsx          # Server — "Shop Floor Digital Portal" case study
  BrandStory.tsx           # Server — "The System Behind S47"
  Process.tsx                # Server — "How We Work"
  Contact.tsx                  # Client — form validation + contact actions
  Footer.tsx                     # Server
  ui/
    blue-meshy-background.tsx  # Client — WebGL2 shader, see below
    button.tsx, input.tsx, label.tsx, textarea.tsx, select.tsx  # shadcn primitives

lib/
  constants.ts   # Single source of truth: contact details, nav links, project types
  utils.ts          # shadcn's cn() helper

public/
  brand/
    s47-logo.png                  # Full lockup (S47 + DIGITAL), trimmed
    s47-mark.png                    # S47-only mark (used in navbar/footer + favicons)
    s47-favicon-{16,32,48,192,512}.png
    s47-apple-touch-icon-180.png
```

## Contact details

`lib/constants.ts` is the only place email/phone/WhatsApp values live. Every
component that needs a contact action imports from there — update once, applies
everywhere.

## Backend

There is no backend. The Contact form validates client-side and falls back to a
prefilled `mailto:` link, built by `deliverEnquiry()` in `components/Contact.tsx`.
That function is the intended seam for a real backend later — replace its body with
a `fetch("/api/enquiries", { method: "POST", body: JSON.stringify(data) })` call; the
rest of the form (validation, field state, status messaging) needs no changes.

## WebGL background

`components/ui/blue-meshy-background.tsx` renders a single WebGL2 fragment shader —
a flow-warped connective grid with sparse pulsing "node" points, in the S47 palette
(near-black / navy / indigo / cobalt / violet / controlled cyan). It:

- caps `devicePixelRatio` (1.5 on mobile, 2 on desktop) and runs a cheaper shader
  variant (fewer FBM octaves, sparser grid) below the `md` breakpoint,
- pauses its `requestAnimationFrame` loop when the tab is hidden and resumes on
  return,
- freezes on a single static frame when `prefers-reduced-motion: reduce` is set,
- falls back to a static CSS gradient in the same palette if `webgl2` context
  creation fails — the hero never renders blank or broken,
- fully tears down (buffers, program, `WEBGL_lose_context`) on unmount.

## Known follow-ups

- No production domain is set, so `metadataBase`/canonical URLs are intentionally
  omitted from `app/layout.tsx` — add them once a domain is assigned.
- No backend exists yet (see above).
