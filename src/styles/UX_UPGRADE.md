# Carnival Craze — UX Upgrade: From Web Prototype to Premium Mobile Game

> **Target:** Evolve every screen from a web-page layout (cards, grids, URL links, "← Back" buttons) into a native-feeling mobile carnival game — full-screen immersive scenes with physics, animation, sound hooks, and gesture-driven navigation.

---

## Table of Contents

1. [Midway Walk — Full-Screen Swipe Carousel](#1-midway-walk--full-screen-swipe-carousel)
2. [Scene Transitions — Cinematic, Not Browser Navigation](#2-scene-transitions--cinematic-not-browser-navigation)
3. [Immersive Game Screen Redesign](#3-immersive-game-screen-redesign)
4. [Trophy Room — 3D Scrolling Gallery](#4-trophy-room--3d-scrolling-gallery)
5. [Ambient Life — The Carnival Breathes](#5-ambient-life--the-carnival-breathes)
6. [Sound Moment Map](#6-sound-moment-map)
7. [New Design Tokens & CSS Extensions](#7-new-design-tokens--css-extensions)
8. [Implementation Roadmap for the Engineer](#8-implementation-roadmap-for-the-engineer)

---

## 1. Midway Walk — Full-Screen Swipe Carousel

### What we're replacing

The current home screen (`index.tsx`) renders a `<BulbString />` (12 static bulbs), a striped tent header, a sticky ticket counter, and a `<div>` grid of `BoothCard` components — each a `card-booth` rectangle with emoji, title, cost, and a `<Link>` or `onClick` that navigates via React Router. This is a **web page layout**.

### What we're building

A **horizontal swipe carousel** where each booth is a **full-viewport scene**. The user swipes left/right to "walk" the midway. Each booth fills the screen — no cards, no grid, no scrolling gaps. The carousel snaps to booths. Touching a booth enters it via a cinematic transition.

### Component Hierarchy

```
<MidwayWalk>                  ← full-viewport container (100dvh × 100dvw), overflow hidden
  ├── <BulbMarquee />         ← blinking bulb string spans ENTIRE viewport width at top
  │     └── 24–30 animated bulbs with staggered delays, z-index above everything
  │
  ├── <CarouselTrack>         ← horizontal flex container, translateX driven by swipe/state
  │     ├── <BoothScene index={0}>   ← 🎯 Balloon Pop booth
  │     ├── <BoothScene index={1}>   ← 🥛 Milk Bottle Toss booth
  │     └── <BoothScene index={2}>   ← 🦆 Duck Pond booth
  │
  ├── <WalkIndicator />       ← bottom-center: 3 mini tent icons showing current position
  │
  ├── <TicketCounter />       ← floating pill, bottom-right, always visible (persistent)
  │
  └── <MidwayGround />        ← bottom strip: dirt/grass texture, scrolls with carousel
```

### BoothScene Anatomy (per booth)

Each `BoothScene` is a full-viewport-width flex container (`min-width: 100vw`) with **four parallax layers**:

- **Layer 1 (Backdrop, 0.2×):** Night sky, stars, distant carnival lights, ferris wheel silhouette
- **Layer 2 (Tent Structure, 0.5×):** The booth tent — striped canvas, draped flaps, the physical shape
- **Layer 3 (Foreground Details, 1.0×):** Booth signage, price board, thematic props, the "PLAY" target
- **Layer 4 (Ground/Mat, 1.2×):** Sawdust, welcome mat, rope barriers — closest to camera

Parallax is driven by the carousel's horizontal scroll position via JavaScript.

### Booth Visual Identities

**Booth 0: 🎯 Balloon Pop**
- Tent: `circus-red` vertical stripes on `tent-canvas`
- Background: Scattered balloon shapes in `hot-magenta`, `acid-green`, `tangerine` at different depths with subtle bob animation
- Signage: "POP 'EM ALL!" in `font-carnival`, `electric-yellow`, on a painted wooden board
- Price: Chalkboard: "3 DARTS — 2 🎟️"
- Ground: Red-and-white striped mat

**Booth 1: 🥛 Milk Bottle Toss**
- Tent: Warm canvas tones — `tent-canvas` base with `tangerine` stripes
- Background: Silhouette of a bottle pyramid with soft glow
- Signage: "KNOCK 'EM DOWN!" — weathered wood sign
- Price: Chalkboard: "4 THROWS — 3 🎟️"
- Props: Baseball held by a rubber-hose cartoon hand, animated beckoning gesture

**Booth 2: 🦆 Duck Pond**
- Tent: `sky-pop` and `deep-purple` stripes
- Background: Rippling pond with duck silhouettes bobbing
- Signage: "PICK A DUCK!" on a life-preserver ring
- Price: Chalkboard: "3 PICKS — 1 🎟️"
- Props: Rubber duckies floating at bottom edge with CSS bobbing

### WalkIndicator

3 miniature tent icons (▲ shapes with stripes), each ~24px wide at bottom-center. Active booth glows `bulb-gold` with 1.2× scale. Inactive: `bulb-off` color. Smooth color/scale transition on snap.

### BulbMarquee — Full-Width Upgrade

- Extends edge-to-edge: 24–30 bulbs across full viewport width
- Larger: `w-5 h-5` (up from `w-4 h-4`)
- Wire/string visible: thin `bulb-off` line connecting all bulbs
- Chaotic blink pattern: ~60% lit at any moment with chase-light feel, some flickering
- Fixed position, z-50, persistent across ALL screens

### TicketCounter — Persistent

Floating bottom-right badge. Slightly larger than current. Pulse-glow + quick bounce-up flash when tickets change. Persists across all screens without re-mounting.

### Swipe Mechanics (Engineer Notes)

- `scroll-snap-type: x mandatory` on carousel track
- Each `BoothScene` has `scroll-snap-align: center`
- Parallax: JavaScript `scrollLeft` → `translateX` on each layer × speed factor
- Booth tap (not swipe): triggers "enter booth" transition
- Swipe threshold: >30% viewport width to snap to next booth

---

## 2. Scene Transitions — Cinematic, Not Browser Navigation

No more `<Link to="/balloon-pop">` and browser page loads. Transitions are animations within a single immersive space.

### Transition A: Entering a Booth (Curtain Flaps)

**Trigger:** User taps "PLAY" on a BoothScene.

**Animation Sequence (total: ~800ms):**

| Phase | Time | What Happens |
|---|---|---|
| Curtain Gather | 0–200ms | Dark vignette closes from edges. Tent flaps animate inward. Booth scales up 1.05×. Ease-in. |
| Darkness | 200–400ms | Screen goes fully dark (`midnight` at opacity 1.0). Brief tension pause. |
| Curtain Open | 400–800ms | Game screen fades in. Curtain flaps animate outward. Content bounces in (`.animate-bounce-in`). |

**CSS:** Left/right tent flap divs with `repeating-linear-gradient` stripes. `.tent-flap-left.closed` → `translateX(0)`, `.open` → `translateX(-100%)`. Managed by a `SceneTransition` state machine component.

### Transition B: Exiting a Game

**Triggers (no "← Back to Midway" link):**
1. **Swipe-down gesture:** touchstart → touchend, y displacement >80px, velocity >0.3px/ms
2. **In-world exit sign:** A glowing "EXIT →" sign in `acid-green` rendered inside the booth interior

**Animation:** Reverse of enter — curtain close → dark → curtain open on midway.

### Transition C: FREE PLAY Event Flash

- Screen flashes `prize-sparkle` white for 200ms
- `hot-magenta` ribbon banner drops from top: "🎪 FREE PLAY! 🎪"
- Ticket cost flips to "FREE" with sparkle animation
- Duration: 2.5 seconds, then banner retracts

### Alternative: Circular Iris Wipe

For Duck Pond: `clip-path: circle()` shrinks to center point, then expands back. Feels like a water ripple / Looney Tunes iris.

---

## 3. Immersive Game Screen Redesign

### General Principles (All Games)

| Before (Prototype) | After (Premium) |
|---|---|
| `<h1>` page title at top | Title painted on booth back wall or hanging sign — **diegetic UI** |
| Sticky counter pills floating at top | Counters as **in-world elements** — chalkboards, ammo displays, punched tickets |
| "← Back to Midway" text link | **Swipe-down gesture** or **in-world exit sign** |
| Win/lose overlay inside play area `<div>` | **Full-screen takeover** — confetti fills viewport, booth shakes, tent walls animate |
| Dark rectangle play area | **Booth interior** — visible tent ceiling, walls, shelves, wooden counters |
| Bulb string only on home screen | **BulbMarquee persistent** across all screens (fixed position, global) |

### 3a. Balloon Pop Redesign

**Booth Interior:** Red-striped tent fabric as back wall. Balloons pinned to a corkboard hanging on the tent wall. Wooden counter at bottom with darts resting.

**In-World UI:**
- Dart counter: 3 dart shapes (🎯) embedded in wooden strip. Used darts greyed out/knocked over — **physical ammo display**
- Ticket balance: Small chalkboard on right wall: "🎟️ 42" in chalk font
- Instructions: Painted wooden sign above corkboard

**Win State:** Full viewport takeover — 40–60 confetti pieces, tent walls shake (intensified `tent-stripe-wave`), "YOU WIN!" banner unfurls from top, prize reveal with spotlight effect.

**Animations:**
- Balloon pop: scales 1.3× → 0 with 4–6 colored particle burst
- Near-win (2+ popped, 1 dart left): remaining balloon wiggles faster, red vignette pulse on screen edges

### 3b. Milk Bottle Toss Redesign

**Booth Interior:** Warm canvas tent walls. Bottle pyramid on wooden ledge against back wall. Baseball crate at bottom.

**In-World UI:**
- Throw counter: 4 baseball slots in wooden crate. Used slots empty
- Ticket balance: Chalkboard on side wall

**Animations:**
- Bottle topple: 3-stage — initial hit (tilt 20°), topple (rotate 80° with translate), settle (slight bounce, opacity fade)
- Chain reactions: 80ms stagger between each falling bottle
- Dust particles on impact

### 3c. Duck Pond Redesign

**Booth Interior:** Blue-striped tent (sky-pop + deep-purple). Circular pond basin built into the floor. Ducks float in water.

**In-World UI:**
- Pick counter: 3 duck icons in a row on mini shelf. Used picks flipped over (grey)
- Ticket balance: Chalkboard on tent wall

**Water Effects:**
- `water-ripple` keyframe: expanding concentric circles on pond surface
- Ducks bob with staggered `duck-dip` animation
- Pick splash: `splash-droplet` particles (existing, made more dramatic)
- Reveal tension: duck sinks below water (300ms), pops back up with ticket value
- Ticket reveal: value "+3 🎟️" rises from water like a bubble and pops

### Win/Lose States — Full Screen Takeover

1. **Background:** Game scene darkens (`midnight` at 90% opacity)
2. **Central Card:** Large bouncy card (`border-toon`, `rounded-blob`) scales in with result
3. **Confetti (win only):** 40–60 pieces across full viewport
4. **Prize reveal:** Spotlight effect, dramatic `bounce-in` at 400ms delay
5. **Actions:** Prominent "PLAY AGAIN" + subtle "BACK TO MIDWAY" (tent-flap icon, not text link)
6. **Exit:** Swipe down anywhere dismisses and returns to midway

---

## 4. Trophy Room — 3D Scrolling Gallery

### What we're replacing

`prizes.tsx` renders 3 `<ShelfRow>` components stacked vertically with prizes on wooden shelves. Empty state: single shelf with sparkles. Flat 2D page.

### What we're building

A **horizontally-scrolling 3D-feeling room** with depth parallax. Prizes on pedestals at different depths. Carnival tent walls, wooden floor, individual spotlights.

### Room Layout (Top-Down)

```
                    BACK WALL (tent stripes)
    ┌──────────────────────────────────────────────────────┐
    │   Row 3 (deepest, parallax 0.4×): pedestals          │
    │   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐          │
    │   │ 🧸  │    │ 🎸  │    │     │    │     │          │
    │   └─────┘    └─────┘    └─────┘    └─────┘          │
    │                                                      │
    │   Row 2 (middle, parallax 0.7×): pedestals           │
    │        ┌─────┐    ┌─────┐    ┌─────┐                 │
    │        │ 🏆  │    │ 🎪  │    │     │                 │
    │        └─────┘    └─────┘    └─────┘                 │
    │                                                      │
    │   Row 1 (closest, parallax 1.0×): pedestals          │
    │             ┌─────┐    ┌─────┐                       │
    │             │ 🎯  │    │     │                       │
    │             └─────┘    └─────┘                       │
    │   ══════════════════════════════════════════  ← floor│
    └──────────────────────────────────────────────────────┘
    
    VIEWPORT scrolls horizontally ←→
```

### Component Hierarchy

```
<TrophyRoom>
  ├── <BulbMarquee />              ← persistent
  ├── <RoomBackdrop />             ← fixed tent walls + floor (CSS-only)
  ├── <SpotlightLayer />           ← radial gradients over pedestal positions
  ├── <RoomScrollContainer>        ← horizontal scroll, snap-type
  │     ├── <ParallaxRow depth={1}>  ← closest pedestals
  │     ├── <ParallaxRow depth={2}>  ← middle
  │     └── <ParallaxRow depth={3}>  ← deepest
  ├── <RoomNav />                  ← left/right arrows (if scrollable)
  ├── <EmptyState />               ← dark room, single spotlight
  └── <TicketCounter />
```

### Pedestal Design

Each prize on a CSS-drawn column with spotlight:
- Spotlight cone: `radial-gradient` (ellipse, yellow, fading to transparent)
- Pedestal top: `rounded-bounce`, wood gradient, `border-toon`
- Column: narrow div, 3D cylinder illusion via gradient
- Base: wider than column, wood gradient, `border-toon`

### Empty State

Dark room (`midnight`). Single spotlight illuminating an empty pedestal. Floating dust motes (slow float animation). Text: "No prizes yet… go win some!" in `font-toon`, `tent-canvas/60`.

### Transitions
- **Enter:** "Curtain rise" — screen reveals bottom-to-top like theater curtain
- **Exit:** Swipe down

---

## 5. Ambient Life — The Carnival Breathes

These elements make the carnival feel alive even when the player isn't touching the screen. They don't change gameplay, but they dramatically affect immersion.

### Light Strings
- Carnival bulbs blink with slightly different, organic timing
- Not perfectly synchronized — some flicker, some pulse slowly
- Chase light sequences that occasionally reverse direction
- Dim bulbs near edges, brighter near center (depth)
- Nighttime: bulbs cast subtle colored glow on nearby tent fabric

### Drifting Balloons
- Loose balloons drift gently upward and side to side on the midway
- Very slow, lazy movement — barely perceptible (12–18s duration)
- Occasionally one escapes upward and off screen
- Different colors, slight rotation
- Balloons near booth entrances have slightly faster bob (4–6s)

### Tent Fabric
- Striped tent canvas sways subtly in a light breeze
- `tent-stripe-wave` animation already exists — amplify and make it always-on
- Different tents have slightly different sway rhythms (3.5s, 4.2s, 5.1s)
- Tent flaps at booth entrances ripple gently

### Duck Pond Water
- Ducks bob gently on rippling water even when not being picked
- Water surface has subtle shimmer/reflection
- Occasional tiny splash from a duck dipping its head
- Ripples propagate outward slowly, cross-fading (8s cycle)

### Prize Ribbons
- Ribbons on won prizes flutter subtly (2–3° oscillation, 4s period)
- Sparkle effects on rare prizes pulse gently (2s cycle, staggered starts)
- Spotlight beams shift slightly (±1°, 6s period)
- New prizes have an intensified sparkle that settles after 10s

### Midway Ambience
- Confetti occasionally blows across the screen (not just on win) — 1–3 pieces every 15–30s
- A ferris wheel turns slowly in the distant background sky (full rotation: 30s)
- Stars twinkle in the midnight sky (randomized 2–5s twinkle cycles)
- Fireflies/dust motes float in the air near booth lights
- Distant carnival lights pulse gently in the background
- A creaky sign swings somewhere off-screen (auditory implication)

### Nighttime Theme
- Stars increase in visibility as the player "stays longer" (subtle transition)
- Moon slowly tracks across the sky (full traversal: 5 minutes)
- Overall color temperature cools slightly over time

### Implementation Notes
- All ambient animations should be CSS-only where possible
- Use very long animation durations (8–30 seconds) for subtlety
- Randomize start delays so elements don't move in unison
- Frame-rate-friendly: use `transform` and `opacity` only
- These run continuously — they're background, not triggered by player action
- Layer ambient life behind gameplay elements (lower z-index)

---

## 6. Sound Moment Map

### Background Music Layers

| Screen | Tone | Description |
|---|---|---|
| Midway Walk | Bouncy, upbeat, calliope | Circus organ at 1.2× speed. Jolly but slightly unhinged. Looping. |
| Balloon Pop | Tense-fun, rhythmic | Percussive, staccato notes. Building anticipation. Looping. |
| Milk Bottle Toss | Confident, country-fair | Folksy jug-band feel. Looping. |
| Duck Pond | Mysterious, gentle, aquatic | Soft chimes, water drops, gentle waltz. Looping. |
| Trophy Room | Reverent, magical | Soft strings/harp. "Hall of treasures." Looping. |
| Prize Reveal | Triumphant fanfare | Trumpets, rising arpeggio. 2–3s one-shot. |

### Sound Effects (SFX) — Key Triggers

| Trigger | Sound | Emotional Tone |
|---|---|---|
| Swipe between booths | Soft whoosh + carnival chatter | "Walking past another attraction" |
| Tap "PLAY" | Carnival bell ding + tent flap rustle | "Step right up!" |
| Scene transition enter/exit | Curtain swoosh / flap rustle | Anticipation / "Thanks for playing!" |
| Balloon pop | Sharp pop with reverb resonance | Satisfying, addictive |
| Last balloon pop (win) | Extra-loud pop + party horn | Triumph! |
| Milk bottle hit | Glass clink + hollow bottle sound | Impact satisfaction |
| Bottle chain reaction | Cascading glass clinks, 80ms apart | Domino-effect satisfaction |
| Duck pick — splash | Water splash + rubber duck squeak | Playful, silly |
| Duck reveal | Rising chime + ticket-printing sound | "Ooh, what did I get?" |
| Duck jackpot (5 tickets) | "Cha-ching!" + extra-loud chime | Jackpot excitement! |
| Ticket earn | Coin clink, ascending pitch per ticket | Reward dopamine |
| Ticket insufficient | Sad trombone (wah-wah) + dull buzzer | Comedic disappointment |
| Win — general | Carnival victory jingle + crowd cheer | Pure joy |
| Prize awarded | Magical sparkle shimmer + "item get" | "You got a NEW thing!" |
| Lose — general | Gentle "aww" + soft cymbal | Mild letdown, encouraging retry |
| FREE PLAY event | Siren whoop + jackpot alarm + ding-ding-ding | Chaotic excitement |
| Ticket counter update | Soft coin drop, pitch varies by amount | Small dopamine spikes |

### Tempo / Music Changes

| Event | Musical Change | Duration |
|---|---|---|
| Near-win state | Background tempo +20%, slight pitch rise, adds heartbeat bass | Until resolved |
| FREE PLAY event | Calliope overdrive, siren wails | 2.5 seconds |
| Win | Victory fanfare, then brief "celebration" loop | 3 seconds |
| Lose | Decrescendo, sad trombone, fade to midway theme | 2 seconds |

### Audio Priority System

1. Win/Lose fanfare (highest)
2. FREE PLAY event
3. Game action SFX (pop, crash, splash)
4. Ticket earn SFX
5. UI SFX (swipe, tap, transition)
6. Background music (ducks under everything)

---

## 7. New Design Tokens & CSS Extensions

### New Color Tokens (add to `theme.css`)

```css
--color-tent-balloon: #CC1A1A;       /* deep crimson for Balloon Pop tent */
--color-tent-milk: #E8D5A3;          /* warm canvas cream for Milk Bottle */
--color-tent-duck: #1A6B8A;          /* deep teal for Duck Pond tent */
--color-chalkboard: #2A4A3A;         /* dark green chalkboard */
--color-chalk: #D4E8D0;              /* chalk text (pale green-white) */
--color-wood-dark: #3E2210;          /* dark wood */
--color-wood-light: #7A4F2B;         /* light wood accent */
--color-water: #1A8FC0;              /* duck pond water */
--color-water-light: #4DC8F0;        /* pond water highlight */
--color-win-glow: #FFE600;           /* warm golden win glow */
--color-lose-dim: #3A1A4E;           /* muted purple lose state */
```

### New Spacing Tokens

```css
--spacing-carousel-gap: 0rem;
--spacing-pedestal: 5rem;
--spacing-room-depth: 8rem;
```

### New Radius Tokens

```css
--radius-tent-flap: 0 0 40% 40%;
--radius-pedestal: 0.5rem;
--radius-pond: 45%;
```

### New @keyframes (add to `animations.css`)

1. **CURTAIN-CLOSE / CURTAIN-OPEN** — Tent flap curtains closing/opening from edges. Duration: 0.4s close / 0.35s open.
2. **IRIS-IN / IRIS-OUT** — Circular wipe via `clip-path: circle()`. Duration: 0.35–0.4s.
3. **BALLOON-BURST** — Balloon pop: scale 1→1.3→0 with particle scatter. Duration: 0.3s.
4. **BOTTLE-TOPPLE** — Physics-feel fall: tilt 25° → rotate 85° with translate. Duration: 0.5s.
5. **WATER-RIPPLE** — Expanding concentric circles on pond. Duration: 2s, infinite.
6. **SPOTLIGHT-SWAY** — Subtle ±1° rotation on trophy room spotlights. Duration: 6s.
7. **DUST-FLOAT** — Floating dust motes in empty trophy room. Duration: 4s.
8. **SIGN-SWING** — Hanging signs swaying ±2°. Duration: 3s.
9. **COUNTER-FLASH** — Brief ticket counter flash: scale 1→1.15, brightness pulse. Duration: 0.3s.
10. **VIGNETTE-PULSE** — Red edge vignette for near-win tension. Duration: 1s.
11. **BANNER-DROP** — Banner unfurling from top with overshoot. Duration: 0.5s.

### New Utility Classes (add to `theme.css`)

```css
.bg-chalkboard       /* dark green + wood border + inner shadow */
.text-chalk           /* pale green-white chalk text */
.bg-wood              /* vertical wood gradient */
.bg-wood-horizontal   /* horizontal wood gradient */
.spotlight-cone       /* radial-gradient yellow spotlight overlay */
.bg-pond              /* water surface with highlights */
.exit-sign            /* glowing acid-green exit indicator */
.booth-scene          /* min-width: 100vw, snap-align: center */
.pedestal-top         /* 80×16px wood top */
.pedestal-column      /* 40×40px 3D cylinder gradient */
.pedestal-base        /* 90×12px wood base */
```

---

## 8. Implementation Roadmap for the Engineer

### Phase 1: Global Infrastructure (blockers)

1. **`BulbMarquee`** — full-width, fixed, z-50. Render once in `__root.tsx`. Persists across all screens.
2. **`TicketCounter`** — fixed bottom-right, persists across routes. Connected to existing `TicketContext`.
3. **`SceneTransition`** component — curtain close/open state machine. Wraps entire app.
4. **`useSwipeGesture`** hook — detects vertical swipe-down for exit.

### Phase 2: Midway Walk

1. Replace `index.tsx` with `MidwayWalk` carousel.
2. Build `BoothScene` with 4 parallax layers.
3. Implement parallax scroll listener.
4. Build `WalkIndicator`.
5. Wire "PLAY" CTAs to scene transitions.

### Phase 3: Game Screen Immersion

For each game route:
1. **Remove:** `<h1>`, "← Back to Midway", sticky counter pills.
2. **Add:** Booth interior background, in-world UI (chalkboards, exit sign), swipe-down exit.
3. **Replace:** Win/lose overlays with full-screen takeovers (confetti, banner drop).
4. **Enhance:** Game-specific animations (balloon burst particles, bottle topple physics, water ripples).

### Phase 4: Trophy Room

1. Replace `prizes.tsx` with `TrophyRoom`.
2. Build room backdrop (tent walls, floor with perspective).
3. Build `Pedestal` component with spotlight.
4. Implement parallax scroll rows.
5. Build `EmptyState`.

### Phase 5: Sound Integration

1. Create `SoundContext` / sound manager hook.
2. Wire sound triggers at each documented moment.
3. Implement background music crossfading between screens.
4. Implement tempo changes for near-win and FREE PLAY.

### Phase 6: Polish

1. FREE PLAY event — random trigger, banner animation, cost override.
2. Confetti system — reusable component with particle count/color variation.
3. Haptic feedback — `navigator.vibrate` on key moments.
4. Performance — `will-change`, `transform3d` for GPU compositing, test 60fps on mid-range phones.

---

## Summary of Key Design Decisions

1. **No URL-based navigation for gameplay** — midway, games, and trophy room exist in a single-page overlay model. React Router used for deep-linking only; navigation via transitions, not `<Link>`.

2. **Persistent UI elements** — BulbMarquee and TicketCounter render once at root level. Never unmount.

3. **Diegetic UI** — Game state displays look like physical objects in the booth world (chalkboards, ammo displays, wooden signs), not floating web divs.

4. **Gesture-first** — Swipe left/right to walk midway, swipe down to exit games, tap to enter booths. No back buttons.

5. **The curtain transition is the signature move** — the single most important animation. It sells the feeling of entering/exiting physical carnival booths.

6. **Sound is not an afterthought** — every interaction has a mapped sound moment. Implement audio system early.

7. **All new animations follow existing cartoon physics** — snap-in, wobble-out, staggered chaos, bouncy easing. No breaking the established motion language.

8. **Ambient life runs continuously** — the carnival breathes. These background animations are always on, creating depth and atmosphere without demanding attention.

---

*Document version: 1.0.0 — Ready for engineer implementation.*
