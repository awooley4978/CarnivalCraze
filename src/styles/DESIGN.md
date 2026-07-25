# Carnival Craze — Design System

## Aesthetic: 90s Cartoon Carnival

Carnival Craze lives in the space where Saturday morning cartoons collide with a
midway at midnight. The visual language draws from the golden era of gross-out,
rubber-hose, and slapstick animation — the shows that aired between toy commercials
and cereal ads.

### Primary References

| Show | What we steal |
|---|---|
| **Ren & Stimpy** | Extreme close-ups, painterly background cards, impossibly saturated color, gross textures made beautiful |
| **Rocko's Modern Life** | Wobbly linework, surreal background gags, suburban-weird color palettes, everything slightly off-kilter |
| **Animaniacs** | Bold title-card typography, slapstick energy, exaggerated squash-and-stretch, rapid-fire visual jokes |
| **Nicktoons era (general)** | The orange splat logo energy — loud, unapologetic, joyful chaos. No beige allowed. |

### Core Philosophy

> **Nothing subtle. Everything bouncy.**

Every element on screen should feel like it *could* spring to life at any moment.
Borders are thick. Shadows are solid (no blur — cartoon drop-shadows are sharp
ink offsets). Colors are eye-searing. Type screams. The carnival is a place of
excess, and the design should match.

---

## Color Usage Guide

### The Palette

