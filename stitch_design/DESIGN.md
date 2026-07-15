---
name: Word Master
colors:
  surface: '#f4fbf4'
  surface-dim: '#d4dcd5'
  surface-bright: '#f4fbf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef6ee'
  surface-container: '#e8f0e9'
  surface-container-high: '#e3eae3'
  surface-container-highest: '#dde4dd'
  on-surface: '#161d19'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2b322d'
  inverse-on-surface: '#ebf3eb'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#855300'
  on-tertiary: '#ffffff'
  tertiary-container: '#e29100'
  on-tertiary-container: '#523200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f4fbf4'
  on-background: '#161d19'
  surface-variant: '#dde4dd'
typography:
  display-word:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-word-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target: 48px
  gutter: 1rem
  margin-mobile: 1.25rem
  margin-desktop: 2.5rem
  container-max: 1280px
---

## Brand & Style
The design system is engineered for high-performance learning and cognitive focus. It targets serious language learners and students who require a tool that feels both academically rigorous and technologically modern. The aesthetic follows a **Modern Corporate** approach with a "Study-Focused" lean—utilizing heavy whitespace, purposeful color hits, and a distinct lack of visual clutter to minimize cognitive load during long study sessions.

The emotional response should be one of quiet confidence and steady progress. By balancing clinical precision with soft, rounded geometry, the system feels like a supportive personal tutor rather than a rigid textbook.

## Colors
This design system utilizes a sophisticated palette centered on growth and clarity.

- **Primary (Emerald 500/600):** Symbolizes progress, correctness, and primary interaction. Use this for "Mark as Known," "Start Session," and progress indicators.
- **Secondary (Indigo 500):** Reserved for navigational elements, secondary actions, and "Test Mode" transitions.
- **Tertiary (Amber 500):** Used sparingly for "Review Later" flags, streaks, or high-priority warnings.
- **Neutral (Slate/Zinc):** A foundation of Slate 50/100 for light mode surfaces ensures the UI feels breathable. In dark mode, Zinc 900/950 provides a deep, low-glare environment optimized for night-time vocabulary drilling.

All color applications must meet WCAG AA contrast ratios for text readability, especially within flashcards.

## Typography
The typography is built on **Inter**, chosen for its exceptional legibility and neutral, systematic character. 

- **Flashcard Display:** The `display-word` style is the hero of the system. It uses tight letter-spacing and heavy weights to make vocabulary words impactful.
- **Hierarchy:** Use `headline-lg` for deck titles and `body-md` for definitions and example sentences.
- **Labels:** Small labels use uppercase with increased tracking to denote meta-information like "Part of Speech" or "Level."
- **Line Height:** Generous line heights are maintained for definitions to ensure high readability during rapid scanning.

## Layout & Spacing
The layout follows a responsive fluid-grid logic with a mobile-first priority.

- **Mobile:** Uses a bottom navigation bar for ergonomic thumb access. Content is centered in a single column with `1.25rem` side margins. 
- **Desktop:** Transitions to a fixed left-hand sidebar for navigation. Content is housed in a max-width container of `1280px`.
- **Rhythm:** An 8px linear scale (4, 8, 16, 24, 32, 48, 64) dictates all margins and padding. 
- **Touch Targets:** All interactive elements (buttons, checkboxes, navigation items) maintain a minimum height/width of `48px` to prevent mis-taps during fast-paced study sessions.

## Elevation & Depth
Depth is signaled through **Tonal Layers** and extremely soft **Ambient Shadows**.

- **Level 0 (Background):** Slate 50 (Light) / Slate 950 (Dark).
- **Level 1 (Cards/Containers):** Pure White (Light) / Slate 900 (Dark). These use a very soft, diffused shadow (0 4px 20px rgba(0,0,0,0.05)) to appear slightly lifted.
- **Level 2 (Active States/Modals):** These use a more pronounced shadow to indicate higher priority and focus.
- **Interactions:** Flashcards should use a "lift" effect on hover or active state, increasing the shadow spread to simulate physical movement.

## Shapes
The shape language is defined by **Rounded (2)** corners to create a friendly and modern educational environment.

- **Standard Elements:** Buttons, input fields, and small UI cards use `0.5rem` (rounded-md).
- **Flashcards:** These are the centerpiece and use `1.5rem` (rounded-2xl) to emphasize their tactile, physical nature.
- **Progress Bars:** Fully rounded (pill-shaped) to represent a continuous flow of learning.

## Components
Consistent component styling ensures the learning experience is predictable and efficient.

- **Flashcards:** Large containers with `rounded-2xl` corners. Use high-contrast text for the word and a lower-contrast color for the phonetic transcription.
- **Primary Buttons:** Emerald 600 background with white text. High vertical padding (16px) for mobile optimization.
- **Progress Gauges:** Radial or linear bars using Emerald for "Mastered" and Slate 200 for "Remaining."
- **Interactive Lists:** List items in study decks include a leading checkbox and a trailing chevron. Use a Slate 100 border-bottom for separation.
- **Input Fields:** Minimalist styling with a 1px Slate 200 border that transforms into a 2px Emerald border on focus.
- **Bottom Navigation:** Fixed to the bottom on mobile. Icons should be 24px with clear labels in `label-sm` typography.