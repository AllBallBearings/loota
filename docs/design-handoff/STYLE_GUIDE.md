# Loota Design System & Mobile Style Guide — "Trailhead Arcade" (2026)

> **Purpose**: Complete visual, token, component, and interaction handoff for the Loota iOS / mobile app so web and mobile feel like one cohesive, unmistakable 2026 outdoor social game.

---

## 1. Creative Direction: "Trailhead Arcade"

Loota bridges **sunlit outdoor adventure culture** (National Park topo maps, Patagonia / Field Notes warmth, crisp daylight legibility outdoors in direct sun) with **tactile, joyful social gaming** (LEGO bricks, Pokémon GO, Fortnite Supply Drops, Nintendo UI craft).

### Core Principles
1. **Sunlit Daylight First**: Warm birch/cream paper surfaces (`#F3EFE3`, `#FFFDF8`) with subtle topographic contour lines — legible in bright outdoor sunlight when players are actually walking around holding their phones.
2. **Physical Toy Depth (Not Blur-Glass Slop)**: Depth comes from **crisp `2pt` Deep Pine outlines (`#16261D`)** and **solid offset bottom shadows** (`0 4pt 0 #16261D`), never muddy drop blurs or dark-purple neon glows.
3. **Chunky Pressable Tactility**: Primary buttons physically travel downward (`+2.5pt` Y) on press as their bottom shadow compresses — pair every primary press on iOS with tactile haptics.
4. **High-Contrast Game Semantics**: Every game state has an unmistakable color family:
   - **Blaze Orange** = Action / Supply Drop / Live Player Beacon
   - **Treasure Gold** = Gold Coins / Trophies / #1 Leader
   - **Epic Purple** = Rare Gift Cards / Special Drops
   - **Meadow Emerald** = Claimed / Live Online / Success
   - **Compass Sky** = Proximity Radar / GPS / Navigation

### What to Avoid (Anti-Patterns)
- No dark black/purple neon cyberpunk UI or glowing cyan/lime wireframes.
- No low-contrast translucent glass over busy maps without a solid `#16261D` keyline.
- No system alerts (`UIAlertController` / `window.alert`) — always use tactile bordered toasts and sheets.

---

## 2. Color Tokens

### Daylight Surfaces & Pine Ink
| Token | Role | Hex | RGB |
| :--- | :--- | :--- | :--- |
| `bg` | Page / screen ground (topographic birch) | `#F3EFE3` | `243, 239, 227` |
| `surface` | Sunlit cards, panels, top bar, sheets | `#FFFDF8` | `255, 253, 248` |
| `surfaceAlt` | Recessed inputs, segmented tracks, secondary pills | `#ECE6D6` | `236, 230, 214` |
| `surfaceHover` | Pressed / hovered subtle card lift | `#F7F3E7` | `247, 243, 231` |
| `surfaceTint` | Soft meadow wash | `#E5F4EA` | `229, 244, 234` |
| `ink` | Primary text & **2pt structural borders** | `#16261D` | `22, 38, 29` |
| `ink2` | Secondary body copy | `#31493B` | `49, 73, 59` |
| `ink3` | Muted labels, timestamps, metadata | `#5B7365` | `91, 115, 101` |
| `ink4` | Input placeholders | `#879B8F` | `135, 155, 143` |
| `line` | Soft internal dividers (`ink` @ 13%) | `rgba(22,38,29,0.13)` | — |
| `lineStrong` | Unselected control borders (`ink` @ 25%) | `rgba(22,38,29,0.25)` | — |

### Tactile Game Accents
| Family | Role | Bright | Base | Dark (Text/Shadow) | Soft Wash (Badges/Bg) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Blaze** | Primary CTA, Drop Live, Player Beacon | `#FF6E47` | `#FF5428` | `#C9320C` | `#FFE4DC` |
| **Gold** | Gold Coins, #1 Rank, Trophy, Stars | `#FFE066` | `#FFC21A` | `#C48700` *(text: `#7C5200`)* | `#FFF4CC` |
| **Meadow** | Claimed Loot, Live Pulse, Ready Checks | `#26C26B` | `#18A957` | `#0F7A3E` | `#DCF7E7` |
| **Sky** | Proximity Radar, GPS Locate, Links | `#42A5F5` | `#1E88E5` | `#135CA1` | `#DCEEFF` |
| **Epic** | Rare Gift Cards, Special Stashes | `#A78BFA` | `#8B5CF6` | `#6232D6` | `#EDE7FE` |
| **Danger** | Destructive Confirmations / Clear Actions | — | `#E11D48` | `#A51034` | `#FFE4EA` |

