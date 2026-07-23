import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/db";
import { useNetworkStatus } from "./useNetworkStatus";

export function useDataSync() {
  const { data: session } = useSession();
  const isOnline = useNetworkStatus();

  const syncHistory = useCallback(async () => {
    if (!session?.user?.email || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    try {
      // 1. Fetch keys (id, created_at, type) for the current month as a default sync
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const res = await fetch(`/api/history?month=${currentMonthStr}&keysOnly=true`, {
        signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.history) {
        const localItems = await db.history.toArray();
        const localKeysMap = new Map(localItems.map(h => [
          `${new Date(h.createdAt).getTime()}_${h.type}`,
          h
        ]));
        
        const missingIds: any[] = [];
        
        // 1. Downstream: sync deletions, update legacy records with serverId, and find missing
        for (const h of data.history) {
          let localItem = localItems.find(item => item.serverId === h.id);
          
          if (!localItem) {
             // Fallback to legacy composite key matching
             localItem = localKeysMap.get(`${new Date(h.created_at).getTime()}_${h.type}`);
             if (localItem && !localItem.serverId) {
               await db.history.update(localItem.id!, { serverId: h.id, isSynced: true });
             }
          }
          
          if (localItem) {
            if (h.is_deleted && !localItem.isDeleted) {
               await db.history.update(localItem.id!, { isDeleted: true, deletedAt: new Date() });
            }
          } else if (!h.is_deleted) {
            missingIds.push(h.id);
          }
        }

        // 2. Upstream: Push new offline records
        const offlineRecords = localItems.filter(h => !h.isSynced && !h.isDeleted && !h.serverId);
        if (offlineRecords.length > 0) {
          const syncRes = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync_offline', records: offlineRecords }),
            signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
          });
          if (!syncRes.ok) return;
          const syncData = await syncRes.json();
          if (syncData.success && syncData.history) {
            for (const serverRow of syncData.history) {
               const match = offlineRecords.find(r => new Date(r.createdAt).toISOString() === serverRow.created_at);
               if (match) {
                 await db.history.update(match.id!, { serverId: serverRow.id, isSynced: true });
               }
            }
          }
        }

        // 3. Upstream: Push local deletions (using serverId)
        const localDeletions = localItems.filter(h => h.isDeleted && !h.isSynced && h.serverId);
        if (localDeletions.length > 0) {
          const keys = localDeletions.map(h => h.serverId!);
          const delRes = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', keys }),
            signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
          });
          if (delRes.ok) {
            for (const h of localDeletions) {
              if (h.id) await db.history.update(h.id, { isSynced: true });
            }
          }
        }

        // 4. Fetch full records for missing IDs
        if (missingIds.length > 0) {
          const fetchRes = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'fetch', ids: missingIds }),
            signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
          });
          if (!fetchRes.ok) return;
          const fetchData = await fetchRes.json();
          
          if (fetchData.history && fetchData.history.length > 0) {
            const newRecords = fetchData.history.map((h: any) => ({
              serverId: h.id,
              userEmail: h.user_email,
              createdAt: new Date(h.created_at),
              type: h.type,
              totalCount: h.total_count,
              completedCount: h.completed_count,
              incompleteWords: h.incomplete_words,
              completeWords: h.complete_words,
              isSynced: true
            }));

            await db.history.bulkAdd(newRecords);
          }
        }
      }
    } catch (error) {
      // Silently ignore network or timeout errors in background sync
      // console.error("Background sync error (history):", error);
    }
  }, [session?.user?.email]);

  const syncWordLists = useCallback(async () => {
    if (!session?.user?.email || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    try {
      const res = await fetch('/api/db/list', {
        signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(5000) : undefined
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.lists && data.lists.length > 0) {
        // Find if we have these lists locally. If not, maybe we don't force download them 
        // to save bandwidth, unless they are already downloaded and we just update metadata.
        const localLists = await db.wordLists.toArray();
        const localTitles = new Set(localLists.map(l => l.title));
        
        // As a simple SWR example, we could update the 'count' or 'createdAt' if they match title.
        for (const remoteList of data.lists) {
          if (localTitles.has(remoteList.title)) {
            const localList = localLists.find(l => l.title === remoteList.title);
            if (localList) {
              // Update metadata silently if needed
              // await db.wordLists.update(localList.id!, { ... });
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore network or timeout errors
      // console.error("Background sync error (lists):", error);
    }
  }, [session?.user?.email]);

  const triggerSync = useCallback(() => {
    if (!isOnline) return;
    syncHistory();
    syncWordLists();
  }, [isOnline, syncHistory, syncWordLists]);

  // Initial mount or online state recovery sync
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline, triggerSync]);

  return { triggerSync };
}
