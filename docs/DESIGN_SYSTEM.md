# Design System

> Status: Foundation. Colour and typography values below were **extracted from the official Faculty of IT website's production CSS** on 2026-11-05. They have **not yet been confirmed against a formal brand guideline** from the Faculty or University. Items marked **UNVERIFIED** or **PENDING** must be confirmed before the event.

## 1. Sources

| Source                                      | URL                                                                                                                           | Retrieved  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Faculty of IT website (homepage HTML)       | https://itfac.uom.ac.lk/                                                                                                      | 2026-11-05 |
| Compiled stylesheet (Tailwind CSS v4 theme) | https://itfac.uom.ac.lk/assets/styles-C5vzmBWd.css                                                                            | 2026-11-05 |
| Font import in that stylesheet              | `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap` | 2026-11-05 |

Method: the stylesheet's `@theme` custom properties were read directly, and the homepage markup was scanned to count how often each brand utility class is used. The asset filename contains a build hash and will change when the website is redeployed; re-check values if the site changes.

## 2. Colour palette

### Brand colours (extracted from website CSS)

| Token (website name) | HEX       | Role                                                                    | Homepage usage | Status                                    |
| -------------------- | --------- | ----------------------------------------------------------------------- | -------------- | ----------------------------------------- |
| `--color-navy-blue`  | `#1b3a6b` | **Primary.** Headers, primary surfaces, borders, headings               | 83 class uses  | Extracted; UNVERIFIED against brand guide |
| `--color-gold`       | `#c9a227` | **Secondary / accent.** Highlights, dividers, emphasis, calls to action | 104 class uses | Extracted; UNVERIFIED against brand guide |

### Supporting colours (extracted from website CSS)

| Token                   | HEX       | Role                            | Homepage usage |
| ----------------------- | --------- | ------------------------------- | -------------- |
| `--color-light-grey`    | `#e8e8e8` | Subtle backgrounds, dividers    | 40 class uses  |
| `--color-dark-grey`     | `#3a3a3a` | Body text on light backgrounds  | 14 class uses  |
| `--color-light-blue-bg` | `#e3f2fd` | Tinted section backgrounds      | 12 class uses  |
| `--color-accent-blue`   | `#2196f3` | Occasional accent (links, info) | 2 class uses   |
| `--color-white`         | `#ffffff` | Base background, text on navy   | n/a            |
| `--color-black`         | `#000000` | Rarely used                     | n/a            |

### Project tokens

Implemented in [`apps/web/app/brand-tokens.css`](../apps/web/app/brand-tokens.css), the single source of truth for brand tokens, using Tailwind CSS v4 `@theme`. The website's names are kept so values stay traceable to the source, which gives utilities such as `bg-navy-blue`, `text-gold` and `border-light-grey`. The same file maps `--font-heading` (Outfit) and `--font-sans` (Inter) to the `next/font` variables set in `apps/web/app/layout.tsx`. To change a colour, edit that file only. Do not add other brand colours without a documented source.

```css
@theme {
  --color-navy-blue: #1b3a6b;
  --color-gold: #c9a227;
  --color-light-grey: #e8e8e8;
  --color-dark-grey: #3a3a3a;
  --color-light-blue-bg: #e3f2fd;
  --color-accent-blue: #2196f3;
}
```

Semantic colours for status (success, warning, error) are not defined by the website. The admin dashboard and connection indicators may use Tailwind's default palette for these, clearly as **functional, not brand** colours. They must never be presented as official faculty colours.

Darker or lighter variants of navy or gold (for example, for gradients on the main display) are **derived, not official**. Derive them only with `color-mix()` or opacity from the tokens above, and label them as derived in code.

### Contrast (calculated with WCAG 2.x relative luminance)

