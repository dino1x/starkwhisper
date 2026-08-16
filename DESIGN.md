# DESIGN.md — StarkWhisper Visual & Architectural Contract

> **Created by:** `refero-design` + `landing-page-builder` + `sloppi`
> **Aesthetic Archetype:** *Tactile Cryptographic Editorial* (Warm Parchment + Precision Monospace + Electric Accents)
> **Dominant Emotion:** **Confident & Empowered** ("I can finally communicate without the whole chain watching")
> **Collision:** *Swiss Editorial Typography × Confidential Telemetry HUD*
> **Anti-Patterns Ignored:** Dark mode devtool default ignored per user instructions. No purple mesh gradients, no generic 3-card equal grids, no unfalsifiable fluff.

---

## 1. Vibe & Brand Specification

| Property | Value | Rationale |
|---|---|---|
| **Vibe Name** | *Warm Cryptographic Studio* | Combines editorial warmth with cryptographic precision |
| **Reference Object** | Swiss typography monograph + encrypted telegraph terminal | Editorial gravitas meets real privacy infrastructure |
| **Primary Color** | `#FAF8F5` (Warm Cream Parchment) | Clean, premium, anti-AI dark default |
| **Surface Color** | `#FFFFFF` (Pure Studio White) | Elevated card surfaces with 1px tactile borders |
| **Primary Text** | `#111827` (Deep Obsidian Ink) | Ultra-high contrast text (16:1 ratio, passes WCAG AAA) |
| **Accent Color** | `#E63946` (Electric Crimson Flame) | High-energy conversion actions & privacy badges |
| **Secondary Accent** | `#06D6A0` (Emerald Shield Green) | Verified ZK-proof status & security indicators |
| **Border Hairline** | `#E5E7EB` / `rgba(17, 24, 39, 0.08)` | Crisp 1px structural framing |

---

## 2. Typography System

- **Display Font:** `Space Grotesk` (Google Fonts) — Technical, sharp, expressive headings
- **Body Font:** `Plus Jakarta Sans` (Google Fonts) — High readability, modern geometric sans
- **Data / Mono Font:** `JetBrains Mono` (Google Fonts) — Cryptographic keys, felts, hashes, badges

### Scale
- `display`: `clamp(2.5rem, 5vw, 4.25rem)` / 1.1 line-height / -0.03em tracking / 800 weight
- `h1`: `2.5rem` (40px) / 1.2 line-height / -0.02em tracking / 700 weight
- `h2`: `1.875rem` (30px) / 1.3 line-height / -0.01em tracking / 700 weight
- `h3`: `1.25rem` (20px) / 1.4 line-height / 0 tracking / 600 weight
- `body`: `1.0625rem` (17px) / 1.6 line-height / 0 tracking / 400 weight
- `caption`: `0.8125rem` (13px) / 1.4 line-height / +0.02em tracking / 500 mono

---

## 3. Spacing Scale & Grid

- **Base Grid Unit:** `8px` (8px, 16px, 24px, 32px, 48px, 64px, 96px, 128px)
- **Container Max-Width:** `1240px` (`max-w-7xl`)
- **Section Padding:** Vertical `80px–112px`, Horizontal `24px`

---

## 4. Component Geometry & Surface Rules

- **Card Radius:** `16px` (`rounded-2xl`)
- **Button Radius:** `10px` (`rounded-xl`)
- **Badge Radius:** `6px` (`rounded-md`)
- **Child Radius Rule:** `r_child = r_parent - padding`
- **Shadow & Elevation:** `0 10px 30px -5px rgba(17, 24, 39, 0.06), 0 4px 6px -2px rgba(17, 24, 39, 0.03)`
- **Hover Lift:** `translateY(-3px)` + border light-up `#E63946`

---

## 5. Motion Curves

- **Primary Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Apple/Spring fluid curve)
- **Transition Duration:** `250ms` fast response
- **Scroll Reveals:** Fade-up `translateY(24px)` to `translateY(0)` with stagger
