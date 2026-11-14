# DESIGN_SYSTEM.md — NOVARA Asset Intelligence

## Visual direction

High-end private investment / investigative intelligence platform. Influences (not copies): Tracers (investigative density), Claimiflo (recovery clarity), HeirSearch (legal credibility).

## Color tokens

| Token | Hex | Usage |
|-------|-----|-------|
| Midnight Navy | `#0B1426` | Base background |
| Deep Navy | `#18263C` | Elevated surfaces |
| Champagne Gold | `#D8B56A` | Brand accent, CTAs, rules |
| White | `#FFFFFF` | Primary text |
| Silver | `#B7C3D5` | Secondary text / borders |

Supporting: success `#3D9B7A`, warning `#C9A227`, danger `#C45C5C`, info `#5B8FBF`.

## Typography

- Display: Cormorant Garamond
- Body: Manrope
- Mono: IBM Plex Mono

Avoid Inter / Roboto / Arial / system-default marketing look.

## Motion

1. Hero fade/rise on load (`framer-motion`)
2. Champagne pulse on primary CTA
3. Map glow for pilot states

## Layout rules

- Brand is hero-level on the homepage (`NOVARA` + Asset Intelligence™)
- Full-bleed atmospheric hero (gradient + grid), not inset cards
- Cards used only for interactive/portal containers
- Synthetic badge on all preview operational data

## Components

`Button`, `Badge`, `Panel`, `Stat`, `SyntheticBanner`, `PublicNav`, `PortalShell`, `USCoverageMap`, `OpportunityTable`, `WorkflowRail`, `AgentGrid`, `RecoveryChart`.
