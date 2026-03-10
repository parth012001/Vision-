import type { WorkflowGraph } from "./types";

export const ESPRESSO_WORKFLOW: WorkflowGraph = {
  id: "espresso-shot",
  name: "Espresso Shot Workflow",
  steps: [
    // ── Phase: Measure ──────────────────────────────────────────────
    {
      id: "turn_on_scale",
      name: "Turn On Scale",
      guidance:
        "Let's start by getting your scale ready. Find the power button on your scale and turn it on. You should see the display light up.",
      visualCues: [
        { what: "Scale display lit up", indicates: "Scale is powered on" },
        { what: "Scale display dark", indicates: "Scale still off" },
      ],
      doneCriteria: "Scale display is on and showing a reading",
      prerequisites: [],
    },
    {
      id: "place_cup_on_scale",
      name: "Place Cup on Scale",
      guidance:
        "Grab a small cup or bean dish and place it on the center of the scale. This is what you'll weigh your beans into.",
      visualCues: [
        { what: "Cup sitting on scale", indicates: "Cup is placed" },
        { what: "Scale display showing weight", indicates: "Cup detected" },
      ],
      doneCriteria: "Cup or container is resting on the scale",
      prerequisites: ["turn_on_scale"],
    },
    {
      id: "tare_scale",
      name: "Zero the Scale",
      guidance:
        "Now zero the scale so it reads 0.0 with the cup on it. Look for a button labeled 'T', 'TARE', or '0' on your scale and press it.",
      visualCues: [
        { what: "Scale display reading 0.0", indicates: "Scale is zeroed" },
        { what: "Scale display showing cup weight", indicates: "Not yet zeroed" },
      ],
      doneCriteria: "Scale display reads 0.0g with the cup on it",
      prerequisites: ["place_cup_on_scale"],
    },
    {
      id: "pour_beans_into_cup",
      name: "Pour Beans into Cup",
      guidance:
        "Pour beans into the cup on the scale. You're aiming for 18 grams — add slowly as you get close so you don't overshoot.",
      visualCues: [
        { what: "Beans falling into cup", indicates: "Pouring in progress" },
        { what: "Scale display climbing toward 18g", indicates: "Getting close" },
        { what: "Scale display at or near 18.0g", indicates: "Target reached" },
      ],
      doneCriteria: "Scale reads approximately 18g of beans",
      prerequisites: ["tare_scale"],
    },
    {
      id: "confirm_weight",
      name: "Confirm Bean Weight",
      guidance:
        "Check the scale — you want to be within about half a gram of 18g. If you're over, take a couple beans out. If under, add a couple more.",
      visualCues: [
        { what: "Scale display between 17.5 and 18.5", indicates: "Weight is good" },
        { what: "Scale display well above or below 18", indicates: "Needs adjustment" },
      ],
      doneCriteria: "Bean weight confirmed at approximately 18g",
      prerequisites: ["pour_beans_into_cup"],
    },

    // ── Phase: Grind ────────────────────────────────────────────────
    {
      id: "place_shaker_on_grinder",
      name: "Place Shaker on Grinder",
      guidance:
        "Time to grind. Grab your blind shaker — that's the metal cup your grounds fall into — and place it on the EG-1's shaker platen, right under the spout.",
      visualCues: [
        { what: "Blind shaker sitting on grinder platen", indicates: "Shaker is placed" },
        { what: "Grinder spout visible above shaker", indicates: "Positioned correctly" },
      ],
      doneCriteria: "Blind shaker is seated on the EG-1 shaker platen",
      prerequisites: ["confirm_weight"],
    },
    {
      id: "turn_on_grinder",
      name: "Turn On Grinder",
      guidance:
        "Turn on the EG-1. Press the power button — you should see the LED ring light up around the hopper.",
      visualCues: [
        { what: "EG-1 LED ring glowing", indicates: "Grinder is powered on" },
        { what: "No LED ring visible", indicates: "Grinder still off" },
      ],
      doneCriteria: "EG-1 LED ring is lit and grinder is on",
      prerequisites: ["place_shaker_on_grinder"],
    },
    {
      id: "pour_beans_into_hopper",
      name: "Pour Beans into Hopper",
      guidance:
        "Pour your weighed beans into the EG-1 hopper. Tip the cup in slowly — you don't want beans bouncing out.",
      visualCues: [
        { what: "Beans falling into hopper", indicates: "Pouring in progress" },
        { what: "Hopper containing beans", indicates: "Beans loaded" },
      ],
      doneCriteria: "All beans are in the EG-1 hopper",
      prerequisites: ["turn_on_grinder"],
    },
    {
      id: "wait_for_grinding_to_finish",
      name: "Wait for Grinding",
      guidance:
        "The EG-1 is grinding now. I can hear it working. Watch the grounds falling into the blind shaker — you'll see a nice pile building up. The grinder will slow down and stop once all the beans are through.",
      visualCues: [
        { what: "Grounds falling from spout", indicates: "Grinding in progress" },
        { what: "Grinder sound stopped", indicates: "Grinding may be complete" },
        { what: "No more grounds falling", indicates: "All beans ground" },
      ],
      doneCriteria: "Grinder has stopped and all beans are ground",
      prerequisites: ["pour_beans_into_hopper"],
    },
    {
      id: "turn_off_grinder",
      name: "Turn Off Grinder",
      guidance:
        "Grinding is done. Turn off the EG-1 by pressing the power button again. The LED ring should go dark.",
      visualCues: [
        { what: "LED ring off", indicates: "Grinder is powered off" },
        { what: "LED ring still glowing", indicates: "Grinder still on" },
      ],
      doneCriteria: "EG-1 is powered off",
      prerequisites: ["wait_for_grinding_to_finish"],
    },
    {
      id: "knock_out_retained_grounds",
      name: "Knock Out Retained Grounds",
      guidance:
        "Give the side of the grinder a couple gentle taps to knock out any grounds stuck inside the chute. You want every bit of that 18 grams in your shaker.",
      visualCues: [
        { what: "Extra grounds falling into shaker", indicates: "Retained grounds released" },
        { what: "No more grounds falling after taps", indicates: "Chute is clear" },
      ],
      doneCriteria: "Retained grounds have been knocked out of the chute",
      prerequisites: ["turn_off_grinder"],
    },
    {
      id: "remove_shaker_from_grinder",
      name: "Remove Shaker",
      guidance:
        "Carefully lift the blind shaker off the platen. Try to keep it level so you don't spill any grounds.",
      visualCues: [
        { what: "Shaker lifted off grinder", indicates: "Shaker removed" },
        { what: "Shaker still on platen", indicates: "Not yet removed" },
      ],
      doneCriteria: "Blind shaker is removed from the grinder",
      prerequisites: ["knock_out_retained_grounds"],
    },

    // ── Phase: Distribute & Tamp ────────────────────────────────────
    {
      id: "place_lid_on_shaker",
      name: "Place Lid on Shaker",
      guidance:
        "Now for distribution. Grab the blind shaker lid and place it firmly on top of the shaker so nothing spills out when you shake it.",
      visualCues: [
        { what: "Lid on top of shaker", indicates: "Lid is placed" },
        { what: "Shaker without lid", indicates: "Lid not yet on" },
      ],
      doneCriteria: "Lid is securely on the blind shaker",
      prerequisites: ["remove_shaker_from_grinder"],
    },
    {
      id: "shake_grounds",
      name: "Shake Grounds",
      guidance:
        "Hold the shaker with the lid on and give it about 10-15 firm shakes. This breaks up clumps and distributes the grounds evenly — way better than stirring.",
      visualCues: [
        { what: "User shaking the shaker", indicates: "Shaking in progress" },
        { what: "User holding shaker still after shaking", indicates: "Shaking done" },
      ],
      doneCriteria: "Grounds have been shaken and redistributed",
      prerequisites: ["place_lid_on_shaker"],
    },
    {
      id: "place_shaker_on_portafilter",
      name: "Place Shaker on Portafilter",
      guidance:
        "Flip the shaker upside down and place it on top of your portafilter basket so the opening lines up. The grounds will transfer when you flip the whole thing.",
      visualCues: [
        { what: "Shaker sitting inverted on portafilter", indicates: "Positioned for transfer" },
        { what: "Portafilter visible beneath shaker", indicates: "Ready to pour" },
      ],
      doneCriteria: "Shaker is inverted and seated on the portafilter",
      prerequisites: ["shake_grounds"],
    },
    {
      id: "pour_grounds_into_portafilter",
      name: "Pour Grounds into Portafilter",
      guidance:
        "Flip the portafilter and shaker together so the grounds drop into the basket. Give it a gentle tap to make sure everything falls through.",
      visualCues: [
        { what: "Grounds falling into portafilter basket", indicates: "Transfer in progress" },
        { what: "Grounds mounded in portafilter", indicates: "Transfer complete" },
      ],
      doneCriteria: "All grounds have been transferred into the portafilter basket",
      prerequisites: ["place_shaker_on_portafilter"],
    },
    {
      id: "tap_and_remove_shaker",
      name: "Tap and Remove Shaker",
      guidance:
        "Tap the bottom of the shaker a few times to release any grounds clinging to the inside, then lift it off the portafilter.",
      visualCues: [
        { what: "Shaker lifted away from portafilter", indicates: "Shaker removed" },
        { what: "Grounds visible in portafilter basket", indicates: "Ready for next step" },
      ],
      doneCriteria: "Shaker is removed and all grounds are in the portafilter",
      prerequisites: ["pour_grounds_into_portafilter"],
    },
    {
      id: "tap_portafilter_to_settle",
      name: "Tap Portafilter to Settle",
      guidance:
        "Give the portafilter a couple firm taps on the counter or your palm to collapse any air pockets and settle the grounds into an even bed.",
      visualCues: [
        { what: "Grounds settled into even layer", indicates: "Bed is settled" },
        { what: "Grounds mounded or uneven", indicates: "Needs more tapping" },
      ],
      doneCriteria: "Grounds are settled into a relatively even bed",
      prerequisites: ["tap_and_remove_shaker"],
    },
    {
      id: "place_tamper_on_grounds",
      name: "Place Tamper on Grounds",
      guidance:
        "Grab your tamper — that's the flat heavy thing — and rest it on top of the grounds. Make sure it sits flat and level before you press.",
      visualCues: [
        { what: "Tamper resting on grounds", indicates: "Tamper is placed" },
        { what: "Tamper tilted or off-center", indicates: "Reposition tamper" },
      ],
      doneCriteria: "Tamper is resting flat on the grounds",
      prerequisites: ["tap_portafilter_to_settle"],
    },
    {
      id: "press_and_tamp_grounds",
      name: "Press and Tamp",
      guidance:
        "Press straight down firmly and evenly. You don't need to use all your strength — just firm and level pressure. No need to twist.",
      visualCues: [
        { what: "User pressing down on tamper", indicates: "Tamping in progress" },
        { what: "Flat compressed surface visible", indicates: "Tamp complete" },
      ],
      doneCriteria: "Grounds are compressed into a flat, level puck",
      prerequisites: ["place_tamper_on_grounds"],
    },
    {
      id: "remove_tamper",
      name: "Remove Tamper",
      guidance:
        "Lift the tamper straight up. You should see a nice flat, even surface — that's your puck.",
      visualCues: [
        { what: "Flat level puck visible in basket", indicates: "Puck looks good" },
        { what: "Uneven or cracked surface", indicates: "Tamp may need redoing" },
      ],
      doneCriteria: "Tamper is removed and puck surface is flat",
      prerequisites: ["press_and_tamp_grounds"],
    },

    // ── Phase: Puck Screen ──────────────────────────────────────────
    {
      id: "pick_up_puck_screen",
      name: "Pick Up Puck Screen",
      guidance:
        "Grab your puck screen — that's the thin metal mesh disc. It goes on top of the puck to help water distribute evenly.",
      visualCues: [
        { what: "Puck screen in hand", indicates: "User has the screen" },
        { what: "Metal mesh disc visible", indicates: "Screen identified" },
      ],
      doneCriteria: "User is holding the puck screen",
      prerequisites: ["remove_tamper"],
    },
    {
      id: "place_screen_on_puck",
      name: "Place Screen on Puck",
      guidance:
        "Set the puck screen flat on top of the puck inside the basket. It should sit nice and level.",
      visualCues: [
        { what: "Screen sitting flat on puck", indicates: "Screen placed correctly" },
        { what: "Screen tilted or off-center", indicates: "Reposition the screen" },
      ],
      doneCriteria: "Puck screen is flat on top of the puck",
      prerequisites: ["pick_up_puck_screen"],
    },

    // ── Phase: Brew ─────────────────────────────────────────────────
    {
      id: "lock_portafilter_in_machine",
      name: "Lock Portafilter",
      guidance:
        "Time to brew. Insert the portafilter into the GS3 group head at an angle and twist it firmly to the right until it's snug. The handle should end up pointing roughly toward you.",
      visualCues: [
        { what: "Portafilter handle pointing toward user", indicates: "Locked in correctly" },
        { what: "Portafilter at angle in group head", indicates: "Being inserted" },
        { what: "Portafilter loose or hanging", indicates: "Not fully locked" },
      ],
      doneCriteria: "Portafilter is securely locked into the group head",
      prerequisites: ["place_screen_on_puck"],
    },
    {
      id: "get_coffee_cup",
      name: "Get Coffee Cup",
      guidance:
        "Grab an espresso cup — a small one, about 2-3 oz. If you want to weigh your shot, put the cup on the scale first.",
      visualCues: [
        { what: "Espresso cup in hand or on counter", indicates: "Cup ready" },
        { what: "Cup on scale", indicates: "Ready to weigh the shot" },
      ],
      doneCriteria: "User has an espresso cup ready",
      prerequisites: ["lock_portafilter_in_machine"],
    },
    {
      id: "place_cup_under_portafilter",
      name: "Place Cup Under Portafilter",
      guidance:
        "Place the cup on the drip tray directly under the portafilter spout. If you're weighing the shot, put the scale on the tray with the cup on top and zero it.",
      visualCues: [
        { what: "Cup positioned under spout", indicates: "Cup is in place" },
        { what: "Scale on drip tray with cup", indicates: "Ready to weigh shot" },
      ],
      doneCriteria: "Cup is positioned under the portafilter spout",
      prerequisites: ["get_coffee_cup"],
    },
    {
      id: "start_brewing",
      name: "Start Brewing",
      guidance:
        "Hit the brew button on the GS3 to start the shot. Watch for the first drops — they should appear after a few seconds.",
      visualCues: [
        { what: "First dark drops appearing from spout", indicates: "Extraction starting" },
        { what: "No flow after several seconds", indicates: "Grind may be too fine" },
      ],
      doneCriteria: "Brew button pressed and extraction has started",
      prerequisites: ["place_cup_under_portafilter"],
    },
    {
      id: "wait_for_brew_to_complete",
      name: "Wait for Brew",
      guidance:
        "The shot is pulling now — I can see the stream flowing. It should start dark and thick, then transition to a honey-golden color. We're aiming for about 36 grams out in 25 to 30 seconds. I'll keep an eye on it and let you know when to stop.",
      visualCues: [
        { what: "Steady honey-colored stream", indicates: "Good extraction" },
        { what: "Stream running pale or watery", indicates: "Blonding — stop soon" },
        { what: "Very slow drips", indicates: "Grind may be too fine" },
        { what: "Gushing fast stream", indicates: "Grind may be too coarse" },
      ],
      doneCriteria: "Shot has reached target yield of approximately 36g",
      prerequisites: ["start_brewing"],
    },
    {
      id: "confirm_shot_is_pulled",
      name: "Confirm Shot is Pulled",
      guidance:
        "Stop the shot now — hit the brew button again to stop. That looked like a solid pull. Check the scale if you have one — you're looking for around 36 grams.",
      visualCues: [
        { what: "Flow stopped", indicates: "Shot is pulled" },
        { what: "Scale showing final weight", indicates: "Can check yield" },
        { what: "Crema visible on top of shot", indicates: "Shot complete" },
      ],
      doneCriteria: "Shot is stopped and espresso is in the cup",
      prerequisites: ["wait_for_brew_to_complete"],
    },

    // ── Phase: Evaluate ─────────────────────────────────────────────
    {
      id: "evaluate_shot",
      name: "Evaluate and Adjust",
      guidance:
        "Let's evaluate the shot. Check the time and yield — ideally 25-30 seconds for about 36 grams out. If it ran too fast, go finer on the grind next time. Too slow, go a bit coarser. Give it a taste and tell me what you think!",
      visualCues: [
        { what: "Scale showing final weight", indicates: "Check yield" },
        { what: "Timer visible", indicates: "Check extraction time" },
        { what: "Crema color and thickness", indicates: "Visual quality indicator" },
      ],
      doneCriteria: "User has evaluated the shot and received adjustment advice if needed",
      prerequisites: ["confirm_shot_is_pulled"],
    },
  ],
};

/** All step IDs from the espresso workflow, for use in function declaration enums */
export const ESPRESSO_STEP_IDS = ESPRESSO_WORKFLOW.steps.map((s) => s.id);
