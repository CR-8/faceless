# Design System Guide
> Dark dashboard aesthetic · ShadCN Zinc + Tailwind CSS

---

## 1. Philosophy

This system is built around **data density without noise**. Every element earns its place. The visual language prioritizes:

- **Hierarchy through light**, not size — brighter = more important
- **Accent scarcity** — neon accents hit harder when they're rare
- **Surface layering** — depth is created by stacking dark backgrounds, not shadows
- **Monospace for data, sans-serif for prose** — two fonts, strict roles

---

## 2. Color System

### 2.1 Background Surfaces

Use a strict layering order. Never skip levels.

| Token | Hex | Tailwind Closest | Role |
|---|---|---|---|
| `--bg-base` | `#0f0f11` | `bg-zinc-950` | Page background |
| `--bg-surface` | `#16161a` | `bg-zinc-900` | Cards, panels |
| `--bg-raised` | `#1c1c22` | `bg-zinc-800` | Nested items inside cards |
| `--bg-overlay` | `#232329` | `bg-zinc-800/70` | Dropdowns, tooltips, hover states |

> **Rule:** Each layer is ~6–8% lighter than the one below. Never use white or near-white backgrounds.

### 2.2 Accent Colors

Use these **sparingly and consistently**. Each color has one job.

| Name | Hex | Role | When to Use |
|---|---|---|---|
| **Lime** | `#c9ff47` | Primary action | CTAs, active nav, key metric highlights |
| **Blue** | `#4f6ef7` | Interactive / info | Selected states, links, calendar blocks |
| **Orange** | `#ff8c42` | Warning / trend | Chart lines, calorie/burn data, alerts |
| **Purple** | `#9b6dff` | Premium / special | Upgrade badges, feature callouts |
| **Teal** | `#2dd4bf` | Success / progress | Completion rings, progress bars |

```css
/* globals.css */
:root {
  --accent-lime:   #c9ff47;
  --accent-blue:   #4f6ef7;
  --accent-orange: #ff8c42;
  --accent-purple: #9b6dff;
  --accent-teal:   #2dd4bf;
}
```

### 2.3 Text Hierarchy

| Level | Hex | Tailwind | Use Case |
|---|---|---|---|
| Primary | `#f0f0f2` | `text-zinc-100` | Headings, stat numbers, active labels |
| Secondary | `#a1a1aa` | `text-zinc-400` | Body copy, card subtitles |
| Muted | `#52525b` | `text-zinc-600` | Hints, meta, placeholder text |
| Disabled | `#3f3f46` | `text-zinc-700` | Disabled inputs, inactive items |

### 2.4 Borders

| Usage | Value | Tailwind |
|---|---|---|
| Subtle dividers | `rgba(255,255,255,0.06)` | `border-zinc-800/60` |
| Card borders | `rgba(255,255,255,0.10)` | `border-zinc-800` |
| Strong / focused | `rgba(255,255,255,0.18)` | `border-zinc-700` |
| Accent focus ring | `var(--accent-blue)` | `ring-indigo-500` |

---

## 3. Typography

### 3.1 Font Stack

```css
/* Two fonts only — enforce strictly */
--font-display: 'Syne', sans-serif;      /* Headings, stat numbers */
--font-body:    'DM Sans', sans-serif;   /* All body text, UI labels */
--font-mono:    'DM Mono', monospace;    /* Data, codes, timestamps */
```

Add to your `layout.tsx`:

```tsx
import { Syne, DM_Sans, DM_Mono } from 'next/font/google'

const syne   = Syne({ subsets: ['latin'], weight: ['400','700','800'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600'] })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400','500'] })
```

### 3.2 Type Scale

| Role | Font | Size | Weight | Tailwind |
|---|---|---|---|---|
| Stat / Hero number | Syne | 40px | 800 | `text-5xl font-extrabold` |
| Page title | Syne | 28px | 700 | `text-3xl font-bold` |
| Card title | Syne | 18px | 700 | `text-lg font-bold` |
| Body default | DM Sans | 14px | 400 | `text-sm` |
| Body medium | DM Sans | 14px | 500 | `text-sm font-medium` |
| Supporting / meta | DM Sans | 12px | 400 | `text-xs` |
| Data label | DM Mono | 11px | 400 | `text-[11px] font-mono tracking-wide` |
| Uppercase label | DM Mono | 10px | 500 | `text-[10px] font-mono uppercase tracking-widest` |

