// Two signals between screens and the outbox processor
// (useSyncQueueProcessor): a screen that queued an edit asks for a send
// now, and the processor says when a run has finished, so screens reload
// what changed on the device (a server id swapped in for a temporary one).
type Listener = () => void;

function createSignal() {
  const listeners = new Set<Listener>();
  return {
    emit() {
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const syncRequested = createSignal();
const syncFinished = createSignal();

export const requestSync = syncRequested.emit;
export const onSyncRequested = syncRequested.subscribe;
export const notifySyncFinished = syncFinished.emit;
export const onSyncFinished = syncFinished.subscribe;
