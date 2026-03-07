import type {
  WorkflowGraph,
  WorkflowState,
  StepId,
  StepState,
  StepStatus,
  StepGuidancePayload,
  StateMachineResult,
  StateMachineError,
} from "./types";

export class WorkflowEngine {
  private graph: WorkflowGraph;
  private state: WorkflowState;

  constructor(graph: WorkflowGraph) {
    const validationResult = WorkflowEngine.validateGraph(graph);
    if (!validationResult.ok) {
      throw new Error(validationResult.error.message);
    }
    this.graph = graph;
    this.state = this.buildInitialState();
  }

  // ── Public API ──────────────────────────────────────────────────────

  reset(): void {
    this.state = this.buildInitialState();
  }

  advanceStep(stepId: StepId): StateMachineResult<StepGuidancePayload> {
    const stepDef = this.graph.steps.find((s) => s.id === stepId);
    if (!stepDef) {
      return this.err("STEP_NOT_FOUND", `Step "${stepId}" not found in graph`);
    }

    const stepState = this.state.steps[stepId];

    if (stepState.status === "completed") {
      return this.err(
        "STEP_ALREADY_COMPLETED",
        `Step "${stepId}" is already completed`
      );
    }

    if (stepState.status === "active") {
      return this.err(
        "STEP_ALREADY_ACTIVE",
        `Step "${stepId}" is already the active step`
      );
    }

    // Mark the previously active step as completed before checking prereqs,
    // since the active step completing may satisfy this step's prerequisites.
    const previousActiveId = this.state.activeStepId;
    if (previousActiveId) {
      this.state.steps[previousActiveId].status = "completed";
      this.state.activeStepId = null;
    }

    // Check prerequisites (now with the previous step marked completed)
    const prereqResult = this.checkPrerequisites(stepId);
    if (!prereqResult.ok) {
      // Roll back the completion if prereq check itself errored
      if (previousActiveId) {
        this.state.steps[previousActiveId].status = "active";
        this.state.activeStepId = previousActiveId;
      }
      return prereqResult;
    }

    const unmet = prereqResult.value;
    if (unmet.length > 0) {
      // Roll back — previous step shouldn't be completed if we can't advance
      if (previousActiveId) {
        this.state.steps[previousActiveId].status = "active";
        this.state.activeStepId = previousActiveId;
      }
      return this.err("PREREQUISITES_NOT_MET", `Prerequisites not met for "${stepId}"`, {
        unmetSteps: unmet,
      });
    }

    // Activate this step
    stepState.status = "active";
    this.state.activeStepId = stepId;

    // Recompute availability for all locked steps
    this.recomputeAvailability();

    return { ok: true, value: this.buildGuidancePayload(stepDef) };
  }

  getCurrentStepId(): StepId | null {
    return this.state.activeStepId;
  }

  getCurrentStepGuidance(): StepGuidancePayload | null {
    if (!this.state.activeStepId) return null;
    const stepDef = this.graph.steps.find(
      (s) => s.id === this.state.activeStepId
    );
    if (!stepDef) return null;
    return this.buildGuidancePayload(stepDef);
  }

  checkPrerequisites(
    stepId: StepId
  ): StateMachineResult<StepId[]> {
    const stepDef = this.graph.steps.find((s) => s.id === stepId);
    if (!stepDef) {
      return this.err("STEP_NOT_FOUND", `Step "${stepId}" not found in graph`);
    }

    const unmet = stepDef.prerequisites.filter((prereqId) => {
      const prereqDef = this.graph.steps.find((s) => s.id === prereqId);
      // Optional prerequisites that are available or locked don't block
      if (prereqDef?.optional) {
        const prereqState = this.state.steps[prereqId];
        return prereqState.status === "active"; // only blocks if currently active (in progress)
      }
      const prereqState = this.state.steps[prereqId];
      return prereqState.status !== "completed";
    });

    return { ok: true, value: unmet };
  }

  resetStep(stepId: StepId): StateMachineResult<void> {
    const stepDef = this.graph.steps.find((s) => s.id === stepId);
    if (!stepDef) {
      return this.err("STEP_NOT_FOUND", `Step "${stepId}" not found in graph`);
    }

    if (this.state.activeStepId === stepId) {
      this.state.activeStepId = null;
    }

    this.state.steps[stepId].status = this.arePrereqsMet(stepDef)
      ? "available"
      : "locked";

    this.recomputeAvailability();

    return { ok: true, value: undefined };
  }