### Sonar Radar Dish Palette (Hardware Contrast Surface)
The Proximity Radar intentionally sits as a **deep forest radar screen inside a warm birch hardware bezel** (`#FFFDF8` with `2.5pt` `#16261D` outline and 4 corner hardware screws):
- **Dish Radial Gradient**: Center `#1C4A33` → Mid `#143625` → Edge `#0E261A`
- **Sweep Cone**: `rgba(38, 194, 107, 0.34)` sweeping clockwise (5.5s linear loop)
- **Rings & Crosshair**: `rgba(220, 247, 231, 0.24)` (dashed at 25% & 75%, solid at 50%)
- **Player Center Beacon**: `#FF5428` dot with `2.5pt` `#FFFDF8` inner ring, `3pt` `#16261D` outer ring, pulsing `#FFC21A` halo

### Sunlit Outdoor Map Style (MapKit / Google Maps)
Match the bright outdoor adventure map style so maps look like a game world rather than generic utility tiles:
- **Landmass**: `#F2EEE2`
- **Parks & Green Space**: `#BDE6A3` (park labels `#1D5E35`)
- **Natural Terrain**: `#E5EFD9`
- **Water**: `#8AD2F5` (water labels `#135CA1`)
- **Local Roads**: `#FFFFFF` with `#DED6C1` casing
- **Highways**: `#FFE082` with `#E0B443` casing
- **Map Pins**:
  - Open Gold Coin: `#FFC21A` circle, `2.5pt` `#16261D` stroke
  - Open Gift Card: `#8B5CF6` rounded ticket (`3:2` ratio), `2.5pt` `#16261D` stroke
  - Claimed Loot: `#18A957` fill, `2.5pt` `#16261D` stroke
  - Selected / Highlighted Pin: `4pt` `#FF5428` stroke, `1.25×` scale

---

## 3. Typography System

| Role | Font Family | Fallback (iOS Native) | Weights | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | **Bricolage Grotesque** | SF Pro Rounded (Heavy/Bold) | 700, 800 | Brand wordmark, screen titles, card headings, modal titles, empty state titles |
| **UI Body** | **Plus Jakarta Sans** | SF Pro Text (Medium/Bold) | 500, 600, 700, 800 | Buttons, labels, body text, tabs, badges, form fields |
| **Telemetry / Data** | **JetBrains Mono** | SF Mono (Bold) | 600, 700, 800 | GPS coordinates, distances (`48.5ft`), compass bearings (`W37N`), counters, hunt IDs, status tags |

### Type Scale
- **Screen / Hero Title**: `22–26pt`, Display 800, tracking `-0.025em`, line-height `1.1`
- **Section / Card Title**: `15–16pt`, Display 800, tracking `-0.015em`
- **Primary CTA Label**: `15–16pt`, UI 800
- **Body / Input**: `14.5pt`, UI 600
- **Metadata / Caption**: `12pt`, UI 600 (`ink3`)
- **Telemetry / Eyebrow**: `10.5–12pt`, Mono 700–800, uppercase for eyebrows/tags (`letter-spacing: 0.08–0.14em`)

> **iOS Tip**: Bundle `BricolageGrotesque-Bold.ttf`, `BricolageGrotesque-ExtraBold.ttf`, `PlusJakartaSans-SemiBold.ttf`, `PlusJakartaSans-ExtraBold.ttf`, and `JetBrainsMono-Bold.ttf` in the Xcode bundle (all free under OFL from Google Fonts) for 100% web/iOS parity.

---

## 4. Borders, Radii, Elevation & Press Physics

### Corner Radii
- **Micro chips / copy IDs**: `8pt`
- **Inputs / small buttons / tabs / avatar squares**: `10pt`
- **Standard buttons / loot rows / floating HUD pills**: `14pt`
- **Cards / panels / accordions / QR Field Pass**: `18pt`
- **Modals / bottom sheets**: `24pt`
- **Radar hardware housing**: `34pt`
- **Status badges / progress tracks**: Capsule (`999pt`)

