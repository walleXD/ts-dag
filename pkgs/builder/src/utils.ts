import createLockedState from "@ts-dag/simple-lock-state";
import { Dag, Task, Context } from "./dag"; // Assuming the path to your DAG implementation
import { vi } from "vitest";

/**
 * Creates a mock task for testing purposes.
 *
 * @param name - The name of the mock task.
 * @param output - The output that the mock task should produce.
 *
 * @returns The created mock task. The task's run method and output getter are mocked to directly return the provided output.
 */
export function createMockTask<T extends Context, U>(
  name: string,
  output: U,
): Task<T, {}, U> {
  const mockFunction = vi.fn(() => Promise.resolve(output));
  const mockTask = new Task<T, {}, U>(name, mockFunction);

  // Replace the run method to directly return the mocked output
  mockTask.run = vi.fn(() => Promise.resolve(output));

  // Mock the output getter to directly return the mocked output
  Object.defineProperty(mockTask, "output", {
    get: vi.fn(() => output),
  });

  return mockTask;
}

/**
 * Replaces tasks in a task graph with mock tasks for testing purposes.
 *
 * @template T - A type that extends from the Context interface.
 *
 * @param taskGraph - The task graph in which tasks should be replaced with mocks.
 * @param  mocks - An object mapping task names to mock outputs. Each task with a name present in this object will be replaced with a mock task that produces the corresponding output.
 *
 * @returns The modified task graph with tasks replaced by mocks.
 */
export function replaceTasksWithMocks<T extends Context>(
  dag: Dag<T>,
  mocks: { [key: string]: Task<T, any> },
): void {
  Object.keys(mocks).forEach((taskName) => {
    if (dag.tasks[taskName]) {
      dag.tasks[taskName] = mocks[taskName];
    } else {
      console.warn(`Task "${taskName}" not found in DAG and cannot be mocked.`);
    }
  });
}

if (import.meta.vitest) {
  const { it, describe, expect } = import.meta.vitest;

  // write tests for functions above
  describe("createMockTask", () => {
    it("creates a mock task", () => {
      const mockTask = createMockTask("mockTask", "mockOutput");
      expect(mockTask.name).toBe("mockTask");
      expect(mockTask.output).toBe("mockOutput");
    });

    it("mocks the run method", async () => {
      const mockTask = createMockTask("mockTask", "mockOutput");
      const state = createLockedState();
      const output = await mockTask.run({}, { state });
      expect(output).toBe("mockOutput");
    });

    it("mocks the output getter", () => {
      const mockTask = createMockTask("mockTask", "mockOutput");
      expect(mockTask.output).toBe("mockOutput");
    });
  });

  describe("replaceTasksWithMocks", () => {
    it("replaces tasks with mocks", () => {
      const dag = new Dag();
      const task1 = dag.task(
        "task1",
        vi.fn(() => Promise.resolve("output1")),
      );
      const task2 = dag.task(
        "task2",
        vi.fn(() => Promise.resolve("output2")),
      );
      const mockTask1 = createMockTask("task1", "mockOutput1");
      const mockTask2 = createMockTask("task2", "mockOutput2");
      replaceTasksWithMocks(dag, {
        task1: mockTask1,
        task2: mockTask2,
      });
      expect(dag.tasks.task1).toBe(mockTask1);
      expect(dag.tasks.task2).toBe(mockTask2);
    });

    it("warns when task not found in DAG", () => {
      const dag = new Dag();
      const mockTask = createMockTask("task1", "mockOutput");
      const consoleWarnSpy = vi.spyOn(console, "warn");
      replaceTasksWithMocks(dag, { task1: mockTask });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Task "task1" not found in DAG and cannot be mocked.',
      );
    });
  });
}
