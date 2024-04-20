import { nanoid } from "nanoid";

export type TaskFunction<T extends Context, U extends unknown = unknown> = (
  ctx: T,
) => U | Promise<U>;
export type ContextCallback<T extends Context = Context> = (
  ctx: T,
) => Partial<T> | void;
export type AsyncContextCallback<T extends Context = Context> = (
  ctx: T,
) => Promise<Partial<T> | void>;

export interface Context {
  [key: string]: any;
}

export type Tasks<T extends Context> = Record<string, Task<T>>;

export class Task<T extends Context, U extends unknown = unknown> {
  private _output: U | undefined;
  public id = nanoid();

  constructor(
    public name: string,
    public callback: TaskFunction<T, U>,
    public dependencies: Task<T>[] = [],
  ) {}

  public async run(ctx: T): Promise<U> {
    const output = await this.callback(ctx);
    this._output = output;
    return output;
  }

  get output(): U {
    if (this._output === undefined) {
      console.error(
        `Task ${this.name} output accessed before ${this.name} ran`,
      );
      throw new Error("Output was accessed before task was run");
    }

    return this._output;
  }
}

export class Dag<T extends Context = Context> {
  private _tasks: Tasks<T> = {};
  private ctx: T = {} as T;
  private _ctxOrCallback?:
    | Partial<T>
    | ContextCallback<T>
    | AsyncContextCallback<T>;

  get tasks(): Tasks<T> {
    return this._tasks;
  }

  private topologicalSort(): Task<T>[] {
    const visited = new Set<Task<T>>();
    const sorted: Task<T>[] = [];

    const visit = (task: Task<T>) => {
      if (visited.has(task)) return;
      visited.add(task);

      task.dependencies.forEach(visit);
      sorted.push(task);
    };

    Object.values(this._tasks).forEach(visit);

    return sorted;
  }

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

  public async run(): Promise<void> {
    await this.loadContext();
    // Run tasks

    const sortedTasks = this.topologicalSort();

    // Create a map to store the promises of running each task
    const taskPromises = new Map<Task<T>, Promise<unknown>>();

    // Iterate over the sorted tasks
    for (const task of sortedTasks) {
      // Create a promise for running the task
      const taskPromise = (async () => {
        // Wait for the dependencies to complete
        const taskDeps = task.dependencies.map((dep) => taskPromises.get(dep));
        await Promise.all(taskDeps);

        const output = await task.run(this.ctx);
        return output;
      })();

      // Store the task promise in the map
      taskPromises.set(task, taskPromise);
    }

    // Wait for all tasks to complete
    await Promise.all(taskPromises.values());
  }

  context(
    ctxOrCallback: Partial<T> | ContextCallback<T> | AsyncContextCallback<T>,
  ): this {
    if (this._ctxOrCallback) {
      throw new Error("Context can only be set once per Dag instance");
    }
    this._ctxOrCallback = ctxOrCallback;

    return this;
  }

  task<U extends unknown = unknown>(
    name: string,
    callback: (ctx: T) => U | Promise<U>,
    dependencies: Task<T>[] = [],
  ): Task<T, U> {
    const task = new Task<T, U>(name, callback, dependencies);
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
        const dag = new Dag<{ hello: string }>();
        const task1 = dag.task("task1", () => {});
        assertType<Task<{ hello: string }, void>>(task1);
      });

      it("task dependencies", () => {
        const dag = new Dag<{ hello: string }>();
        const task1 = dag.task("task1", () => {});
        const task2 = dag.task("task2", async () => {}, [task1]);

        expect(task2.dependencies).toEqual([task1]);
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

  describe("type its", () => {
    it("should match TaskFunction type", () => {
      assertType<TaskFunction<Context, string>>((ctx: Context) => "");
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
      assertType<Tasks<Context>>({});
      assertType<Tasks<Context>>({ task1: new Task("task1", (ctx) => {}) });
    });

    it("should match Task type", () => {
      assertType<Task<Context, string>>(new Task("task1", (ctx) => ""));
      assertType<Task<Context, number>>(
        new Task("task1", (ctx) => Promise.resolve(0)),
      );
    });

    it("should match Dag type", () => {
      assertType<Dag<Context>>(new Dag());
      assertType<Dag<{ foo: string }>>(new Dag<{ foo: string }>());
    });
  });
}
