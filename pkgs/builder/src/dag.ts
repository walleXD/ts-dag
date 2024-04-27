import { nanoid } from "nanoid";
import pRetry, { AbortError } from "p-retry";
import createSls, { State } from "@ts-dag/simple-lock-state";

/**
 * Specialized error type for aborting a task retry.
 */
export const AbortTaskRetryError = AbortError;

/**
 * A function that performs a task within a given context.
 * @template T - The type of the context.
 * @template S - The type of shared state.
 * @template U - The type of the return value.
 * @param ctx - The context in which the task is performed.
 * @returns - The result of the task.
 */
export type TaskFunction<
  T extends Context,
  S extends State,
  U extends unknown = unknown,
  M extends Meta<S> = Meta<S>,
> = (ctx: T, meta: M) => U | Promise<U>;

/**
 * A callback function that modifies a given context.
 * @template T - The type of the context.
 * @param ctx - The context to be modified.
 * @returns - The modified context or nothing.
 */
export type ContextCallback<T extends Context = Context> = (
  ctx: T,
) => Partial<T> | void;

/**
 * An asynchronous callback function that modifies a given context.
 * @template T - The type of the context.
 * @param ctx - The context to be modified.
 * @returns - A promise that resolves with the modified context or nothing.
 */
export type AsyncContextCallback<T extends Context = Context> = (
  ctx: T,
) => Promise<Partial<T> | void>;

/**
 * An interface representing a context.
 * A context is an object that can have any number of properties of any type.
 */
export interface Context {
  [key: string]: any;
}

/**
 * A record of tasks with their names as keys and the tasks themselves as values.
 * @template T - The type of the context in which the tasks are performed.
 * @template S - The type of shared state.
 */
export type Tasks<T extends Context, S extends State> = Record<
  string,
  Task<T, S>
>;

/**
 * A class representing a task.
 * @template T - The type of the context in which the task is performed.
 * @template S - The type of shared state.
 * @template O - The type of the return value of the task.
 */
export class Task<
  T extends Context,
  S extends State,
  O extends unknown = unknown,
> {
  private _output?: O;
  public id = nanoid();

  constructor(
    public name: string,
    public callback: TaskFunction<T, S>,
    public dependencies: Task<T, S>[] = [],
    public retryCount = 0,
  ) {
    if (retryCount < 0) {
      throw new Error("retryCount cannot be negative");
    }
  }

  /**
   * Runs the task with the provided context.
   *
   * @template T - The type of the context that the task requires.
   * @template S - The type of shared state.
   * @template O - The type of the output that the task produces.
   *
   * @param ctx - The context to run the task with.
   * @param meta  - The meta object containing runtime states.
   *
   * @returns A promise that resolves with the output of the task.
   */
  public async run(ctx: T, meta: Meta<S>): Promise<O> {
    const output = await (this.retryCount > 0
      ? pRetry(() => this.callback(ctx, meta), { retries: this.retryCount })
      : this.callback(ctx, meta));

    this._output = output as O;
    return this._output;
  }

  get output(): O {
    if (this._output === undefined) {
      console.error(
        `Task ${this.name} output accessed before ${this.name} ran`,
      );
      throw new TaskError(
        TaskError.errors.prematureOutputAccessError,
        "Output was accessed before task was run",
      );
    }

    return this._output;
  }
}

/**
 * Represents an error that occurred while working with a Directed Acyclic Graph (DAG).
 *
 * @template T - The type of the context that the DAG uses.
 *
 * @property name - The name of the error.
 * @property message - A message describing the error.
 * @property [cause] - The underlying cause of the error, if any.
 * @property [task] - The task that was being run when the error occurred, if any.
 */
export class TsDagError<T extends Context = Context> extends Error {
  constructor(
    public name: string,
    public message: string,
    public cause?: any,
    public task?: Task<T, State>,
  ) {
    super(message, { cause: cause });
  }
}

export type DagErrorName =
  (typeof DagError.errors)[keyof typeof DagError.errors];

/**
 * Represents a specific type of error that can occur while working with a Directed Acyclic Graph (DAG).
 *
 * This class extends TsDagError and adds specific error names for different types of DAG errors.
 *
 * @template T - The type of the context that the DAG uses.
 *
 * @property name - The name of the error. This is one of the keys of the `errors` object.
 * @property message - A message describing the error.
 * @property [cause] - The underlying cause of the error, if any.
 * @property [task] - The task that was being run when the error occurred, if any.
 */
