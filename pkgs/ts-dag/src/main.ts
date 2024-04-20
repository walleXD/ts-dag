export * from "./dag";

/**
// Example usage
import { createDag } from 'ts-dag';

const dag = createDag()
  .context({})
  .task('task1', async (ctx) => {
    // Task 1 implementation
    console.log('Running Task 1');
  })
  .dependsOn((ctx) => [])
  .task('task2', async (ctx) => {
    // Task 2 implementation
    console.log('Running Task 2');
  })
  .dependsOn((ctx) => [ctx.tasks.task1])
  .task('task3', async (ctx) => {
    // Task 3 implementation
    console.log('Running Task 3');
  })
  .dependsOn((ctx) => [ctx.tasks.task1, ctx.tasks.task2]);

dag.run();

*/