  getAvailableSteps(): StepId[] {
    return Object.values(this.state.steps)
      .filter((s) => s.status === "available")
      .map((s) => s.id);
  }

  isWorkflowComplete(): boolean {
    return this.graph.steps.every((stepDef) => {
      const state = this.state.steps[stepDef.id];
      return state.status === "completed" || stepDef.optional;
    });
  }

  exportState(): WorkflowState {
    return JSON.parse(JSON.stringify(this.state));
  }

  importState(state: WorkflowState): void {
    this.state = JSON.parse(JSON.stringify(state));
  }

  // ── Graph Validation ────────────────────────────────────────────────

  static validateGraph(
    graph: WorkflowGraph
  ): StateMachineResult<void> {
    const ids = new Set(graph.steps.map((s) => s.id));

    // Check for duplicate IDs
    if (ids.size !== graph.steps.length) {
      return {
        ok: false,
        error: {
          code: "INVALID_GRAPH",
          message: "Duplicate step IDs found",
        },
      };
    }

    // Check for missing prerequisite references
    for (const step of graph.steps) {
      for (const prereqId of step.prerequisites) {
        if (!ids.has(prereqId)) {
          return {
            ok: false,
            error: {
              code: "INVALID_GRAPH",
              message: `Step "${step.id}" references unknown prerequisite "${prereqId}"`,
            },
          };
        }
      }
    }

    // Cycle detection via topological sort (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    for (const step of graph.steps) {
      inDegree.set(step.id, step.prerequisites.length);
      for (const prereq of step.prerequisites) {
        const edges = adjList.get(prereq) ?? [];
        edges.push(step.id);
        adjList.set(prereq, edges);
      }
    }

    const queue = graph.steps
      .filter((s) => s.prerequisites.length === 0)
      .map((s) => s.id);
    let processed = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      processed++;
      for (const neighbor of adjList.get(current) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) queue.push(neighbor);
      }
    }

    if (processed !== graph.steps.length) {
      return {
        ok: false,
        error: {
          code: "INVALID_GRAPH",
          message: "Cycle detected in workflow graph",
        },
      };
    }

    return { ok: true, value: undefined };
  }

  // ── Private Helpers ─────────────────────────────────────────────────

  private buildInitialState(): WorkflowState {
    const steps: Record<string, StepState> = {};
    for (const step of this.graph.steps) {
      const status: StepStatus =
        step.prerequisites.length === 0 ? "available" : "locked";
      steps[step.id] = { id: step.id, status };
    }
    return {
      graphId: this.graph.id,
      steps,
      activeStepId: null,
    };
  }

  private arePrereqsMet(
    stepDef: { id: string; prerequisites: string[] }
  ): boolean {
    return stepDef.prerequisites.every((prereqId) => {
      const prereqDef = this.graph.steps.find((s) => s.id === prereqId);
      if (prereqDef?.optional) {
        const state = this.state.steps[prereqId];
        return state.status !== "active"; // optional prereqs don't block unless active
      }
      return this.state.steps[prereqId].status === "completed";
    });
  }

  private recomputeAvailability(): void {
    for (const step of this.graph.steps) {
      const state = this.state.steps[step.id];
      if (state.status === "locked" && this.arePrereqsMet(step)) {
        state.status = "available";
      }
    }
  }

  private buildGuidancePayload(
    stepDef: { id: string; name: string; guidance: string; visualCues: { what: string; indicates: string }[]; doneCriteria: string }
  ): StepGuidancePayload {
    const completed = Object.values(this.state.steps).filter(
      (s) => s.status === "completed"
    ).length;
    const total = this.graph.steps.length;

    return {
      stepId: stepDef.id,
      stepName: stepDef.name,
      guidance: stepDef.guidance,
      visualCues: stepDef.visualCues,
      doneCriteria: stepDef.doneCriteria,
      progress: {
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
      },
    };
  }

  private err<T>(
    code: StateMachineError["code"],
    message: string,
    details?: Record<string, unknown>
  ): StateMachineResult<T> {
    return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
  }
}