| Token | Hex | Role |
|---|---|---|
| `circus-red` | `#FF2A2A` | Primary action color. Big top stripes, CTA buttons, "PLAY" labels. |
| `hot-magenta` | `#FF1493` | Ribbon banners, "FREE PLAY" badges, confetti. Pure 90s energy. |
| `electric-yellow` | `#FFE600` | Ticket counter background, highlighted text, prize sparkle accents. |
| `acid-green` | `#39FF14` | Success states, "WIN" indicators, slime/gross-out effects. |
| `deep-purple` | `#7B2D8E` | Booth card backgrounds, mysterious/rare prize auras, secondary stripes. |
| `tangerine` | `#FF6B1A` | Warm accent, confetti pieces, secondary buttons. |
| `sky-pop` | `#00BFFF` | Duck pond water, sky sections, link highlights. |
| `tent-canvas` | `#FFF8E7` | Page background (warm off-white, never sterile #FFF), body text on dark. |
| `midnight` | `#1A0A2E` | Full-page dark backdrop. The night sky above the carnival. |
| `ink` | `#2D1B4E` | Body text color (dark purple-black, softer than pure #000). |
| `bulb-gold` | `#FFD700` | Lit carnival bulbs, glow effects. |
| `bulb-off` | `#4A3550` | Unlit bulbs (muted purple, sits quietly on dark backgrounds). |
| `ticket-pink` | `#FF6EC7` | Ticket stub accents, secondary highlight. |
| `prize-sparkle` | `#E0FF00` | Rare/ultimate prize glow, free-play pulse. |
| `toon-shadow` | `#1A002E` | All drop-shadows. Solid, sharp, no blur radius. |

### Usage Rules

1. **Dark backgrounds dominate.** The carnival happens at night. Use `midnight` as
   the page background; let bright colors pop against it.
2. **One screaming accent per section.** Don't pit `acid-green` against
   `hot-magenta` at equal weight — one wins, the other supports.
3. **Text is `tent-canvas` on dark, `ink` on light.** Never pure white, never pure black.
4. **Gradients are rare.** 90s cartoons used flat color with cel shading. When you
   need depth, use hard-edged shadows (`toon-shadow`), not gradients.

---

## Typography

### Font Stack

| Role | Font | Fallback |
|---|---|---|
| **Headings** (h1, h2, h3) | **Luckiest Guy** | Impact, Arial Black, sans-serif |
| **Body / UI** | **Fredoka** (weight 400–700) | Comic Sans MS, Segoe UI, sans-serif |

**Luckiest Guy** is a heavy, bubble-letter display face that reads like a carnival
sign painter's fever dream. Use it for:
- Page titles
- Game booth names
- Ticket counter numbers
- "PLAY" / "WIN" / "FREE PLAY" calls-to-action
- Prize names on the shelf

**Fredoka** is a rounded, friendly sans-serif with excellent readability at small
sizes. Use it for:
- Game instructions and body copy
- Button labels (non-headline)
- Navigation labels
- Ticket balance readouts (the number itself uses Luckiest Guy)

### Typography Rules

- Headings always get a cartoon text-shadow: solid `toon-shadow` offset (3px 3px 0)
  with a 1px outline in all four directions. This is defined in the base layer.
- Body text is `1rem` minimum on mobile — cartoons are for kids, make it readable.
- Letter-spacing on headings is slightly positive (`0.02em`) to let the bubble
  letters breathe.

---

## Animation Timing Principles

All motion follows cartoon physics:

1. **Snap in, wobble out.** Entrances use `bounce-in` (overshoot → settle). Nothing
   fades in linearly — it either bounces or snaps.
2. **Staggered chaos.** Bulbs and confetti never blink/fall in unison. Every piece
   gets a different delay. The carnival feels alive, not robotic.
3. **Short and frequent.** Animations are 0.4s–1.5s. Fast, punchy, repeatable.
4. **Easing is bouncy.** `cubic-bezier(0.34, 1.56, 0.64, 1)` is the default
   overshoot curve. For continuous motion (wave, pulse), use `ease-in-out`.
5. **Don't animate everything at once.** The tent waves slowly (4s cycle), bulbs
   blink fast (1.5s), confetti falls at its own pace (3s). Layers of motion
   create depth without chaos.

### Animation Catalog

| Animation | Duration | Easing | Use Case |
|---|---|---|---|
| `blink-bulb` | 1.5s | step-end | Carnival bulb strings |
| `tent-stripe-wave` | 4s | ease-in-out | Big top tent header |
| `bounce-in` | 0.6s | cubic-bezier(0.34,1.56,0.64,1) | Element entrances |
| `confetti-fall` | 3s (vary) | linear | Win celebrations |
| `pulse-glow` | 1.2s | ease-in-out | FREE PLAY / rare prize |
| `wiggle` | 0.4s | ease-in-out | Character wobble, hover states |

---

## Spacing & Layout Philosophy

### Big, Bouncy, Breathable

90s cartoons used wide shots and big gestures. The UI should feel the same:

- **Component padding** (`bouncy` = 2rem): Booth cards, game areas, prize shelf
  items all get generous internal space.
- **Section gaps** (`carnival` = 3rem): Space between the tent header and the
  booth grid, between the game area and the ticket counter.
- **Hero breathing room** (`ringmaster` = 4rem): The entrance screen's tent and
  title get room to command attention.
- **Tight accents** (`tightrope` = 0.5rem): Ticket counter badges, inline icon
  gaps — only where information density matters.

### Mobile-First

- Single-column layout by default. Booth cards stack vertically on phones.
- The tent header scales to viewport width. Bulb strings are full-width.
- On tablets and up (`md:` / `lg:`), booth cards arrange 2–3 per row.
- The ticket counter is sticky at the top of the viewport on mobile (always visible).
- All tap targets are minimum 44×44px.

---

## Key Components (Visual Direction)

### Carnival Entrance (Home Screen)

```
┌─────────────────────────────────┐
│  🌟 ⚫ 🌟 ⚫ 🌟 ⚫ 🌟 ⚫ 🌟 ⚫  │  ← blinking bulb string
│ ╔═════════════════════════════╗ │
│ ║  ░░ RED ░░ WHITE ░░ RED ░░ ║ │  ← CSS striped tent header
│ ║    🎪 CARNIVAL CRAZE 🎪    ║ │  ← Luckiest Guy, huge, tent-canvas
│ ║  ░░ RED ░░ WHITE ░░ RED ░░ ║ │
│ ╚═════════════════════════════╝ │
│                                 │
│  🎫  TICKETS: 42               │  ← ticket counter (sticky)
│                                 │
│ ┌─────────────────────────────┐ │
│ │  🎈  BALLOON POP      🎈   │ │  ← booth card 1
│ │     pop 'em all!           │ │     (deep-purple bg, blob radius,
│ │           ▶ PLAY            │ │      toon border & shadow)
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  🦆  DUCK POND         🦆  │ │  ← booth card 2
│ │     pick a duck, win big!  │ │
│ │           ▶ PLAY            │ │
│ └─────────────────────────────┘ │
│                                 │
│  🏆  Prize Shelf  →            │  ← link to prize shelf
└─────────────────────────────────┘
```

### Booth / Game Cards

- Background: `deep-purple` with `toon-shadow` border (4px solid `toon-shadow`)
- Shape: `radius-blob` (asymmetrical rounded corners — 2.5rem 1.5rem 3rem 2rem)
- Shadow: hard offset (6px 6px 0 `toon-shadow`), shifts on hover
- Title: `font-carnival` in `electric-yellow`
- Body: `font-toon` in `tent-canvas`
- CTA button: `circus-red` background, `bounce-in` on entry

### Ticket Counter

- Floating pill shape (`radius-pill`)
- Background: `electric-yellow`, text: `ink`
- Font: `font-carnival` for the number
- Hard border and shadow (`toon-shadow`)
- Sticky positioning on mobile

### Prize Shelf

- Dark background (`midnight`)
- Each prize on a "shelf" — a horizontal stripe of `deep-purple`
- Prizes that are won glow with `prize-sparkle` aura
- Locked/unearned prizes appear dimmed with `bulb-off` tint
- Prize names in `font-carnival`

---

## File Organization

```
src/styles/
├── app.css          ← Main entry: @imports theme.css + animations.css
├── theme.css        ← Tailwind v4 @theme tokens (colors, fonts, radii, spacing)
│                      + base layer resets + utility classes
├── animations.css   ← All @keyframes + convenience classes + delay helpers
└── DESIGN.md        ← This document
```

### How the Engineer Uses This

1. Import the CSS files in `app.css` (or directly in the root layout):
   ```css
   @import "./theme.css";
   @import "./animations.css";
   ```

2. Load Google Fonts in the HTML `<head>`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```

3. Use Tailwind classes as normal — custom colors, fonts, and radii are available:
   ```jsx
   <h1 className="font-carnival text-electric-yellow">CARNIVAL CRAZE</h1>
   <div className="bg-deep-purple rounded-blob border-toon card-booth">
   <span className="ticket-counter">🎫 42</span>
   <div className="animate-blink-bulb delay-bulb-3">💡</div>
   ```

---

## What NOT To Do

- ❌ No pure white (`#FFF`) or pure black (`#000`) — always use `tent-canvas` / `ink`
- ❌ No CSS `box-shadow` with blur radius on UI elements — use solid `toon-shadow` offset
- ❌ No subtle transitions (`transition-all duration-300`) — use bouncy curves or nothing
- ❌ No thin borders (`border` = 1px) — minimum 3px for UI elements, 4px for cards
- ❌ No serif fonts anywhere
- ❌ No gradients as primary backgrounds — flat color with hard shadows is the 90s way
- ❌ No synchronized animations — always stagger with delay classes