| Foreground on background       | Ratio (approx.) | Use                                       |
| ------------------------------ | --------------- | ----------------------------------------- |
| White on navy `#1b3a6b`        | 11.3 : 1        | All text sizes                            |
| Navy on white                  | 11.3 : 1        | All text sizes                            |
| Dark grey `#3a3a3a` on white   | 11.4 : 1        | Body text                                 |
| Gold `#c9a227` on navy         | 4.7 : 1         | Normal and large text (AA)                |
| Gold on white                  | 2.4 : 1         | **Not allowed for text.** Decorative only |
| White on accent blue `#2196f3` | 3.1 : 1         | Large or bold text only; avoid for body   |

## 3. Typography

| Use                         | Family                                          | Weights on website      | Source      |
| --------------------------- | ----------------------------------------------- | ----------------------- | ----------- |
| Headings (`--font-heading`) | **Outfit**, sans-serif                          | 400, 500, 600, 700, 800 | Website CSS |
| Body (`--font-sans`)        | **Inter**, ui-sans-serif, system-ui, sans-serif | 300, 400, 500, 600, 700 | Website CSS |

Rules:

- Load both families through `next/font/google`, which downloads them at build time and serves them from the app. No runtime request to Google Fonts (NFR-009).
- Headings use Outfit 600 to 800; body and UI use Inter 400 to 600.
- Numerals in the countdown use Outfit with tabular figures (`font-variant-numeric: tabular-nums`) so digits do not shift.
- The website's type scale follows Tailwind defaults (`text-xs` 0.75rem up to `text-8xl` 6rem). The main display needs larger, viewport-relative sizes (section 7).

## 4. Logo usage

| Asset                          | Source                                                            | Status                                                                                       |
| ------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| University of Moratuwa logo    | Website header image `/assets/logo-B1akXfgP.png` (alt "UoM Logo") | Exists on website. **PENDING**: official high-resolution or vector file and usage permission |
| Faculty of IT logo or wordmark | Not identified as a separate asset on the homepage                | **PENDING**                                                                                  |
| FIT Expo event mark            | Not on the website                                                | **PENDING**: from the organizing committee                                                   |

Rules:

- Do not hotlink logos from the website at runtime. Store approved files under `apps/web/public/images/brand/` once provided.
- Do not recreate, redraw, recolour, stretch, or add effects to official logos.
- Keep clear space around a logo of at least the height of the logo's emblem mark (to be refined once the official guide is available).
- On navy backgrounds use the version intended for dark backgrounds, if one is supplied; otherwise place the logo on a white or light surface.
- Until real files are supplied, use a plain text label (for example, "FIT Expo") and do not create a placeholder logo or describe a placeholder as official.

## 5. Visual patterns observed on the website

- Navy is the dominant structural colour (header, section headings, borders around portraits); gold is used generously as an accent.
- Clean white and light-grey surfaces with generous whitespace.
- Rounded corners from `0.25rem` up to `1rem` (`--radius-sm` to `--radius-2xl`).
- Subtle hover motion (scale about 1.05 to 1.10, 150 to 700 ms transitions).
- Photography presented in rounded containers with object-fit cover.

## 6. Spacing, layout and responsiveness

- Spacing base: `0.25rem` (Tailwind v4 `--spacing`, same as the website). Use Tailwind's scale; avoid arbitrary pixel values.
- Container widths: Tailwind defaults (`max-w-7xl` = 80rem used for admin content).
- Radius: `rounded-lg` (0.5rem) for controls, `rounded-2xl` (1rem) for cards and panels.
- Breakpoints: Tailwind defaults. Each interface is designed for its target device first:
  - Display: 16:9 landscape, 1920x1080 baseline, scaled with viewport units. Final resolution **PENDING**.
  - Tablets: portrait and landscape, roughly 768 to 1366 CSS px wide. Final models **PENDING**.
  - Admin: laptop first (1280 px and up), usable on a tablet.

## 7. Main display principles (`/`)

