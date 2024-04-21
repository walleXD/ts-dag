# @ts-dag/builder

`@ts-dag/builder` is a TypeScript module designed for building and executing directed acyclic graphs (DAG) of tasks. It provides a flexible and powerful way to define tasks with dependencies, manage execution context, and handle asynchronous operations.

## Installation

[![NPM](https://nodei.co/npm/@ts-dag/builder.png?mini=true)](https://npmjs.org/package/@ts-dag/builder)

To install the module, use pnpm, npm or yarn:

```bash
pnpm install @ts-dag/builder
# or
npm install @ts-dag/builder
# or
yarn add @ts-dag/builder
```

## Usage

Here is how you can use `@ts-dag/builder` to define tasks, set up dependencies, and run your DAG:

```typescript
import { Dag } from "@ts-dag/builder";

const dag = new Dag();

const task1 = dag.task("task1", async (ctx) => {
  // Task 1 logic
});

const task2 = dag.task(
  "task2",
  async (ctx) => {
    // Task 2 logic
  },
  [task1],
); // task2 depends on task1

await dag.run();
```

## API Reference

### Types

#### `TaskFunction<T, U>`

- **Type:** `(ctx: T) => U | Promise<U>`
- **Description:** A function that defines the work of a task. It can be synchronous or asynchronous.

#### `ContextCallback<T>`

- **Type:** `(ctx: T) => Partial<T> | void`
- **Description:** A function used to modify or update the context synchronously.

#### `AsyncContextCallback<T>`

- **Type:** `(ctx: T) => Promise<Partial<T> | void>`
- **Description:** A function used to modify or update the context asynchronously.

#### `Context`

- **Type:** `{ [key: string]: any }`
- **Description:** An interface representing the context passed to tasks. It can hold any key-value pairs.

#### `Tasks<T>`

- **Type:** `Record<string, Task<T>>`
- **Description:** A record type mapping task names to task instances.

### Classes

#### `Task<T, U>`

- **Constructor:** `(name: string, callback: TaskFunction<T, U>, dependencies: Task<T>[] = [])`
- **Methods:**
  - `run(ctx: T): Promise<U>`: Executes the task using the provided context.
  - `output`: Getter that returns the result of the task. Throws if accessed before the task is run.

#### `Dag<T>`

- **Methods:**
  - `task<U>(name: string, callback: TaskFunction<T, U>, dependencies: Task<T>[] = []): Task<T, U>`: Registers a new task.
  - `context(ctxOrCallback: Partial<T> | ContextCallback<T> | AsyncContextCallback<T>): this`: Sets the initial context or a method to derive it.
  - `run(): Promise<void>`: Executes all tasks in the DAG respecting their dependencies.

### Examples

#### Basic Task Setup

```typescript
const dag = new Dag<{ value: number }>();
dag.context({ value: 10 });

const increment = dag.task("increment", (ctx) => {
  return ctx.value + 1;
});

await dag.run();
console.log(increment.output); // Outputs: 11
```

#### Handling Dependencies

```typescript
const dag = new Dag();

const fetchData = dag.task("fetchData", async () => {
  const data = await fetch("https://api.example.com/data");
  return await data.json();
});

const processData = dag.task(
  "processData",
  async (ctx) => {
    const data = fetchData.output; // Access output of fetchData
    return process(data); // Assume process is a function that processes data
  },
  [fetchData],
);

await dag.run();
```