### Tactile Shadow & Press Spec
| Surface | Border | Resting Shadow | Pressed State | iOS Haptic |
| :--- | :--- | :--- | :--- | :--- |
| **Primary CTA (`Blaze` / `Gold`)** | `2pt solid #16261D` | `0 4pt 0 #16261D` + top inner highlight `2pt rgba(255,255,255,0.35)` | `offset(y: 2.5)`, shadow `0 1.5pt 0 #16261D` | `.medium` impact |
| **Subtle / Secondary Button** | `2pt solid #16261D` | `0 3pt 0 #16261D` | `offset(y: 2)`, shadow `0 1pt 0 #16261D` | `.light` impact |
| **Selected Segmented Tab / Tile** | `2pt solid #16261D` | `0 2.5pt 0 #16261D` | Scale `0.98` spring | `.selectionChanged` |
| **Cards / Panels / Accordions** | `2pt solid #16261D` | `0 3pt 0 rgba(22,38,29,0.14)` | — | — |
| **Floating Map HUD / Drawer** | `2pt solid #16261D` | `0 4pt 0 #16261D` + soft ambient `0 16pt 32pt rgba(22,38,29,0.22)` | — | — |
| **Modals / Victory Banner** | `2.5pt solid #16261D` | `0 8pt 0 #16261D` + ambient `0 28pt 60pt rgba(22,38,29,0.4)` | — | `.success` notification |

---

## 5. Brand Mark Specification

The **Loota Emblem** (`src/components/LootaLogo.tsx`) is a rounded-square meadow tile (`rx: 12` on a `44×44` viewBox) with a `#16261D` solid `3pt` base shadow:
1. **Tile**: Linear gradient `#26C26B` → `#128A48`, `2.4pt` `#16261D` border, subtle white top bevel arc.
2. **Pin Silhouette**: Centered Trail-Blazer Orange (`#FF5428`) map pin with `2.2pt` `#16261D` outline.
3. **Treasure Coin Core**: Radial/linear gold medallion (`#FFE566` → `#FFC21A` → `#E59800`) inside the pin head.
4. **Compass Star**: Crisp 4-point white star (`#FFFDF8`) with `#16261D` micro-stroke inside the coin.

Use this exact composition for the **iOS App Icon** (bleeding the emerald gradient to the edges, keeping the orange pin + golden compass-star coin bold and centered).

---

## 6. Component & Screen Patterns (iOS Mapping)

1. **Top Header & Live Status Pill**:
   - Compact sunlit bar (`#FFFDF8` @ 92% + blur) with `2pt` `#16261D` bottom border.
   - Live hunts show a **Meadow Emerald capsule** with an animated pulsing dot (`live-dot`) — never use ambiguous static gray for live games.
2. **Loot Tokens (`Coin` vs `Gift Card`)**:
   - **Gold Coin**: 3D extruded spinning gold disc with 4-point compass star + diagonal white glint sweep, labeled `CASH`.
   - **Gift Card**: 3D gently tilting purple-to-pink card (`#A78BFA` → `#8B5CF6` → `#EC4899`) with gold cross-ribbon, white sparkle bow, and holographic foil sweep, labeled `EPIC`.
   - In ARKit, match these exact materials (brushed metallic gold coin with embossed star; glossy iridescent purple-pink gift card with golden ribbon).
3. **Floating Canvas Controls**:
   - Keep the Map / AR / Radar canvas edge-to-edge.
   - Float a compact top pill (`X drops | Hint`) + a **Coin / Gift Card brush pill** + `My GPS` / `Undo` buttons over the map.
   - Use a collapsible bottom sheet / drawer (**Loot Stash**) for the pin manifest so users never leave the map to check placed drops.
4. **Live Hunt Command Center & Tabs**:
   - Compact top summary strip with Hunt Title, Format Badge (`GPS Map` or `Proximity 100ft`), Host Avatar + Name, Copyable `#ID` chip, and 4 telemetry pills (`Loot`, `Claimed`, `Crew`, `Progress %`).
   - Clean 4-tab segmented dock: **Loot** (`claimed/total`), **Crew** (live mid-hunt leaderboard + full roster), **Share** (scannable **QR Field Pass** with crisp `#16261D` modules on pure `#FFFFFF` quiet zone), and **Host** (for creators).
5. **Victory Podium**:
   - Floating warm-gold card (`#FFF4CC` → `#FFFDF8`) with Trophy icon tile, `#1` Crown highlight row, collector scores, and private winner/host contact info shown only to authorized parties.

---

## 7. Ready-to-Use SwiftUI Theme Starter (`LootaTheme.swift`)

