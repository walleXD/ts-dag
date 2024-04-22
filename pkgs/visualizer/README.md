# @ts-dag/visualizer

This project is a visualizer for TypeScript Directed Acyclic Graphs (DAGs). It provides a graphical interface to visualize and interact with DAGs, making it easier to understand complex data structures and dependencies created with `@ts-dag/builder`.

## Installation

You can install this package via npm:

```bash
pnpm add @ts-dag/visualizer
# OR
npm install @ts-dag/visualizer
# OR
yarn add @ts-dag/visualizer
```

## Usage

### dotVisualizer

This function takes a DAG as input and returns a string in the Graphviz dot language that represents the DAG.

```typescript
import { dotVisualizer } from '@ts-dag/visualizer';

const dag = // your DAG here
const dot = dotVisualizer(dag);

console.log(dot);
```

### asciiVisualizer

This function takes a DAG as input and returns a string that represents the DAG in ASCII format.

```typescript
import { asciiVisualizer } from '@ts-dag/visualizer';

const dag = // your DAG here
const ascii = await asciiVisualizer(dag);

console.log(ascii);
```

### createOutputVisualizer

This function creates an output visualizer for a DAG. It takes an output format (svg, png, or pdf) and returns a function that takes a DAG and a path, and writes a visualization of the DAG to the specified path.

**Note:** This function requires the `graphviz` package to be installed on your system. Ensure it is installed before using this function.

```typescript
import { createOutputVisualizer } from '@ts-dag/visualizer';

const dag = // your DAG here
const outputVisualizer = createOutputVisualizer('png');
await outputVisualizer(dag, './path/to/output.png');
```
