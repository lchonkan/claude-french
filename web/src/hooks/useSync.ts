/**
 * useSync - Cross-platform data sync hook (T135).
 *
 * Strategy: Last-write-wins with a 30-second periodic sync interval.
 * Syncs vocabulary progress and skill mastery data to the server.
 * Uses localStorage as an offline buffer for changes made while
 * the network is unavailable.
 *
 * Usage:
 *   const { syncNow, isSyncing, lastSyncAt, pendingCount } = useSync();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncItem {
  id: string;
  type: "vocabulary_progress" | "skill_mastery";
  payload: Record<string, unknown>;
  timestamp: number;
}

interface SyncState {
  /** Trigger an immediate sync. */
  syncNow: () => Promise<void>;
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
  /** ISO timestamp of the last successful sync, or null. */
  lastSyncAt: string | null;
  /** Number of items waiting to be synced. */
  pendingCount: number;
  /** Queue an item for the next sync cycle. */
  enqueue: (item: Omit<SyncItem, "timestamp">) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const STORAGE_KEY = "french_learning_sync_queue";
const LAST_SYNC_KEY = "french_learning_last_sync";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadQueue(): SyncItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncItem[];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable -- silently drop
  }
}

function loadLastSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

function saveLastSync(timestamp: string): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  } catch {
    // Ignore
  }
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

/**
 * Deduplicate queued items using last-write-wins strategy.
 * For items with the same id+type, keep only the most recent.
 */
function deduplicateQueue(queue: SyncItem[]): SyncItem[] {
  const map = new Map<string, SyncItem>();
  for (const item of queue) {
    const key = `${item.type}:${item.id}`;
    const existing = map.get(key);
    if (!existing || item.timestamp > existing.timestamp) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

/**
 * Send a batch of sync items to the server.
 * Returns the list of items that failed to sync.
 */
async function syncBatch(items: SyncItem[]): Promise<SyncItem[]> {
  const failed: SyncItem[] = [];

  // Group by type for batch endpoints
  const vocabItems = items.filter((i) => i.type === "vocabulary_progress");
  const masteryItems = items.filter((i) => i.type === "skill_mastery");

  // Sync vocabulary progress
  if (vocabItems.length > 0) {
    try {
      await apiClient("/progress/sync/vocabulary", {
        method: "POST",
        body: JSON.stringify({
          items: vocabItems.map((i) => ({
            id: i.id,
            ...i.payload,
            synced_at: new Date(i.timestamp).toISOString(),
          })),
        }),
      });
    } catch {
      // If batch fails, try individually
      for (const item of vocabItems) {
        try {
          await apiClient("/progress/sync/vocabulary", {
            method: "POST",
            body: JSON.stringify({
              items: [
                {
                  id: item.id,
                  ...item.payload,
                  synced_at: new Date(item.timestamp).toISOString(),
                },
              ],
            }),
          });
        } catch {
          failed.push(item);
        }
      }
    }
  }

  // Sync skill mastery
  if (masteryItems.length > 0) {
    try {
      await apiClient("/progress/sync/mastery", {
        method: "POST",
        body: JSON.stringify({
          items: masteryItems.map((i) => ({
            id: i.id,
            ...i.payload,
            synced_at: new Date(i.timestamp).toISOString(),
          })),
        }),
      });
    } catch {
      // If batch fails, try individually
      for (const item of masteryItems) {
        try {
          await apiClient("/progress/sync/mastery", {
            method: "POST",
            body: JSON.stringify({
              items: [
                {
                  id: item.id,
                  ...item.payload,
                  synced_at: new Date(item.timestamp).toISOString(),
                },
              ],
            }),
          });
        } catch {
          failed.push(item);
        }
      }
    }
  }

  return failed;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSync(): SyncState {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(loadLastSync);
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);

  // Use ref to avoid stale closure in interval callback
  const queueRef = useRef<SyncItem[]>(loadQueue());

  // Keep pendingCount in sync with the queue ref
  const updatePending = useCallback(() => {
    setPendingCount(queueRef.current.length);
  }, []);

  /**
   * Enqueue an item for the next sync cycle.
   */
  const enqueue = useCallback(
    (item: Omit<SyncItem, "timestamp">) => {
      const syncItem: SyncItem = {
        ...item,
        timestamp: Date.now(),
      };
      queueRef.current = deduplicateQueue([
        ...queueRef.current,
        syncItem,
      ]);
      saveQueue(queueRef.current);
      updatePending();
    },
    [updatePending],
  );

  /**
   * Execute a sync cycle: send all queued items to the server.
   */
  const syncNow = useCallback(async () => {
    const queue = queueRef.current;
    if (queue.length === 0 || isSyncing) return;

    setIsSyncing(true);

    try {
      const deduplicated = deduplicateQueue(queue);
      const failed = await syncBatch(deduplicated);

      // Update queue with only failed items
      queueRef.current = failed;
      saveQueue(failed);
      updatePending();

      // Update last sync timestamp
      if (failed.length < deduplicated.length) {
        const now = new Date().toISOString();
        setLastSyncAt(now);
        saveLastSync(now);
      }
    } catch {
      // Network error -- keep everything in queue for next cycle
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePending]);

  // Periodic sync interval (30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (queueRef.current.length > 0) {
        syncNow();
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [syncNow]);

  // Sync on page visibility change (when user comes back to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        queueRef.current.length > 0
      ) {
        syncNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncNow]);

  // Sync before page unload (best effort)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (queueRef.current.length > 0) {
        // Use sendBeacon for reliable delivery on page close
        const queue = deduplicateQueue(queueRef.current);
        const apiBase =
          import.meta.env.VITE_API_URL ?? "http://localhost:8000";

        try {
          navigator.sendBeacon(
            `${apiBase}/api/v1/progress/sync/batch`,
            JSON.stringify({ items: queue }),
          );
        } catch {
          // Best effort -- data stays in localStorage for next session
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Load persisted queue on mount
  useEffect(() => {
    const persisted = loadQueue();
    if (persisted.length > 0) {
      queueRef.current = deduplicateQueue(persisted);
      updatePending();
      // Auto-sync on mount if there are pending items
      syncNow();
    }
  }, [syncNow, updatePending]);

  return {
    syncNow,
    isSyncing,
    lastSyncAt,
    pendingCount,
    enqueue,
  };
}
