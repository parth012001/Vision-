export const EG1_WORKFLOW = `
# EG-1 Workflows & Procedures

**IMPORTANT: VERIFY checkpoints**
Before giving each instruction, check the VERIFY condition visually. If the condition is NOT met, say the "If not" phrase instead of proceeding.

## Daily Startup
1. **VERIFY**: Display shows "0" or any number (grinder has power)
   → If not: "First, let's turn on your grinder — flip the power switch on the back of the unit"
2. **VERIFY**: Display is visible and showing RPM or "0"
   → If not: "Check the mains power switch on the back — it should be flipped to ON"
3. Check RPM is set to your preferred speed (500–700 RPM typical)
4. Press on/off button to start motor (Hot Start recommended)
5. **VERIFY**: LED ring is glowing and motor is spinning
   → If not: "Press the round on/off button on the front of the base"
6. Run a purge dose: grind 2–3g of sacrificial beans to clear stale retained grounds
7. Tap the clicker behind the funnels to clear the spout
8. Discard purge grounds. Ready to grind.

## Grinding a Dose (standard single-dose workflow)

### Weighing Beans
1. **VERIFY**: Scale display is lit (shows numbers)
   → If not: "First, let's turn on your scale — look for the power button"
2. Place a small cup or container on the scale
3. **VERIFY**: Display shows a weight (any number)
   → If not: "Tap the scale to wake it up, or check if it's plugged in"
4. Zero the scale (press the button marked T, TARE, or 0)
5. **VERIFY**: Display shows 0.0 or 0g
   → If not: "Try the zero button again — it might be labeled T or TARE"
6. Scoop beans into the cup until display shows 18g (or your target dose)

### Grinding
1. **VERIFY**: EG-1 LED ring is glowing (grinder is on)
   → If not: "Let's turn on the grinder — press the round button on the front"
2. Optional: Apply RDT — 1–2 sprays from the RDT bottle onto beans, stir to coat
3. **VERIFY**: Motor is spinning (you can hear it, LED ring is bright)
   → If not: "Press the on/off button to start the motor — we want it spinning before the beans go in"
4. Dump beans into the bean dish
5. Grounds collect in the blind shaker (or portafilter if using rail system)
6. Wait ~10 seconds for grinding to finish
7. **VERIFY**: Motor sound has returned to idle (no more grinding noise)
   → If not: "Let it finish grinding — you'll hear the sound change when it's done"
8. Tap the clicker to purge residual grounds from the spout
9. Remove blind shaker/portafilter with your grounds

## Dialing In Espresso (the most common procedure)

### Prerequisites
- Know your burr lock position (see Grind Settings Guide for calibration)
- Know which burr set is installed

### Steps
1. **Calculate starting point**: Burr lock position + offset for your roast level
   - Medium roast: burr lock + 5.5
   - Light roast: burr lock + 4.5
   - Dark roast: burr lock + 6.5
2. **Set the grind**: Lift locking ring, turn to calculated setting, release ring
3. **Weigh 18g** of beans (follow Weighing Beans procedure above)
4. **Grind** (follow Grinding procedure above)
5. **Prepare the puck**:
   - **VERIFY**: Grounds are in the portafilter basket
     → If not: "Transfer the grounds from the blind shaker into your portafilter basket"
   - Use WDT tool (thin needles) to break all clumps in the basket
   - Level the bed of grounds
   - Tamp evenly with consistent pressure
   - **VERIFY**: Surface is flat and level after tamping
     → If not: "Give it another tamp — press straight down and keep it level"
6. **Pull the shot**:
   - **VERIFY**: GS3 is warmed up (pressure gauge in normal range)
     → If not: "Let's wait for the machine to warm up — the pressure gauge should be in the green zone"
   - **VERIFY**: Portafilter is locked into the group head
     → If not: "Lock the portafilter into the group head — push up and turn right until it's snug"
   - Target: 36g out (1:2 ratio) in 25–35 seconds
   - Start timing from pump activation
7. **Evaluate and adjust**:
   - Shot too fast (<20s) or sour → go FINER by 1–2 ticks (5–10 μm)
   - Shot too slow (>40s) or bitter → go COARSER by 1–2 ticks (5–10 μm)
   - In range but sour → go finer by 1 tick
   - In range but bitter → go coarser by 1 tick
   - Balanced, sweet, clean → you're dialed in!
8. **Iterate**: Usually takes 2–4 shots to dial in a new coffee

## Switching Between Espresso and Filter
1. Note your current espresso setting (write down the dial number or take a photo)
2. Run motor briefly with no beans to clear the chamber
3. Calculate filter setting: burr lock + offset for your brew method (e.g., +11 for V60 center)
4. Lift locking ring, turn to new setting
5. Grind a small purge dose at the new setting (discard)
6. Ready for filter brewing
7. To switch back: reverse process, return to noted espresso setting, purge

## RDT (Ross Droplet Technique)
The EG-1 ships with an RDT bottle for this purpose.
1. Weigh your dose of beans in a cup
2. Spray 1–2 pumps of water onto the beans
3. Stir or shake to distribute moisture evenly
4. Grind as normal
5. Result: dramatically less static — grounds fall cleanly into the blind shaker/portafilter

## WDT (Weiss Distribution Technique)
1. After grinding into the portafilter basket
2. Use a WDT tool (thin needles/pins, 0.3–0.4mm diameter)
3. Stir through the entire bed of grounds
4. Break up ALL clumps — especially important with the EG-1's fine espresso grinds
5. Level the surface
6. Tamp evenly
7. Result: more even extraction, no channeling

## Cleaning (daily — no tools required)
1. Power down at mains switch (back of unit)
2. Ensure on/off button is NOT depressed
3. Pull down then out to remove Upper Funnel
4. Pull down then out to remove Lower Funnel
5. Brush coffee residue from grind chamber surfaces
6. Wipe with damp towel if needed
7. Do not place any EG-1 parts in a dishwasher
8. Reassemble funnels in reverse
9. Run a purge dose to re-season

## Troubleshooting

### Espresso Problems
- **Channeling** (uneven/spraying flow): Improve WDT, ensure even tamp, check puck prep
- **Sour shot**: Grind finer (1–2 ticks), or increase brew temperature on machine, or increase yield
- **Bitter shot**: Grind coarser (1–2 ticks), or decrease brew temperature, or decrease yield
- **Watery/thin**: Increase dose, grind finer, check for channeling
- **Astringent/drying**: Decrease temperature, coarsen grind slightly

### Grinder Problems
- **Motor won't start**: Check mains power switch on back. Check if on/off button is stuck
- **Grinder jammed**: Use purge button (center of RPM knob) — it reverse-spins then bursts at MAX to clear jams
- **Excessive static**: Use RDT (1–2 sprays of water on beans before grinding)
- **Clumping**: Normal for espresso-fine grinds. Use WDT tool to break clumps
- **Inconsistent grind**: Check if locking ring is seated properly, verify burr alignment
`;