```swift
import SwiftUI

enum LootaColor {
    // Surfaces
    static let bg          = Color(hex: 0xF3EFE3)
    static let surface     = Color(hex: 0xFFFDF8)
    static let surfaceAlt  = Color(hex: 0xECE6D6)
    static let surfaceTint = Color(hex: 0xE5F4EA)

    // Deep Pine Ink
    static let ink         = Color(hex: 0x16261D)
    static let ink2        = Color(hex: 0x31493B)
    static let ink3        = Color(hex: 0x5B7365)
    static let ink4        = Color(hex: 0x879B8F)

    // Tactile Game Accents
    static let blaze       = Color(hex: 0xFF5428)
    static let blazeBright = Color(hex: 0xFF6E47)
    static let blazeDark   = Color(hex: 0xC9320C)
    static let blazeSoft   = Color(hex: 0xFFE4DC)

    static let gold        = Color(hex: 0xFFC21A)
    static let goldBright  = Color(hex: 0xFFE066)
    static let goldDark    = Color(hex: 0xC48700)
    static let goldSoft    = Color(hex: 0xFFF4CC)

    static let meadow      = Color(hex: 0x18A957)
    static let meadowBright = Color(hex: 0x26C26B)
    static let meadowDark  = Color(hex: 0x0F7A3E)
    static let meadowSoft  = Color(hex: 0xDCF7E7)

    static let sky         = Color(hex: 0x1E88E5)
    static let skyDark     = Color(hex: 0x135CA1)
    static let skySoft     = Color(hex: 0xDCEEFF)

    static let epic        = Color(hex: 0x8B5CF6)
    static let epicBright  = Color(hex: 0xA78BFA)
    static let epicDark    = Color(hex: 0x6232D6)
    static let epicSoft    = Color(hex: 0xEDE7FE)

    static let danger      = Color(hex: 0xE11D48)
    static let dangerSoft  = Color(hex: 0xFFE4EA)

    // Radar Dish
    static let radarCenter = Color(hex: 0x1C4A33)
    static let radarEdge   = Color(hex: 0x0E261A)
}

/// Chunky LEGO / Fortnite-style tactile button with physical press travel.
struct LootaTactileButtonStyle: ButtonStyle {
    var fillTop: Color = LootaColor.blazeBright
    var fillBottom: Color = LootaColor.blaze
    var foreground: Color = LootaColor.surface
    var shadowHeight: CGFloat = 4
    var cornerRadius: CGFloat = 14

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        configuration.label
            .font(.custom("PlusJakartaSans-ExtraBold", size: 15))
            .foregroundStyle(foreground)
            .padding(.horizontal, 18)
            .padding(.vertical, 13)
            .background(
                LinearGradient(colors: [fillTop, fillBottom], startPoint: .top, endPoint: .bottom)
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(LootaColor.ink, lineWidth: 2)
            )
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(LootaColor.ink)
                    .offset(y: pressed ? 1.5 : shadowHeight)
            )
            .offset(y: pressed ? shadowHeight - 1.5 : 0)
            .animation(.spring(response: 0.18, dampingFraction: 0.65), value: pressed)
    }
}

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}
```

---

## 8. Reference Screenshots Included (`docs/design-handoff/screenshots/`)

1. `01-desktop-creator-map.png` — Desktop GPS Map Drop Studio (`1440×900`) showing sunlit adventure map, placed Coin + Gift Card pins, floating brush pill, and Loot Stash drawer.
2. `02-desktop-creator-proximity.png` — Desktop Proximity Sonar Studio (`1440×900`) showing hardware-bezeled sonar dish, rotating sweep, Coin + Gift Card dots, and live bearing readout.
3. `03-mobile-creator-setup.png` — Mobile Creator Setup (`390×844`) showing Trailhead Arcade header, readiness bar, 3D Gold Coin & Epic Gift Card selector tiles, and chunky Trail-Blazer Orange CTA.
4. `04-mobile-creator-map.png` — Mobile Creator Map (`390×844`) showing thumb-friendly Map/Setup switcher, floating brush controls, sunlit map pins, and Loot Stash drawer.
5. `05-desktop-hunt-command-center.png` — Desktop Live Hunt Command Center (`1440×900`) showing compact command strip telemetry pills, live map, and tabbed Loot/Crew/Share/Host dock.
6. `06-mobile-hunt-qr-pass.png` — Mobile Live Hunt Share & QR Field Pass (`390×844`) showing scannable iPhone QR code card and tactile Copy/Share controls.
