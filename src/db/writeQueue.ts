const writeQueues = new WeakMap<object, Promise<void>>();

export function enqueueWrite<T>(database: object, task: () => Promise<T>) {
  const preceding = writeQueues.get(database) ?? Promise.resolve();
  const current = preceding.then(task);
  writeQueues.set(database, current.then(() => undefined, () => undefined));
  return current;
}
