import { describe, it, expect } from "vitest";
import { WorkflowEngine } from "../engine";
import { handleFunctionCall } from "../function-handler";
import type { FunctionCall } from "../function-handler";
import type { WorkflowGraph } from "../types";

function createTestGraph(): WorkflowGraph {
  return {
    id: "test",
    name: "Test",
    steps: [
      { id: "a", name: "A", guidance: "Do A", visualCues: [], doneCriteria: "A done", prerequisites: [] },
      { id: "b", name: "B", guidance: "Do B", visualCues: [], doneCriteria: "B done", prerequisites: ["a"] },
    ],
  };
}

function call(name: string, args: Record<string, unknown> = {}): FunctionCall {
  return { name, args, id: `call-${name}` };
}

describe("handleFunctionCall", () => {
  it("dispatches advance_step to engine", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, call("advance_step", { step_id: "a" }));
    expect(result.response.success).toBe(true);
    expect(result.response.data).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.response.data as any).stepId).toBe("a");
  });

  it("returns error for advance_step with unmet prerequisites", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, call("advance_step", { step_id: "b" }));
    expect(result.response.success).toBe(false);
    expect(result.response.error).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.response.data as any).unmetSteps).toContain("a");
  });

  it("dispatches get_current_step", () => {
    const engine = new WorkflowEngine(createTestGraph());
    engine.advanceStep("a");
    const result = handleFunctionCall(engine, call("get_current_step"));
    expect(result.response.success).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.response.data as any).stepId).toBe("a");
  });

  it("get_current_step returns null data when no step is active", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, call("get_current_step"));
    expect(result.response.success).toBe(true);
    expect(result.response.data).toBeNull();
  });

  it("dispatches check_prerequisites", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, call("check_prerequisites", { step_id: "b" }));
    expect(result.response.success).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.response.data as any).unmetSteps).toContain("a");
  });

  it("dispatches reset_step", () => {
    const engine = new WorkflowEngine(createTestGraph());
    engine.advanceStep("a");
    engine.advanceStep("b"); // completes a
    const result = handleFunctionCall(engine, call("reset_step", { step_id: "a" }));
    expect(result.response.success).toBe(true);
  });

  it("returns error for unknown function name", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, call("unknown_function"));
    expect(result.response.success).toBe(false);
    expect(result.response.error).toContain("Unknown function");
  });

  it("preserves call ID in output", () => {
    const engine = new WorkflowEngine(createTestGraph());
    const result = handleFunctionCall(engine, { name: "get_current_step", args: {}, id: "my-id-123" });
    expect(result.id).toBe("my-id-123");
  });
});