export class DagError<T extends Context = Context> extends TsDagError<T> {
  static readonly errors = {
    dependentTaskExecutionError: "DependentTaskExecutionError",
    executionError: "ExecutionError",
    multipleContextAssignmentError: "MultipleContextAssignmentError",
    multipleStateInitializationError: "multipleStateInitializationError",
  } as const;

  constructor(
    public name: DagErrorName,
    public message: string,
    public cause?: any,
    public task?: Task<T, State>,
  ) {
    super(name, message, cause, task);
  }
}

export type TaskErrorName =
  (typeof TaskError.errors)[keyof typeof TaskError.errors];

/**
 * Represents a specific type of error that can occur while working with a Task in a Directed Acyclic Graph (DAG).
 *
 * This class extends TsDagError and adds a specific error name for task errors.
 *
 * @template T - The type of the context that the DAG uses.
 *
 * @property name - The name of the error. This is one of the keys of the `errors` object.
 * @property message - A message describing the error.
 * @property [cause] - The underlying cause of the error, if any.
 * @property [task] - The task that was being run when the error occurred, if any.
 */
export class TaskError<T extends Context = Context> extends TsDagError<T> {
  static readonly errors = {
    prematureOutputAccessError: "PrematureOutputAccessError",
  } as const;

  constructor(
    public name: TaskErrorName,
    public message: string,
    public cause?: any,
    public task?: Task<T, State>,
  ) {
    super(name, message, cause, task);
  }
}

/**
 * Represents an unknown error that occurred while working with a Directed Acyclic Graph (DAG).
 *
 * This class extends TsDagError and is used for errors that do not fall into any of the other specific error categories.
 *
 * @template T - The type of the context that the DAG uses.
 *
 * @property name - The name of the error. This is always "UnknownDagError".
 * @property message - A message describing the error.
 * @property cause - The underlying cause of the error.
 * @property [task] - The task that was being run when the error occurred, if any.
 */
export class UnknownDagError<
  T extends Context = Context,
> extends TsDagError<T> {
  constructor(message: string, cause: any, task?: Task<T, State>) {
    super("UnknownDagError", message, cause, task);
  }
}

export interface Meta<S extends State> {
  state: ReturnType<typeof createSls<S>>;
}

/**
 * A class representing a directed acyclic graph (DAG) of tasks.
 * @template T - The type of the context in which the tasks are performed.
 * @template S - The type of shared state.
 */
export class Dag<T extends Context = Context, S extends State = State> {
  private _tasks: Tasks<T, S> = {};
  private ctx: T = {} as T;
  private meta: Meta<S> = {} as Meta<S>;
  private _ctxOrCallback?:
    | Partial<T>
    | ContextCallback<T>
    | AsyncContextCallback<T>;

  get tasks(): Tasks<T, S> {
    return this._tasks;
  }

  public useState(initialState: S) {
    if (this.meta.state) {
      throw new DagError(
        DagError.errors.multipleStateInitializationError,
        "State can only be set once per DAG instance",
      );
    }

    this.meta.state = createSls(initialState);
    return this;
  }

  /**
   * Performs a topological sort on the tasks in the DAG.
   *
   * This method is used to determine an order for the tasks that respects their dependencies.
   * In the resulting order, each task comes before all tasks that depend on it.
   *
   * @returns An array of tasks in topologically sorted order.
   */
  public topologicalSort(): Task<T, S>[] {
    const visited = new Set<Task<T, S>>();
    const sorted: Task<T, S>[] = [];

    const visit = (task: Task<T, S>) => {
      if (visited.has(task)) return;
      visited.add(task);

      task.dependencies.forEach(visit);
      sorted.push(task);
    };

    Object.values(this._tasks).forEach(visit);

    return sorted;
  }

  /**
   * Loads the context for the DAG.
   *
   * This method is responsible for loading the context that will be used when running the tasks in the DAG.
   * The context can either be an object or a callback function that produces the context.
   * If the context is a callback function, it can be either synchronous or asynchronous.
   *
   * @returns A promise that resolves when the context has been loaded.
   */
  private async loadContext(): Promise<void> {
    const ctxOrCallback = this._ctxOrCallback;
    if (typeof ctxOrCallback === "object") {
      Object.assign(this.ctx, ctxOrCallback);
    } else if (typeof ctxOrCallback === "function") {
      const callback = ctxOrCallback as
        | ContextCallback<T>
        | AsyncContextCallback<T>;
      if (callback.constructor.name === "AsyncFunction") {
        const result = await (callback as AsyncContextCallback)(this.ctx);
        if (typeof result === "object") {
          Object.assign(this.ctx, result);
        }
      } else {
        const result = (callback as ContextCallback)(this.ctx);
        if (typeof result === "object") {
          Object.assign(this.ctx, result);
        }
      }
    }
  }

