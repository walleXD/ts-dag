# Simple Lock State

`@ts-dag/simple-lock-state` provides a simple way to manage a shared state object with built-in locking at the key level to prevent race conditions. This package is especially useful in asynchronous environments where multiple operations might try to modify the state concurrently.

## Installation

```bash
npm install @ts-dag/simple-locked-state
```

## Usage

Import and create a locked state object:

```typescript
import { createLockedState } from "@ts-dag/simple-locked-state";

// Initialize the state with an optional initial state
const state = createLockedState<{ count: number }>({ count: 0 });
```

## API Reference

Find out more about the API in the [docs](https://wallexd.github.io/ts-dag/modules/_ts_dag_simple_lock_state.html).

## Example

Here's a quick example of how to use `createLockedState`:

```typescript
async function updateCount() {
  await state.set("count", (await state.get("count")) + 1);
  console.log(await state.getAll());
}

updateCount();
updateCount();
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have suggestions or find any bugs.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
