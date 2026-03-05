export const EG1_GRIND_SETTINGS = `
# EG-1 Grind Settings Guide

## CRITICAL: How EG-1 Grind Numbers Work

The EG-1 has NO absolute zero. The "burr lock" point (where the burrs touch) is different on every single unit, depending on burr set installed and calibration. This means:

- A dial reading of "2.0" on one EG-1 could be espresso-fine
- The same "2.0" on another EG-1 could be way too coarse or way too fine
- **All grind guidance must be relative to the user's burr lock position**
- Each tick on the dial = exactly 5 microns of particle size change

## First-Time Calibration (ASK THE USER THIS)

Before giving any grind advice, you MUST know:
1. **Which burr set is installed?** (DB-1 Core, DB-2 Ultra, or DB-3 Base)
2. **What is their burr lock position?** (the number on the dial where burrs just touch)

If they don't know their burr lock position, guide them:
1. Remove all beans from the grinder
2. With the grinder OFF, slowly turn the locking ring toward finer (lower numbers)
3. Listen/feel for when the burrs just begin to touch (light chirping sound)
4. Read the number on the dial — that's their burr lock position
5. **IMPORTANT**: Never force past burr lock. Back off immediately once burrs touch.

## Grind Settings by Brew Method (numbers from burr lock position)

These are OFFSETS from burr lock, not absolute dial readings.
Example: If burr lock is at 1.5 on the dial, espresso range is 1.5 + 3.6 = 5.1 to 1.5 + 7.6 = 9.1

| Brew Method | Offset from Burr Lock | Micron Range |
|---|---|---|
| Turkish | +0.8 to +4.4 | 0–220 μm (extra fine) |
| Espresso | +3.6 to +7.6 | 180–380 μm (fine) |
| Moka Pot | +7.2 to +13.2 | 360–660 μm (fine–medium fine) |
| AeroPress | +6.4 to +19.2 | 320–960 μm (varies by method) |
| V60 | +8 to +14 | 400–700 μm (medium fine) |
| Pour Over (general) | +8.2 to +18.6 | 410–930 μm (medium fine–medium) |
| Siphon | +7.5 to +16 | 375–800 μm (medium fine–medium) |
| Filter Machine | +6 to +18 | 300–900 μm (varies) |
| Cupping | +9.2 to +17 | 460–850 μm (medium) |
| French Press | +13.8 to +26 | 690–1300 μm (coarse) |
| Cold Brew | +16 to +28 | 800–1400 μm (extra coarse) |
| Cold Drip | +16.4 to +25.4 | 820–1270 μm (coarse) |
| Steep-and-release | +9 to +16.5 | 450–825 μm (medium) |

## Espresso Starting Points (offsets from burr lock)

- **Medium roast**: Start at +5.5 from burr lock
- **Light roast**: Start at +4.5 from burr lock (finer — light roasts are denser)
- **Dark roast**: Start at +6.5 from burr lock (coarser — dark roasts are more brittle)
- **Target**: 36g out from 18g in (1:2 ratio) in 25–35 seconds

## Adjustment Tips
- **Espresso adjustments**: Move 1–2 ticks at a time (5–10 microns). Very sensitive range
- **Filter adjustments**: Move 3–5 ticks at a time (15–25 microns). More forgiving
- **Coffee age matters**: Freshly roasted (1–7 days) often needs finer. Older coffee may need coarser
- **Temperature/humidity**: May need slight daily adjustments
- **Season new burrs**: Run 1–2 kg of coffee through new burrs before dialing in seriously

## Burr Set Characteristics

### DB-1 CORE (ships standard)
- All-rounder: espresso through filter
- Good balance of body and clarity
- Most forgiving for beginners
- Recommended for users who switch between espresso and filter

### DB-2 ULTRA
- Optimized for filter/pour-over — highest clarity in cup
- Can do espresso but produces lighter-bodied, more transparent shots
- Espresso range will be slightly different — start at +4.0 from burr lock
- Best for: pour-over enthusiasts, light roast lovers, clarity seekers

### DB-3 BASE (original)
- Original Mk.1 burr set
- More traditional flavor profile
- Slightly more body than Core in espresso

## How to Help the User Calculate Their Setting

When the user tells you their burr lock position and target brew method:
1. Take their burr lock number
2. Add the offset from the table above
3. Tell them the resulting dial number

Example: "Your burr lock is at 1.2, and you want espresso. Start at 1.2 + 5.5 = 6.7 on your dial."
`;
