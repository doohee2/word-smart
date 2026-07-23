import { useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/db";
import { useNetworkStatus } from "./useNetworkStatus";

export function useDataSync() {
  const { data: session } = useSession();
  const isOnline = useNetworkStatus();

  const syncHistory = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      // 1. Fetch keys (id, created_at, type) for the current month as a default sync
      const currentMonthStr = new Date().toISOString().slice(0, 7);
      const res = await fetch(`/api/history?month=${currentMonthStr}&keysOnly=true`);
      const data = await res.json();
      
      if (data.history && data.history.length > 0) {
        const localItems = await db.history.toArray();
        const localKeys = new Set(localItems.map(h => `${new Date(h.createdAt).getTime()}_${h.type}`));
        
        const missingIds = data.history.filter((h: any) => {
          const key = `${new Date(h.created_at).getTime()}_${h.type}`;
          return !localKeys.has(key);
        }).map((h: any) => h.id);

        if (missingIds.length > 0) {
          const fetchRes = await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'fetch', ids: missingIds })
          });
          const fetchData = await fetchRes.json();
          
          if (fetchData.history && fetchData.history.length > 0) {
            const newRecords = fetchData.history.map((h: any) => ({
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
      console.error("Background sync error (history):", error);
    }
  }, [session?.user?.email]);

  const syncWordLists = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch('/api/db/list');
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
      console.error("Background sync error (lists):", error);
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
