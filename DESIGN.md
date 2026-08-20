# DESIGN.md — StarkWhisper Design System & Visual Contract

## 1. Aesthetic Archetype & Mood
- **Archetype**: Stark Monolith — High-Density Cryptographic Telemetry HUD
- **Theme Modes**: Bi-directional Light / Dark Mode with instant toggle & local storage persistence.
- **Dominant Emotion**: Authoritative, Mathematical Precision, Sovereign Security
- **Strict Anti-Patterns**: No generic purple/blue mesh background gradients, no low-contrast pastel text, no symmetrical 3-card equal grids, no arbitrary inline pixel font sizes.

## 2. Color Tokens & Theme Matrix

### Dark Theme (`[data-theme="dark"]` - Default)
- `--bg-canvas`: `#09090B` (Deep Obsidian Zinc)
- `--bg-surface`: `#141417` (Graphite Slate Surface)
- `--bg-surface-elevated`: `#1C1D22` (Elevated Panel)
- `--bg-surface-hover`: `#24252C` (Interactive Hover Surface)
- `--border-subtle`: `#27272A` (1px Structural Zinc Border)
- `--border-focus`: `#10B981` (Laser Emerald Focus Ring)
- `--text-primary`: `#FAFAFA` (High-Contrast Zinc 50)
- `--text-secondary`: `#A1A1AA` (Muted Zinc 400)
- `--text-tertiary`: `#71717A` (Subtle Zinc 500)
- `--accent-primary`: `#10B981` (Laser Emerald 500 — Cryptographic Verified)
- `--accent-primary-hover`: `#059669` (Emerald 600)
- `--accent-crimson`: `#EF4444` (Starknet Crimson 500)
- `--accent-cyan`: `#06B6D4` (Telemetry Cyan 500)
- `--shadow-card`: `0 20px 40px -15px rgba(0, 0, 0, 0.7)`

### Light Theme (`[data-theme="light"]`)
- `--bg-canvas`: `#FAFAFA` (Crisp Light Canvas)
- `--bg-surface`: `#FFFFFF` (Pure White Card Surface)
- `--bg-surface-elevated`: `#F4F4F5` (Elevated Light Surface)
- `--bg-surface-hover`: `#E4E4E7` (Hover Light Surface)
- `--border-subtle`: `#E4E4E7` (1px Structural Border)
- `--border-focus`: `#059669` (Emerald Focus Ring)
- `--text-primary`: `#09090B` (High-Contrast Carbon Black)
- `--text-secondary`: `#52525B` (Muted Zinc 600)
- `--text-tertiary`: `#71717A` (Subtle Zinc 500)
- `--accent-primary`: `#059669` (Deep Emerald Green)
- `--accent-primary-hover`: `#047857` (Emerald 700)
- `--accent-crimson`: `#DC2626` (Starknet Crimson)
- `--accent-cyan`: `#0891B2` (Telemetry Cyan)
- `--shadow-card`: `0 10px 30px -10px rgba(0, 0, 0, 0.08)`

## 3. Typography Scale & Hierarchy
- **Display & Section Headlines**: `'Space Grotesk', -apple-system, sans-serif` (`font-weight: 700 / 800`, `letter-spacing: -0.03em`)
- **Body & Controls**: `'Plus Jakarta Sans', -apple-system, sans-serif` (`font-weight: 400 / 500 / 600`)
- **Calldata & Cryptographic Data**: `'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums`
- **Scale**:
  - `hero-title`: `clamp(2.5rem, 5vw, 4.25rem)` / line-height: `1.08`
  - `h2-section`: `clamp(1.85rem, 3.5vw, 2.75rem)` / line-height: `1.15`
  - `h3-card`: `1.25rem` (20px) / line-height: `1.3`
  - `body-lg`: `1.125rem` (18px) / line-height: `1.6`
  - `body-base`: `0.9375rem` (15px) / line-height: `1.5`
  - `caption-mono`: `0.8125rem` (13px) / line-height: `1.4`

## 4. Spacing Scale & Container Math
- **Base Grid**: 8px (8px, 16px, 24px, 32px, 48px, 64px, 96px, 120px)
- **Container Max-Width**: `1240px` with responsive padding (`24px` on desktop, `16px` on mobile <= 640px)
- **Hero Padding**: `80px 0 64px` desktop / `48px 0 32px` mobile

## 5. Component Geometry & Concentric Radii
- **Outer Container Radius**: `16px` (`border-radius: 16px`)
- **Card Radius**: `12px` (`border-radius: 12px`)
- **Input / Button Radius**: `8px` (`border-radius: 8px`)
- **Badge Radius**: `100px` (`border-radius: 100px`)
- **Nested Radius Invariant**: r_child = r_parent - padding

## 6. Motion Curves & Tactile Interactions
- **Primary Easing**: `cubic-bezier(0.32, 0.72, 0, 1)`
- **Hover Transitions**: `transform: translateY(-2px); border-color: var(--border-focus); transition: all 0.2s cubic-bezier(0.32, 0.72, 0, 1);`
- **Active Press Feedback**: `transform: translateY(1px) scale(0.98);`
- **Touch Optimization**: `touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none;`