The display is the browser on the ceremony laptop. HDMI mirroring and an extended desktop both show that same window; the page does not choose a monitor or talk to the projector. The operator moves the window onto the projected screen, then uses the browser fullscreen control.

- Premium, ceremonial look: deep navy fields, gold accents and fine gold rules, restrained use of white.
- A 16:9 stage fills the browser viewport. Wider or taller windows keep the stage at 16:9 and letterbox the rest, so mirroring a 16:10 laptop and a 16:9 projector both stay readable.
- One focal element per screen. Never show more than one primary message at a time.
- Readable from the back of the venue (NFR-006): body text at least 48 px at 1080p; countdown numerals at least 40% of viewport height; headings in Outfit.
- Three guest indicators during `COLLECTING_ACTIVATIONS`, showing role titles (names and titles from configuration, **PENDING** confirmation). An indicator lights up only after the server accepts that activation.
- No cursor, scrollbars, browser UI, debug text or connection details visible to the audience. A small, discreet connection indicator is allowed in a corner and visible to operators.
- Full-screen (kiosk or fullscreen API). Must look correct if the page is refreshed mid-ceremony.
- `ABORTED` shows a calm branded screen, never an error message.

## 8. Guest tablet principles (`/guest/*`)

- Minimal: guest title, one slide-to-activate control, one status line.
- Slider thumb at least 64x64 CSS px; track spans most of the screen width; full slide required to activate; releasing early springs back.
- Clear states: "Please wait" (disabled), "Slide to open" (enabled), "Sending" (pending), "Activated" (accepted, with gold confirmation), "Reconnecting" (connection lost).
- No navigation, menus or settings. Login form appears only if there is no valid session (organizers handle it in advance).
- Prevent accidental gestures: disable text selection, pull-to-refresh and pinch zoom on this route where the browser allows it.
- Accessible alternative for activation (FR-017) and `prefers-reduced-motion` support.

## 9. Admin dashboard principles (`/admin`)

- Functional first, visually consistent: navy header, white surfaces, Inter for UI text.
- Always-visible current state, `version`, and connection indicator.
- Guest status cards (activated or not, time) and device presence table.
- Destructive or irreversible actions (abort, reset, manual start) use distinct styling and confirmation dialogs; manual start uses a two-step confirmation with phrase and password.
- Activity log in reverse chronological order, readable timestamps.
- Keyboard operable, visible focus rings, WCAG AA contrast.

## 10. Animation principles

- Library: Motion (`motion` package) for React animations.
- Animations communicate state; they never decide it. They are triggered by server events and snapshots.
- Main display: one opening animation triggered by `event:opened`, then the official opening screen. Countdown digits transition smoothly but are computed from server time every frame.
- Tablets: short feedback (slider spring, activation confirmation), under 600 ms.
- Respect `prefers-reduced-motion` on tablets and admin. The main display may keep its ceremonial animation because it is a presentation surface, but must avoid rapid flashing (no more than three flashes per second).
- Animations must not block rendering of the next state. If an animation is interrupted (for example, by abort), the UI moves immediately to the new state.

## 11. Audio principles

| Cue                     | Where                       | Trigger                                                                       |
| ----------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| Ambient music           | Display                     | Loops in `WAITING`, `READY`, `COLLECTING_ACTIVATIONS` after audio is unlocked |
| Activation sound effect | Display (optionally tablet) | `guest:activated`                                                             |
| Countdown audio         | Display                     | Scheduled from `startsAt`                                                     |
| Final opening sound     | Display                     | `event:opened`                                                                |

- All audio files are locally hosted in `apps/web/public/audio/` and preloaded before `READY`. No streaming during the event.
- Browsers block autoplay: the display shows an "Enable audio" control that an operator presses once during setup; the display then reports audio as unlocked (FR-061).
- Audio failure never delays or blocks visuals (FR-062); failures are logged.
- Ambient music ducks or fades out before the countdown audio.
- Audio sources, licensing and final files are **PENDING**.