### 3.3 Usage Rules

- **Never use Inter, Roboto, or system fonts** — they kill the premium feel
- Stat numbers always use **Syne** — this is the visual anchor of every card
- Timestamps, token counts, IDs → always **DM Mono**
- Uppercase labels get `letter-spacing: 0.1em` minimum

---

## 4. Spacing

### 4.1 Base Unit

Everything is a **multiple of 4px**. No exceptions.

| Token | px | Tailwind |
|---|---|---|
| xs | 4px | `p-1` / `gap-1` |
| sm | 8px | `p-2` / `gap-2` |
| md | 12px | `p-3` / `gap-3` |
| base | 16px | `p-4` / `gap-4` |
| lg | 20px | `p-5` / `gap-5` |
| xl | 24px | `p-6` / `gap-6` |
| 2xl | 32px | `p-8` / `gap-8` |
| 3xl | 48px | `p-12` / `gap-12` |

### 4.2 Layout Spacing

| Context | Value | Tailwind |
|---|---|---|
| Card internal padding | 20–24px | `p-5` or `p-6` |
| Gap between cards | 12–16px | `gap-3` or `gap-4` |
| Section-to-section | 48–64px | `space-y-12` to `space-y-16` |
| Page horizontal padding | 24–32px | `px-6` or `px-8` |
| Sidebar width (icon-only) | 52px | `w-[52px]` |
| Sidebar width (expanded) | 220px | `w-[220px]` |

---

## 5. Border Radius

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `r-sm` | 6px | `rounded-md` | Badges, icon buttons, small chips |
| `r-md` | 10px | `rounded-xl` | Buttons, inputs, nav icons |
| `r-lg` | 16px | `rounded-2xl` | **Cards, panels — default** |
| `r-xl` | 24px | `rounded-3xl` | Modals, large surface panels |
| `r-full` | 9999px | `rounded-full` | Pills, avatars, toggles |

> **Default card:** always `rounded-2xl`. Nested items inside: `rounded-xl`. Tags/badges: `rounded-full`.

---

## 6. Shadows & Elevation

Avoid large drop shadows — darkness does the elevation work. Use subtle shadows only.

```css
--shadow-sm:     0 1px 3px rgba(0,0,0,0.4);
--shadow-md:     0 4px 16px rgba(0,0,0,0.5);
--shadow-lg:     0 8px 32px rgba(0,0,0,0.6);

/* Accent glow — use very sparingly on primary CTAs only */
--shadow-lime:   0 0 20px rgba(201,255,71,0.18);
--shadow-blue:   0 0 20px rgba(79,110,247,0.20);
```

| Level | Usage |
|---|---|
| `shadow-sm` | Subtle card lift on hover |
| `shadow-md` | Active/selected cards |
| `shadow-lime` | Primary CTA button hover state only |

---

## 7. Components

### 7.1 Buttons

```tsx
// Primary — lime, used once per view max
<button className="bg-lime-400 text-zinc-950 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-lime-300 transition-colors">
  Get Premium
</button>

// Secondary — blue
<button className="bg-indigo-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-400 transition-colors">
  Search Activities
</button>

// Ghost — for tertiary actions
<button className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
  Today ▾
</button>

// Outline — minimal presence
<button className="border border-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-xl hover:border-zinc-500 transition-colors">
  Add Activity
</button>

// Dashed — empty/add states
<button className="border border-dashed border-zinc-700 text-zinc-500 text-sm px-4 py-2.5 rounded-xl hover:border-zinc-500 hover:text-zinc-400 transition-colors">
  + Add Activity
</button>
```

**Size variants:**

```tsx
// sm
className="px-3 py-1.5 text-xs rounded-lg"

// default
className="px-4 py-2.5 text-sm rounded-xl"

// lg
className="px-6 py-3 text-base rounded-xl"
```

