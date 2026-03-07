import type { WorkflowEngine } from "./engine";
import type { StepGuidancePayload } from "./types";

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  id: string;
}

export interface FunctionCallOutput {
  id: string;
  name: string;
  response: Record<string, unknown>;
}

export function handleFunctionCall(
  engine: WorkflowEngine,
  call: FunctionCall
): FunctionCallOutput {
  const respond = (
    success: boolean,
    data?: StepGuidancePayload | { unmetSteps: string[] } | null,
    error?: string
  ): FunctionCallOutput => ({
    id: call.id,
    name: call.name,
    response: {
      success,
      ...(data !== undefined ? { data } : {}),
      ...(error !== undefined ? { error } : {}),
    },
  });

  switch (call.name) {
    case "advance_step": {
      const stepId = call.args.step_id as string;
      const result = engine.advanceStep(stepId);
      if (result.ok) {
        return respond(true, result.value);
      }
      if (
        result.error.code === "PREREQUISITES_NOT_MET" &&
        result.error.details
      ) {
        return respond(false, { unmetSteps: result.error.details.unmetSteps as string[] }, result.error.message);
      }
      return respond(false, undefined, result.error.message);
    }

    case "get_current_step": {
      const guidance = engine.getCurrentStepGuidance();
      return respond(true, guidance);
    }

    case "check_prerequisites": {
      const stepId = call.args.step_id as string;
      const result = engine.checkPrerequisites(stepId);
      if (result.ok) {
        return respond(true, {
          unmetSteps: result.value,
        });
      }
      return respond(false, undefined, result.error.message);
    }

    case "reset_step": {
      const stepId = call.args.step_id as string;
      const result = engine.resetStep(stepId);
      if (result.ok) {
        return respond(true);
      }
      return respond(false, undefined, result.error.message);
    }

    default:
      return respond(false, undefined, `Unknown function: "${call.name}"`);
  }
}
