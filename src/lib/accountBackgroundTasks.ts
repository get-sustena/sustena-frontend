const pendingTasks = new Set<Promise<unknown>>();

export function trackAccountBackgroundTask<T>(task: Promise<T>): Promise<T> {
  pendingTasks.add(task);
  void task.then(
    () => pendingTasks.delete(task),
    () => pendingTasks.delete(task)
  );
  return task;
}

export async function waitForAccountBackgroundTasks() {
  while (pendingTasks.size > 0) {
    await Promise.allSettled([...pendingTasks]);
  }
}