### 7.2 Cards

```tsx
// Base card
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
  {/* content */}
</div>

// Card with hover
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors cursor-pointer">
  {/* content */}
</div>

// Accent card (blue tint — e.g. calendar, highlighted panel)
<div className="bg-indigo-600 rounded-2xl p-5">
  {/* content */}
</div>
```

### 7.3 Stat Card

```tsx
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
  {/* Label */}
  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
    Steps
  </p>

  {/* Value */}
  <p className="font-display text-5xl font-extrabold text-zinc-100 mt-1.5 mb-1">
    8 745
  </p>

  {/* Meta */}
  <p className="text-xs text-zinc-600">
    Goal <span className="text-zinc-400">8,000</span> · Average{" "}
    <span className="text-lime-400">9,450 ↑</span>
  </p>

  {/* Progress bar */}
  <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
    <div className="h-full bg-lime-400 rounded-full" style={{ width: "87%" }} />
  </div>
</div>
```

### 7.4 Inputs

```tsx
// Default input
<input
  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
  placeholder="Search for some activities"
/>

// With label and hint
<div className="flex flex-col gap-1.5">
  <label className="text-xs font-medium text-zinc-400">Sleep Goal</label>
  <input className="..." />
  <p className="text-[11px] text-zinc-600">Recommended: 7–8 hours</p>
</div>

// Error state
<input className="... border-red-500/50 focus:border-red-400 focus:ring-red-400" />
<p className="text-[11px] text-red-400">Exceeds recommended maximum</p>
```

### 7.5 Badges

```tsx
// Semantic badge map
const variants = {
  active:   "bg-lime-400/10 text-lime-400",
  info:     "bg-indigo-500/15 text-indigo-400",
  warning:  "bg-orange-500/12 text-orange-400",
  premium:  "bg-violet-500/12 text-violet-400",
  neutral:  "bg-zinc-800 text-zinc-400",
  error:    "bg-red-500/12 text-red-400",
}

// Usage
<span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium ${variants.active}`}>
  ● Active
</span>
```

### 7.6 Progress Ring (Circular)

```tsx
// SVG donut ring — for sleep time, completion metrics
const radius = 40
const circumference = 2 * Math.PI * radius
const progress = 0.93 // 93%

<svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
  {/* Track */}
  <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
  {/* Fill */}
  <circle
    cx="50" cy="50" r={radius} fill="none"
    stroke="#2dd4bf"
    strokeWidth="8"
    strokeLinecap="round"
    strokeDasharray={circumference}
    strokeDashoffset={circumference * (1 - progress)}
    className="transition-all duration-700"
  />
</svg>
```

### 7.7 Activity Card

```tsx
<div className="bg-indigo-600 rounded-2xl p-4 relative cursor-pointer hover:bg-indigo-500 transition-colors">
  {/* Arrow */}
  <span className="absolute top-3 right-3 text-indigo-300 text-sm">↗</span>

  {/* Avatar group */}
  <div className="flex -space-x-2 mb-3">
    <div className="w-7 h-7 rounded-full bg-indigo-400 border-2 border-indigo-600" />
    <div className="w-7 h-7 rounded-full bg-indigo-300 border-2 border-indigo-600" />
  </div>

  {/* Info */}
  <p className="font-display font-bold text-white text-base">Running</p>
  <p className="text-indigo-200 text-sm font-mono mt-0.5">7:00 AM</p>
</div>
```

### 7.8 Navigation Sidebar

```tsx
// Icon-only sidebar
<nav className="w-[52px] bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-1.5">
  {navItems.map((item) => (
    <button
      key={item.id}
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
        isActive
          ? "bg-lime-400 text-zinc-950"
          : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      )}
    >
      <item.Icon size={18} />
    </button>
  ))}
