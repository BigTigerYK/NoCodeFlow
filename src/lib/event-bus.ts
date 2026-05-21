type EventListener<T = unknown> = (event: T) => void;

export interface EventBus {
  on<T = unknown>(eventType: string, listener: EventListener<T>): () => void;
  emit<T = unknown>(eventType: string, event: T): void;
  off(eventType: string): void;
  clear(): void;
  listenerCount(eventType: string): number;
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventListener>>();

  return {
    on<T = unknown>(eventType: string, listener: EventListener<T>): () => void {
      let set = listeners.get(eventType);
      if (!set) {
        set = new Set();
        listeners.set(eventType, set);
      }
      set.add(listener as EventListener);

      return () => {
        set!.delete(listener as EventListener);
        if (set!.size === 0) {
          listeners.delete(eventType);
        }
      };
    },

    emit<T = unknown>(eventType: string, event: T): void {
      const set = listeners.get(eventType);
      if (!set) return;
      // Snapshot to iterate — safe if listeners unregister during dispatch
      for (const listener of [...set]) {
        listener(event);
      }
    },

    off(eventType: string): void {
      listeners.delete(eventType);
    },

    clear(): void {
      listeners.clear();
    },

    listenerCount(eventType: string): number {
      return listeners.get(eventType)?.size ?? 0;
    },
  };
}

/** Singleton instance for app-wide agent events */
export const agentEventBus = createEventBus();
