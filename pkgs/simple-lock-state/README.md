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

### API

#### `get(key)`

Asynchronously gets the value of the specified key from the state. If the key is currently locked, it waits for the lock to be released before retrieving the value.

- **Parameters**: `key` - The key of the value to get.
- **Returns**: A promise that resolves with the value of the specified key.

#### `set(key, value)`

Asynchronously sets the value of the specified key in the state. If the key is currently locked, it waits for the lock to be released before setting the value.

- **Parameters**:
  - `key` - The key of the value to set.
  - `value` - The new value to set.
- **Returns**: A promise that resolves with "OK" when the value has been set.

#### `getAll()`

Asynchronously retrieves all key-value pairs from the state. If any key is currently locked, it waits for the lock to be released before getting the values.

- **Returns**: A promise that resolves with an object containing all key-value pairs in the state.

#### `setAll(newState)`

Asynchronously sets multiple key-value pairs in the state. If any key is currently locked, it waits for the lock to be released before setting the values.

- **Parameters**: `newState` - An object containing the key-value pairs to set.
- **Returns**: A promise that resolves with "OK" when all values have been set.

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