</nav>
```

---

## 8. Tailwind Config Extensions

Add to `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans:    ["DM Sans", "sans-serif"],
        mono:    ["DM Mono", "monospace"],
      },
      colors: {
        accent: {
          lime:   "#c9ff47",
          blue:   "#4f6ef7",
          orange: "#ff8c42",
          purple: "#9b6dff",
          teal:   "#2dd4bf",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-lime": "0 0 20px rgba(201,255,71,0.18)",
        "glow-blue": "0 0 20px rgba(79,110,247,0.20)",
      },
    },
  },
}
export default config
```

---

## 9. ShadCN Zinc Overrides

In your `globals.css`, after the ShadCN defaults:

```css
@layer base {
  :root {
    /* Override ShadCN defaults for a darker base */
    --background:   222 10% 6%;    /* #0f0f11 */
    --card:         240 7% 9%;     /* #16161a */
    --popover:      240 7% 11%;    /* #1c1c22 */
    --border:       240 5% 16%;    /* zinc-800 */
    --input:        240 5% 16%;
    --ring:         226 89% 64%;   /* indigo-500 */

    /* Custom accent tokens */
    --accent-lime:   83 100% 63%;
    --accent-blue:   226 89% 64%;
    --accent-orange: 25 100% 63%;
    --accent-purple: 262 100% 71%;
  }
}
```

---

## 10. Layout Patterns

### Dashboard Grid

```tsx
// Top row: wide chart + calendar
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">{/* Chart card */}</div>
  <div className="col-span-1">{/* Calendar card */}</div>
</div>

// Bottom row: stat cards
<div className="grid grid-cols-3 gap-4 mt-4">
  <StatCard label="Steps" value="8 745" />
  <StatCard label="Calories" value="700" />
  <StatCard label="Activity" value="2h 45m" />
</div>

// Bottom section: info cards + activities
<div className="grid grid-cols-3 gap-4 mt-4">
  <div className="col-span-1 flex flex-col gap-4">
    <SleepCard />
    <WeightCard />
  </div>
  <div className="col-span-2">
    <ActivitiesCard />
  </div>
</div>
```

---

## 11. Do's and Don'ts

### ✅ Do

- Use lime **only** for the single most important action per screen
- Layer backgrounds: base → surface → raised → overlay
- Use `font-mono` for all numbers, timestamps, and data values
- Keep borders at 6–10% white opacity — barely visible
- Use tinted backgrounds for badges: `bg-lime-400/10 text-lime-400`
- Round all cards to `rounded-2xl` minimum
- Use color to communicate data meaning (orange = burn, blue = cool, lime = active)

### ❌ Don't

- Don't use more than 2 accent colors in a single card
- Don't use white or light backgrounds anywhere
- Don't use `border-zinc-500` or stronger — too harsh
- Don't use `font-bold` on body text — reserve weight for display elements
- Don't use drop shadows as a primary depth tool — use surface layering instead
- Don't make buttons the same color as data highlights
- Don't use Inter, Roboto, or system fonts

---

## 12. Motion & Interaction

Keep animations **fast and subtle**. The UI should feel snappy, not decorative.

```css
/* Standard transition — use on everything interactive */
transition: all 150ms ease;

/* Progress bars, rings — slightly slower for perceived smoothness */
transition: all 400ms ease;

/* Hover state standard */
hover:bg-zinc-800  /* surface lift */
hover:border-zinc-700  /* border reveal */
hover:text-zinc-200   /* text brighten */
```

**Avoid:** bouncy springs, long fade-ins, animated backgrounds. The reference design is calm and data-focused — motion should confirm actions, not entertain.

---

## 13. Quick Reference Card

```
SURFACES      bg-zinc-950 → bg-zinc-900 → bg-zinc-800 → bg-zinc-700
ACCENTS       lime #c9ff47 · blue #4f6ef7 · orange #ff8c42 · purple #9b6dff
TEXT          zinc-100 · zinc-400 · zinc-600
RADIUS        cards: rounded-2xl · buttons: rounded-xl · tags: rounded-full
FONTS         headings+numbers: Syne · body: DM Sans · data: DM Mono
BORDERS       border-zinc-800 default · border-zinc-700 hover/focus
SPACING       card pad: p-5/p-6 · gap: gap-3/gap-4 · page: px-6/px-8
TRANSITION    150ms ease (UI) · 400ms ease (progress)
```