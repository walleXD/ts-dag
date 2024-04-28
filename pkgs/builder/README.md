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

Find out more about the API in the [docs](https://wallexd.github.io/ts-dag/modules/_ts_dag_builder.html).

### More Examples

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
