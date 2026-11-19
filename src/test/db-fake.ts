// A tiny stand-in for the Drizzle query builder used by route tests. Every builder method
// returns the same chainable object, and awaiting it yields the next queued result, so a
// test lists what each successive query should return, in the order the route awaits them.
export function createDbFake() {
  const results: unknown[] = [];
  const calls: { op: string; args: unknown[] }[] = [];

  const chain: Record<string, unknown> = {};
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args });
      return chain;
    };
  for (const op of [
    "from",
    "where",
    "limit",
    "orderBy",
    "innerJoin",
    "groupBy",
    "values",
    "returning",
    "onConflictDoNothing",
    "onConflictDoUpdate",
    "set",
  ]) {
    chain[op] = record(op);
  }
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    const next = results.length ? results.shift() : [];
    return next instanceof Error
      ? Promise.reject(next).then(resolve, reject)
      : Promise.resolve(next).then(resolve, reject);
  };

  const db = {
    select: record("select"),
    insert: record("insert"),
    update: record("update"),
    delete: record("delete"),
  };

  return {
    db,
    // Queue results (an Error rejects) for the next awaited queries.
    queue: (...next: unknown[]) => void results.push(...next),
    reset: () => {
      results.length = 0;
      calls.length = 0;
    },
    // Arguments passed to every `.values(...)` call, in order.
    inserted: () => calls.filter((c) => c.op === "values").map((c) => c.args[0]),
  };
}
