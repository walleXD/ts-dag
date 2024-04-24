import { Lock } from "async-await-mutex-lock";

interface State {
  [key: string]: any;
}

/**
 * Creates a locked state object with get, set, getAll, and setAll methods.
 * Each key in the state has its own lock to prevent race conditions.
 *
 * @param initialState - The initial state of the object.
 *
 * @returns  The locked state object with the following methods:
 *
 */
function createLockedState<T extends State>(initialState: T = {} as T) {
  let state: T = initialState;
  const locks: { [key: string]: Lock<string> } = {};

  async function getLock(key: string): Promise<Lock<string>> {
    if (!locks[key]) {
      locks[key] = new Lock();
    }
    return locks[key];
  }

  /**
   * Asynchronously gets the value of the specified key from the state.
   * If the key is currently locked, it waits for the lock to be released before getting the value.
   *
   * @param key - The key of the value to get.
   *
   * @returns A promise that resolves with the value of the specified key.
   */
  async function get<K extends keyof T>(key: K): Promise<T[K]> {
    const lock = await getLock(key as string);
    try {
      await lock.acquire(key as string);
      return state[key];
    } finally {
      lock.release(key as string);
    }
  }

  /**
   * Asynchronously sets the value of the specified key in the state.
   * If the key is currently locked, it waits for the lock to be released before setting the value.
   *
   * @param key - The key of the value to set.
   * @param value - The new value to set.
   *
   * @returns A promise that resolves with "OK" when the value has been set.
   */
  async function set<K extends keyof T>(key: K, value: T[K]): Promise<"OK"> {
    const lock = await getLock(key as string);
    try {
      await lock.acquire(key as string);
      state[key] = value;
      return "OK";
    } finally {
      lock.release(key as string);
    }
  }

  /**
   * Asynchronously gets all key-value pairs from the state.
   * If any key is currently locked, it waits for the lock to be released before getting the value.
   *
   * A promise that resolves with an object containing all key-value pairs in the state.
   */
  async function getAll(): Promise<T> {
    const keys = Object.keys(state) as (keyof T)[];
    const values = await Promise.all(keys.map((key) => get(key)));
    return Object.fromEntries(
      keys.map((key, index) => [key, values[index]]),
    ) as T;
  }

  /**
   * Asynchronously sets multiple key-value pairs in the state.
   * If any key is currently locked, it waits for the lock to be released before setting the value.
   *
   * newState - An object containing the key-value pairs to set.
   *
   * A promise that resolves with "OK" when all values have been set.
   */
  async function setAll(newState: Partial<T>): Promise<"OK"> {
    const keys = Object.keys(newState) as (keyof T)[];
    await Promise.all(keys.map((key) => set(key, newState[key]!)));
    return "OK";
  }

  return {
    get,
    set,
    getAll,
    setAll,
  };
}

export default createLockedState;

if (import.meta.vitest) {
  const { it, describe, expect } = import.meta.vitest;

  describe("createLockedState", () => {
    it("should create a locked state", async () => {
      const state = createLockedState({ key1: "value1", key2: "value2" });

      expect(await state.get("key1")).toBe("value1");
      expect(await state.get("key2")).toBe("value2");
    });

    it("should set a value", async () => {
      const state = createLockedState({ key1: "value1" });

      await state.set("key1", "newValue1");
      expect(await state.get("key1")).toBe("newValue1");
    });

    it("should get all values", async () => {
      const state = createLockedState({ key1: "value1", key2: "value2" });

      const all = await state.getAll();
      expect(all).toEqual({ key1: "value1", key2: "value2" });
    });

    it("should set all values", async () => {
      const state = createLockedState({ key1: "value1", key2: "value2" });

      await state.setAll({ key1: "newValue1", key2: "newValue2" });
      const all = await state.getAll();
      expect(all).toEqual({ key1: "newValue1", key2: "newValue2" });
    });
  });
}
