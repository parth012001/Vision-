import type { WorkflowGraph } from "./types";

export const ESPRESSO_WORKFLOW: WorkflowGraph = {
  id: "espresso-shot",
  name: "Espresso Shot Workflow",
  steps: [
    {
      id: "weigh_beans",
      name: "Weigh Beans",
      guidance:
        "Guide the user to weigh their coffee beans. Target 18g for a double shot. Have them place a cup on the scale, zero it, then add beans until they reach the target weight.",
      visualCues: [
        { what: "Scale display showing weight", indicates: "User is actively weighing" },
        { what: "Cup/container on scale", indicates: "Ready to weigh" },
        { what: "Bag of beans visible", indicates: "About to start weighing" },
      ],
      doneCriteria: "User has weighed out the target dose of beans (typically 18g)",
      prerequisites: [],
    },
    {
      id: "rdt_spray",
      name: "RDT Spray",
      guidance:
        "Optional: Suggest a quick spritz of water on the beans to reduce static (Ross Droplet Technique). One or two sprays is enough — don't soak them.",
      visualCues: [
        { what: "Spray bottle in hand", indicates: "User is doing RDT" },
        { what: "Slight sheen on beans", indicates: "RDT complete" },
      ],
      doneCriteria: "User has sprayed beans or chosen to skip this step",
      prerequisites: ["weigh_beans"],
      optional: true,
    },
    {
      id: "grind_beans",
      name: "Grind Beans",
      guidance:
        "Guide the user to grind their beans with the EG-1. Have them pour beans into the hopper, check the grind setting, and run the grinder. Grounds should fall into the blind shaker or portafilter basket.",
      visualCues: [
        { what: "EG-1 LED ring glowing", indicates: "Grinder is on and ready" },
        { what: "Beans in hopper", indicates: "Ready to grind" },
        { what: "Grounds falling into container", indicates: "Grinding in progress" },
        { what: "Grinder stopped, grounds in basket", indicates: "Grinding complete" },
      ],
      doneCriteria: "All beans have been ground and collected in the portafilter basket or blind shaker",
      prerequisites: ["weigh_beans"],
    },
    {
      id: "wdt_distribute",
      name: "WDT Distribution",
      guidance:
        "Guide the user to distribute the grounds evenly using a WDT tool (the one with thin needles). Stir through the entire bed of grounds in a circular motion to break up clumps and create an even distribution.",
      visualCues: [
        { what: "WDT tool in grounds", indicates: "Distribution in progress" },
        { what: "Even, flat bed of grounds", indicates: "Distribution complete" },
        { what: "Clumps visible in basket", indicates: "Needs more distribution" },
      ],
      doneCriteria: "Grounds are evenly distributed with no visible clumps",
      prerequisites: ["grind_beans"],
    },
    {
      id: "tamp",
      name: "Tamp",
      guidance:
        "Guide the user to tamp the grounds. Place the tamper flat on the grounds and press down firmly and evenly. The goal is a level, compressed puck. No need to twist or apply excessive force — just firm and level.",
      visualCues: [
        { what: "Tamper on grounds", indicates: "Tamping in progress" },
        { what: "Flat, level surface after tamping", indicates: "Tamp complete" },
        { what: "Uneven surface", indicates: "Needs re-tamping" },
      ],
      doneCriteria: "Grounds are tamped into a flat, level puck",
      prerequisites: ["wdt_distribute"],
    },
    {
      id: "lock_portafilter",
      name: "Lock Portafilter",
      guidance:
        "Guide the user to lock the portafilter into the group head. Insert it into the group head at an angle and twist firmly to the right until it's snug. The handle should point roughly toward the user.",
      visualCues: [
        { what: "Portafilter in hand near group head", indicates: "About to lock in" },
        { what: "Portafilter handle pointing right/toward user", indicates: "Locked in correctly" },
        { what: "Portafilter loose or at wrong angle", indicates: "Not locked properly" },
      ],
      doneCriteria: "Portafilter is securely locked into the group head",
      prerequisites: ["tamp"],
    },
    {
      id: "pull_shot",
      name: "Pull Shot",
      guidance:
        "Guide the user to pull the shot. Place the cup on the scale under the spout, zero the scale, and start the shot. Watch the extraction: look for the first drips, then a steady stream. Target around 36g out in 25-30 seconds for a standard double.",
      visualCues: [
        { what: "Cup under spout on scale", indicates: "Ready to pull" },
        { what: "First dark drips appearing", indicates: "Extraction starting" },
        { what: "Steady honey-colored stream", indicates: "Good extraction in progress" },
        { what: "Stream turning pale/blonding", indicates: "Nearing the end — stop soon" },
      ],
      doneCriteria: "Shot is pulled to target yield (around 36g) within the target time window",
      prerequisites: ["lock_portafilter"],
    },
    {
      id: "evaluate_shot",
      name: "Evaluate & Adjust",
      guidance:
        "Help the user evaluate their shot. Check the time and yield. If the shot ran too fast (under-extracted), suggest going finer on the grind. If too slow (over-extracted), suggest going coarser. Encourage them to taste it and describe the flavor.",
      visualCues: [
        { what: "Scale showing final weight", indicates: "Shot complete, check yield" },
        { what: "Timer visible", indicates: "Check extraction time" },
        { what: "Crema color and thickness", indicates: "Visual quality indicator" },
      ],
      doneCriteria: "User has evaluated the shot and received adjustment advice if needed",
      prerequisites: ["pull_shot"],
    },
  ],
};

/** All step IDs from the espresso workflow, for use in function declaration enums */
export const ESPRESSO_STEP_IDS = ESPRESSO_WORKFLOW.steps.map((s) => s.id);
