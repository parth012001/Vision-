import { describe, it, expect } from "vitest";
import { ESPRESSO_WORKFLOW, ESPRESSO_STEP_IDS } from "../espresso-workflow";
import { WorkflowEngine } from "../engine";
import { handleFunctionCall } from "../function-handler";
import { buildToolDeclarations } from "../function-declarations";
import { buildSystemPrompt } from "@/knowledge/personality/system-prompt";

describe("Espresso Workflow — graph integrity", () => {
  it("passes engine graph validation (no cycles, no missing prerequisites, no duplicates)", () => {
    const result = WorkflowEngine.validateGraph(ESPRESSO_WORKFLOW);
    expect(result.ok).toBe(true);
  });

  it("has exactly 30 steps", () => {
    expect(ESPRESSO_WORKFLOW.steps).toHaveLength(30);
  });

  it("ESPRESSO_STEP_IDS matches step count", () => {
    expect(ESPRESSO_STEP_IDS).toHaveLength(30);
  });

  it("has no duplicate step IDs", () => {
    const unique = new Set(ESPRESSO_STEP_IDS);
    expect(unique.size).toBe(ESPRESSO_STEP_IDS.length);
  });

  it("forms a linear prerequisite chain (each step prerequisites the previous)", () => {
    const steps = ESPRESSO_WORKFLOW.steps;
    expect(steps[0].prerequisites).toEqual([]);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].prerequisites).toEqual([steps[i - 1].id]);
    }
  });

  it("has no optional steps", () => {
    for (const step of ESPRESSO_WORKFLOW.steps) {
      expect(step.optional).toBeUndefined();
    }
  });

  it("every step has non-empty guidance, name, and doneCriteria", () => {
    for (const step of ESPRESSO_WORKFLOW.steps) {
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.guidance.length).toBeGreaterThan(0);
      expect(step.doneCriteria.length).toBeGreaterThan(0);
    }
  });

  it("every step has at least one visual cue", () => {
    for (const step of ESPRESSO_WORKFLOW.steps) {
      expect(step.visualCues.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("Espresso Workflow — full walkthrough", () => {
  it("engine can advance through all 30 steps in order", () => {
    const engine = new WorkflowEngine(ESPRESSO_WORKFLOW);

    for (let i = 0; i < ESPRESSO_STEP_IDS.length; i++) {
      const stepId = ESPRESSO_STEP_IDS[i];
      const result = engine.advanceStep(stepId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.stepId).toBe(stepId);
        expect(result.value.progress.total).toBe(30);
        expect(result.value.progress.completed).toBe(i);
      }
    }
  });

  it("skipping a step fails with PREREQUISITES_NOT_MET", () => {
    const engine = new WorkflowEngine(ESPRESSO_WORKFLOW);
    // Try to jump to step 3 without completing steps 1-2
    const result = engine.advanceStep(ESPRESSO_STEP_IDS[2]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PREREQUISITES_NOT_MET");
    }
  });

  it("function handler can advance through all 30 steps via advance_step calls", () => {
    const engine = new WorkflowEngine(ESPRESSO_WORKFLOW);

    for (const stepId of ESPRESSO_STEP_IDS) {
      const result = handleFunctionCall(engine, {
        name: "advance_step",
        args: { step_id: stepId },
        id: `call-${stepId}`,
      });
      expect(result.response.success).toBe(true);
      expect(result.id).toBe(`call-${stepId}`);
    }
  });
});

describe("Espresso Workflow — function declarations", () => {
  it("tool declarations include all 30 step IDs in the enum", () => {
    const tools = buildToolDeclarations(ESPRESSO_WORKFLOW);
    const advanceStep = tools.find((t) => t.name === "advance_step");
    expect(advanceStep).toBeDefined();

    const schema = advanceStep!.parametersJsonSchema as {
      properties: { step_id: { enum: string[] } };
    };
    expect(schema.properties.step_id.enum).toEqual(ESPRESSO_STEP_IDS);
    expect(schema.properties.step_id.enum).toHaveLength(30);
  });
});

describe("System prompt — no stale WDT references in role prompt", () => {
  // The full system prompt includes knowledge base docs that may legitimately
  // reference WDT as a general technique. We only care that the ROLE PROMPT
  // (the part before "# KNOWLEDGE BASE") doesn't instruct users to use WDT.
  const prompt = buildSystemPrompt();
  const rolePrompt = prompt.split("# KNOWLEDGE BASE")[0];

  it("role prompt does not reference WDT tool", () => {
    expect(rolePrompt).not.toContain("WDT tool");
    expect(rolePrompt).not.toContain("thin needles");
  });

  it("role prompt contains blind shaker explanation", () => {
    expect(rolePrompt).toContain("Blind shaker");
  });

  it("role prompt references 'distribution and tamping' not 'WDT and tamping'", () => {
    expect(rolePrompt).not.toContain("skip WDT");
    expect(rolePrompt).toContain("skip distribution and tamping");
  });

  it("lists all 30 step IDs in function calling instructions", () => {
    for (const stepId of ESPRESSO_STEP_IDS) {
      expect(prompt).toContain(stepId);
    }
  });
});
