import type { FunctionDeclaration } from "@google/genai";
import type { WorkflowGraph } from "./types";

export function buildToolDeclarations(
  graph: WorkflowGraph
): FunctionDeclaration[] {
  const stepIds = graph.steps.map((s) => s.id);

  return [
    {
      name: "advance_step",
      description:
        "Call this BEFORE guiding the user through a new workflow step. " +
        "The system will check prerequisites and return step-specific guidance, " +
        "visual cues to watch for, and done criteria. You MUST use the returned " +
        "guidance to instruct the user. Do NOT skip steps or guide without calling this first.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          step_id: {
            type: "string",
            enum: stepIds,
            description: "The ID of the step to advance to",
          },
        },
        required: ["step_id"],
      },
    },
    {
      name: "get_current_step",
      description:
        "Returns the currently active step and its guidance. " +
        "Call this after reconnecting to a session to recover your place in the workflow.",
      parametersJsonSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "check_prerequisites",
      description:
        "Check whether the prerequisites for a given step are met. " +
        "Use this before attempting to advance if you're unsure whether the user " +
        "has completed prior steps.",
      parametersJsonSchema: {
        type: "object",
        properties: {
          step_id: {
            type: "string",
            enum: stepIds,
            description: "The ID of the step to check prerequisites for",
          },
        },
        required: ["step_id"],
      },
    },
    {
      name: "reset_step",
      description:
        "Reset a completed step so the user can retry it. " +
        "Use this when the user wants to redo a step (e.g., re-grind beans after a bad shot).",
      parametersJsonSchema: {
        type: "object",
        properties: {
          step_id: {
            type: "string",
            enum: stepIds,
            description: "The ID of the step to reset",
          },
        },
        required: ["step_id"],
      },
    },
  ];
}
