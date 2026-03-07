// ── Step & Workflow Graph ────────────────────────────────────────────

export type StepId = string;

export type StepStatus = "locked" | "available" | "active" | "completed";

export interface Prerequisite {
  stepId: StepId;
  description: string;
}

export interface VisualCue {
  what: string;
  indicates: string;
}

export interface StepDefinition {
  id: StepId;
  name: string;
  guidance: string;
  visualCues: VisualCue[];
  doneCriteria: string;
  prerequisites: StepId[];
  optional?: boolean;
}

export interface WorkflowGraph {
  id: string;
  name: string;
  steps: StepDefinition[];
}

// ── Runtime State ───────────────────────────────────────────────────

export interface StepState {
  id: StepId;
  status: StepStatus;
}

export interface WorkflowState {
  graphId: string;
  steps: Record<StepId, StepState>;
  activeStepId: StepId | null;
}

// ── Engine Results ──────────────────────────────────────────────────

export type StateMachineErrorCode =
  | "STEP_NOT_FOUND"
  | "PREREQUISITES_NOT_MET"
  | "STEP_ALREADY_COMPLETED"
  | "STEP_ALREADY_ACTIVE"
  | "INVALID_GRAPH";

export interface StateMachineError {
  code: StateMachineErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type StateMachineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StateMachineError };

// ── Function Response Payload ───────────────────────────────────────

export interface StepGuidancePayload {
  stepId: StepId;
  stepName: string;
  guidance: string;
  visualCues: VisualCue[];
  doneCriteria: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}