  /**
   * Runs all the tasks in the DAG.
   *
   * This method first loads the context for the DAG, then performs a topological sort on the tasks to determine the order in which they should be run.
   * Each task is run after all its dependencies have completed.
   *
   * @returns A promise that resolves when all tasks have completed. If any task fails, the promise is rejected with the error that caused the failure.
   *
   * @throws If an unknown error occurs while running a task, an `UnknownDagError` is thrown.
   * @throws If a task fails due to a dependency failure, a `DagError` is thrown.
   */
  public async run(): Promise<void> {
    await this.loadContext();
    // Run tasks

    const sortedTasks = this.topologicalSort();

    // Create a map to store the promises of running each task
    const taskPromises = new Map<Task<T, S>, Promise<unknown>>();

    // Iterate over the sorted tasks
    for (const task of sortedTasks) {
      // Create a promise for running the task
      const taskPromise = (async () => {
        // Wait for the dependencies to complete
        const taskDeps = task.dependencies.map((dep) => taskPromises.get(dep));

        try {
          // TODO: handle dependency errors
          await Promise.all(taskDeps);
        } catch (error) {
          if (error instanceof Error) {
            throw new DagError(
              DagError.errors.dependentTaskExecutionError,
              `Task ${task.name} failed to run due to dependency failure`,
              error.stack,
              task as unknown as Task<T, State>,
            );
          }

          throw new UnknownDagError(
            "Unknown error while running a task",
            error,
            task as unknown as Task<T, State>,
          );
        }

        const output = await task.run(this.ctx, this.meta);
        return output;
      })();

      // Store the task promise in the map
      taskPromises.set(task, taskPromise);
    }

    try {
      // Wait for all tasks to complete
      await Promise.allSettled(taskPromises.values());
    } catch (error) {
      if (error instanceof UnknownDagError || error instanceof DagError) {
        console.error(error.name, error.message, error);
        throw error;
      } else {
        console.error("Unforseen Error in dag run", error);
      }

      throw error;
    }
  }

  /**
   * Sets the context for the DAG.
   *
   * The context can be a partial context object, a synchronous context callback, or an asynchronous context callback.
   * The context is used when running the tasks in the DAG.
   *
   * Note: The context can only be set once per DAG instance. If you try to set the context more than once, a DagError will be thrown.
   *
   * @param ctxOrCallback - The context or context callback to set.
   *
   * @returns The current DAG instance, allowing for method chaining.
   *
   * @throws If the context has already been set for this DAG instance.
   */
  context(
    ctxOrCallback: Partial<T> | ContextCallback<T> | AsyncContextCallback<T>,
  ): this {
    if (this._ctxOrCallback) {
      throw new DagError(
        DagError.errors.multipleContextAssignmentError,
        "Context can only be set once per DAG instance",
      );
    }

    this._ctxOrCallback = ctxOrCallback;

    return this;
  }

  /**
   * Creates a new task and adds it to the DAG.
   *
   * @template U - The type of the output that the task produces.
   *
   * @param name - The name of the task.
   * @param callback - The callback function to run when the task is executed. This function takes the DAG's context as an argument and produces the task's output.
   * @param [dependencies=[]] - An array of tasks that this task depends on. This task will not be run until all its dependencies have completed.
   * @param [retryCount] - The number of times to retry the task if it fails. If not provided, the task will not be retried.
   *
   * @returns The created task.
   */
  task<U extends unknown = unknown>(
    name: string,
    callback: (ctx: T, meta: Meta<S>) => U | Promise<U>,
    dependencies: Task<T, S>[] = [],
    retryCount?: number,
  ): Task<T, S, U> {
    const task = new Task<T, S, U>(name, callback, dependencies, retryCount);
    this._tasks[name] = task;

    return task;
  }
}

