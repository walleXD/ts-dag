import { digraph, toDot } from "ts-graphviz";
import { Context, Dag, Task } from "@ts-dag/builder";
import { toFile } from "@ts-graphviz/adapter";
import { join } from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";

export const dotVisualizer = <T extends Context = Context>(dag: Dag) => {
  const graph = digraph("G");

  const visited = new Set<Task<T>>();

  const visit = (task: Task<T>) => {
    if (visited.has(task)) return;
    visited.add(task);

    const node = graph.createNode(task.name, { shape: "box" });

    task.dependencies.forEach((dep) => {
      const depNode = graph.createNode(dep.name, { shape: "box" });
      graph.createEdge([depNode, node]);
      visit(dep);
    });
  };

  Object.values(dag.topologicalSort()).forEach((task) => {
    visit(task);
  });

  const dot = toDot(graph);

  return dot;
};

export const asciiVisualizer = async (dag: Dag) => {
  const dot = dotVisualizer(dag);

  const requestOptions = {
    method: "GET",
  };

  const res = await fetch(
    `https://dot-to-ascii.ggerganov.com/dot-to-ascii.php?boxart=0&src=${dot}`,
    requestOptions,
  ).then((response) => response.text());

  return res;
};

/**
 * Creates an output visualizer for a directed acyclic graph (DAG).
 * @param outputFormat - The format of the output visualization. Defaults to "png".
 * @returns A function that takes a DAG and a path, and writes a visualization of the DAG to the specified path.
 */
export const createOutputVisualizer =
  (outputFormat: "svg" | "png" | "pdf" = "png") =>
  async (dag: Dag, path: string) => {
    const dot = dotVisualizer(dag);
    return toFile(dot, path, { format: outputFormat });
  };

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach, afterEach } = import.meta.vitest;

  describe("dotVisualizer", () => {
    it.todo("should generate a valid DOT representation of the DAG", () => {
      const dag = new Dag<Context>();
      const task1 = dag.task("Task 1", async () => {});
      const task2 = dag.task("Task 2", async () => {});
      const task3 = dag.task("Task 3", async () => {}, [task1]);
      const task4 = dag.task("Task 4", async () => {}, [task2, task3]);

      const dot = dotVisualizer(dag);

      expect(dot).toContain('digraph "G"');
      expect(dot).toContain('"Task 1" [');
      expect(dot).toContain('"Task 2" [');
      expect(dot).toContain('"Task 3" [');
      expect(dot).toContain('"Task 4" [');
      expect(dot).toContain('"Task 3" -> "Task 1"');
      expect(dot).toContain('"Task 4" -> "Task 2"');
      expect(dot).toContain('"Task 4" -> "Task 3"');
    });
  });

  describe("createOutputVisualizer", () => {
    const outputDir = "test-output";
    const outputPath = join(outputDir, "dag.png");

    beforeEach(() => {
      // Create the output directory if it doesn't exist
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir);
      }
    });

    afterEach(() => {
      // Clean up the output file after each test
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    });

    it("should generate a visualization file with the specified format", async () => {
      const dag = new Dag<Context>();
      const task1 = dag.task("Task 1", async () => {});
      const task2 = dag.task("Task 2", async () => {});
      const task3 = dag.task("Task 3", async () => {}, [task1]);
      const task4 = dag.task("Task 4", async () => {}, [task2, task3]);

      await createOutputVisualizer("png")(dag, outputPath);

      // Assert that the output file exists
      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe("asciiVisualizer", () => {
    it("should generate a valid ASCII representation of the DAG", async () => {
      const dag = new Dag<Context>();
      const task1 = dag.task("Task 1", async () => {});
      const task2 = dag.task("Task 2", async () => {});
      const task3 = dag.task("Task 3", async () => {}, [task1]);
      const task4 = dag.task("Task 4", async () => {}, [task2, task3]);

      const ascii = await asciiVisualizer(dag);
      console.log(ascii);
      expect(ascii).toContain("Task 1");
    });

    it("should generate a valid ASCII representation of the DAG", async () => {
      // Create a new builder instance
      const dag = new Dag();

      // Define tasks
      const taskA = dag.task("taskA", () => {});
      const taskB = dag.task("taskB", () => {}, [taskA]);
      const taskC = dag.task("taskC", () => {}, [taskA]);
      const taskD = dag.task("taskD", () => {}, [taskB, taskC]);
      const taskE = dag.task("taskE", () => {}, [taskD]);

      const ascii = await asciiVisualizer(dag);
      console.log(ascii);
      expect(ascii).toContain("taskA");
    });
  });
}