if (import.meta.vitest) {
  const { expect, it, describe, assertType, vi, beforeEach } = import.meta
    .vitest;

  describe("Dag", () => {
    describe("task", () => {
      it("task creation", () => {
        const dag = new Dag<{ hello: string }>();
        const task1 = dag.task("task1", () => {
          console.log("Running Task 1");
        });

        const task2 = dag.task("task2", async () => {
          console.log("Running Task 2");
          return 2;
        });
        dag.task("task3", async () => {
          console.log("Running Task 3");
        });
        expect(Object.keys(dag.tasks)).toEqual(["task1", "task2", "task3"]);
      });

      it("it type", () => {
        const dag = new Dag<{ hello: string }, {}>();
        const task1 = dag.task("task1", () => {});
        assertType<Task<{ hello: string }, {}, void>>(task1);
      });

      it("task dependencies", () => {
        const dag = new Dag<{ hello: string }>();
        const task1 = dag.task("task1", () => {});
        const task2 = dag.task("task2", async () => {}, [task1]);

        expect(task2.dependencies).toEqual([task1]);
      });

      // test out task retry
      it("task retry on failure", async () => {
        const dag = new Dag<{ hello: string }>();

        const fn1 = vi.fn();
        const task1 = dag.task(
          "task1",
          async () => {
            fn1();
            throw new Error("Task 1 failed");
          },
          [],
          2,
        );

        try {
          await dag.run();
        } catch (error) {
          expect(fn1).toHaveBeenCalledTimes(2);
        }
      });
    });

    describe("error handling", () => {
      it("should throw an error if context is set multiple times", () => {
        expect(() =>
          new Dag().context({ foo: "bar" }).context({ foo: "bar" }),
        ).toThrowError(DagError);
      });

      it("should throw an error if task output is accessed without dependency", () => {
        const dag = new Dag<{ hello: string }>();

        const task1 = dag.task("task1", () => {
          return 1;
        });

        const task2 = dag.task("task2", async () => {
          console.log(task1.output);
          return task1.output + 1;
        });

        expect(() => task1.output).toThrowError(TaskError);
      });

      it("tasks error", async () => {
        const dag = new Dag<{ hello: string }>();
        const task1 = dag.task("task1", () => {
          return 1;
        });

        const task2 = dag.task(
          "task2",
          async () => {
            throw new Error("Task 2 failed");
          },
          [task1],
        );

        try {
          await dag.run();
        } catch (error) {
          expect(error).toBeInstanceOf(DagError);
        }
      });
    });

    describe("context", () => {
      it("object", async () => {
        // it setting context with object
        const dag = new Dag();
        dag.context({ foo: "bar" });

        const task1 = dag.task("task1", (ctx) => {
          expect(ctx.foo).toBe("bar");
        });

        await dag.run();
      });

      it("callback", async () => {
        // it setting context with callback
        const dag = new Dag();
        dag.context((ctx) => ({ foo: "bar" }));
        const task1 = dag.task("task1", (ctx) => {
          expect(ctx.foo).toBe("bar");
        });
        await dag.run();
      });

      it("async callback", async () => {
        // it setting context with async callback
        const dag = new Dag();
        dag.context(async (ctx) => ({ foo: "bar" }));
        const task1 = dag.task("task1", (ctx) => {
          expect(ctx.foo).toBe("bar");
        });
        await dag.run();
      });
    });

    describe("run", () => {
      let dag: Dag<{ foo: string }>;

      beforeEach(() => {
        dag = new Dag();
        dag.context({ foo: "bar" });
      });

      it("simple dag", async () => {
        const fn1 = vi.fn();

        const task1 = dag.task("task1", (ctx) => {
          console.log("Running Task 1");
          fn1();
        });

        const fn2 = vi.fn();
        const task2 = dag.task("task2", async (ctx) => {
          console.log("Running Task 2");
          fn2();
        });

        const fn3 = vi.fn();
        const task3 = dag.task(
          "task3",
          async (ctx) => {
            console.log("Running Task 3");
            fn3();
          },
          [task1, task2],
        );

        await dag.run();
        expect(fn1).toHaveBeenCalledOnce();
        expect(fn2).toHaveBeenCalledOnce();
        expect(fn3).toHaveBeenCalledOnce();
        expect(fn2.mock.invocationCallOrder[0]).toBeLessThan(
          fn3.mock.invocationCallOrder[0],
        );
        expect(fn1.mock.invocationCallOrder[0]).toBeLessThan(
          fn3.mock.invocationCallOrder[0],
        );
      });

      it("dag with output", async () => {
        const fn1 = vi.fn(() => 1);
        const task1 = dag.task<number>("task1", fn1);
        const task2 = dag.task(
          "task2",
          async (ctx) => {
            return task1.output + 1;
          },
          [task1],
        );

        await dag.run();

        expect(fn1).toHaveBeenCalledOnce();
        expect(task1.output).toBe(1);
        expect(task2.output).toBe(2);
      });

      it("should fetch data from APIs, combine them, and perform work", async () => {
        const dag = new Dag<Context>();

        type User = {
          id: number;
          name: string;
          username: string;
          email: string;
        };

        type Post = {
          id: number;
          title: string;
          body: string;
          userId: number;
        };

        type Comment = {
          id: number;
          name: string;
          email: string;
          body: string;
          postId: number;
        };

        // Task 1: Fetch users from API
        const fetchUsersTask = dag.task<User[]>("fetchUsers", async () => {
          const response = await fetch(
            "https://jsonplaceholder.typicode.com/users",
          );
          return await response.json();
        });

        // Task 2: Fetch posts from API
        const fetchPostsTask = dag.task<Post[]>("fetchPosts", async () => {
          const response = await fetch(
            "https://jsonplaceholder.typicode.com/posts",
          );
          return await response.json();
        });

        // Task 3: Fetch comments from API
        const fetchCommentsTask = dag.task<Comment[]>(
          "fetchComments",
          async () => {
            const response = await fetch(
              "https://jsonplaceholder.typicode.com/comments",
            );
            return await response.json();
          },
        );

        // Task 4: Combine users, posts, and comments
        const combineDataTask = dag.task(
          "combineData",
          (ctx) => {
            const combinedData = fetchUsersTask.output.map((user) => ({
              user,
              posts: fetchPostsTask.output.filter(
                (post) => post.userId === user.id,
              ),
              comments: fetchCommentsTask.output.filter((comment) => {
                const postIds = fetchPostsTask.output
                  .filter((post) => post.userId === user.id)
                  .map((post) => post.id);
                return postIds.includes(comment.postId);
              }),
            }));
            return combinedData;
          },
          [fetchUsersTask, fetchPostsTask, fetchCommentsTask],
        );

        // Task 5: Perform work on the combined data
        const performWorkTask = dag.task(
          "performWork",
          (ctx) => {
            // Perform some work on the combined data
            const result = combineDataTask.output.map((data) => ({
              userId: data.user.id,
              userName: data.user.name,
              totalPosts: data.posts.length,
              totalComments: data.comments.length,
            }));
            return result;
          },
          [combineDataTask],
        );

        // Run the Dag
        await dag.run();

        // Assertions
        expect(fetchUsersTask.output).toHaveLength(10);
        expect(fetchPostsTask.output).toHaveLength(100);
        expect(fetchCommentsTask.output).toHaveLength(500);
        expect(combineDataTask.output).toHaveLength(10);
        expect(performWorkTask.output).toHaveLength(10);

        const user1Result = performWorkTask.output.find(
          (data) => data.userId === 1,
        );
        expect(user1Result).toEqual({
          userId: 1,
          userName: "Leanne Graham",
          totalPosts: 10,
          totalComments: 50,
        });
      });
    });
  });

  // write tests to test meta and state
  describe("State", () => {
    it("should use state", async () => {
      const dag = new Dag<{}, { count: number }>().useState({ count: 0 });
      const state = { count: 0 };

      const incrementTask = dag.task("increment", async (ctx, meta) => {
        const val = await meta.state.get("count");
      });
    });

    it("should use state", async () => {
      const dag = new Dag<{}, { count: number }>().useState({ count: 0 });

      const incrementTask = dag.task("increment", async (ctx, meta) => {
        await meta.state.set("count", 1);
      });

      const decrementTask = dag.task("decrement", async (ctx, meta) => {
        await meta.state.set("count", -1);
        return meta.state.get("count");
      });

      await dag.run();
      expect(decrementTask.output).toBe(-1);
    });
  });

  describe("type its", () => {
    it("should match TaskFunction type", () => {
      assertType<TaskFunction<Context, {}, string>>((ctx: Context) => "");
      assertType<TaskFunction<Context, Promise<number>>>((ctx: Context) =>
        Promise.resolve(0),
      );
    });

    it("should match ContextCallback type", () => {
      assertType<ContextCallback<Context>>((ctx: Context) => {});
      assertType<ContextCallback<Context>>((ctx: Context) => ({ foo: "bar" }));
    });

    it("should match AsyncContextCallback type", () => {
      assertType<AsyncContextCallback<Context>>(async (ctx: Context) => {});
      assertType<AsyncContextCallback<Context>>(async (ctx: Context) => ({
        foo: "bar",
      }));
    });

    it("should match Context type", () => {
      assertType<Context>({});
      assertType<Context>({ foo: "bar" });
    });

    it("should match Tasks type", () => {
      assertType<Tasks<Context, {}>>({});
      assertType<Tasks<Context, {}>>({ task1: new Task("task1", (ctx) => {}) });
    });

    it("should match Task type", () => {
      assertType<Task<Context, {}, string>>(new Task("task1", (ctx) => ""));
      assertType<Task<Context, {}, number>>(
        new Task("task1", (ctx) => Promise.resolve(0)),
      );
    });

    it("should match Dag type", () => {
      assertType<Dag<Context>>(new Dag());
      assertType<Dag<{ foo: string }>>(new Dag<{ foo: string }>());
    });
  });
}
