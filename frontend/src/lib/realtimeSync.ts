import { useEffect, useRef, useState, useCallback } from 'react';

export type RealtimeEntityType = 'college' | 'recruiter' | 'student';

export interface RealtimeMessage<T = any> {
  type: string; // e.g. 'college:updated', 'recruiter:increment'
  entityType: RealtimeEntityType;
  entityId: string;
  data?: Partial<T>;
  field?: string;
  amount?: number;
  timestamp: number;
}

const CHANNEL_NAME = 'cv_realtime_sync';

// Global BroadcastChannel instance
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported or blocked:', e);
  }
}

/**
 * Broadcasts an update or increment event to all open tabs and windows
 */
export function broadcastRealtimeUpdate<T = any>(message: Omit<RealtimeMessage<T>, 'timestamp'>) {
  const fullMessage: RealtimeMessage<T> = {
    ...message,
    timestamp: Date.now(),
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(fullMessage);
    } catch (e) {
      console.warn('Failed to broadcast via BroadcastChannel', e);
    }
  }

  // Also dispatch a DOM CustomEvent for in-page instant listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cv:realtime_sync', { detail: fullMessage }));
  }
}

interface UseRealtimeSyncOptions<T> {
  entityType: RealtimeEntityType;
  entityId?: string | null;
  fetcher?: () => Promise<T | undefined | null>;
  onRemoteUpdate?: (data: Partial<T>, message: RealtimeMessage<T>) => void;
  pollIntervalMs?: number; // default: 6000ms
}

export function useRealtimeSync<T>({
  entityType,
  entityId,
  fetcher,
  onRemoteUpdate,
  pollIntervalMs = 6000,
}: UseRealtimeSyncOptions<T>) {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'idle'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;

  // Handler for incoming messages
  const handleMessage = useCallback((msg: RealtimeMessage<T>) => {
    if (!msg || msg.entityType !== entityType) return;
    if (entityId && msg.entityId && msg.entityId !== entityId) return;

    setLastSyncedAt(new Date());

    if (msg.data && onRemoteUpdateRef.current) {
      onRemoteUpdateRef.current(msg.data, msg);
    } else if (fetcherRef.current) {
      // Re-fetch to get complete latest data
      setSyncStatus('syncing');
      fetcherRef.current()
        .then((res) => {
          if (res && onRemoteUpdateRef.current) {
            onRemoteUpdateRef.current(res as any, msg);
          }
        })
        .finally(() => setSyncStatus('synced'));
    }
  }, [entityType, entityId]);

  useEffect(() => {
    // 1. BroadcastChannel listener
    const onBroadcastMessage = (event: MessageEvent) => {
      handleMessage(event.data);
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }

    // 2. Window CustomEvent listener
    const onCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<RealtimeMessage<T>>;
      if (customEvent.detail) {
        handleMessage(customEvent.detail);
      }
    };
    window.addEventListener('cv:realtime_sync', onCustomEvent);

    // 3. Periodic smart poll when tab is visible
    let timer: NodeJS.Timeout | null = null;
    if (fetcher && pollIntervalMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible' && fetcherRef.current) {
          fetcherRef.current()
            .then((fresh) => {
              if (fresh && onRemoteUpdateRef.current) {
                onRemoteUpdateRef.current(fresh as any, {
                  type: 'poll:fresh',
                  entityType,
                  entityId: entityId || '',
                  timestamp: Date.now(),
                });
              }
              setLastSyncedAt(new Date());
            })
            .catch(() => null);
        }
      }, pollIntervalMs);
    }

    // 4. Focus / visibility change immediate refresh
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fetcherRef.current) {
        fetcherRef.current()
          .then((fresh) => {
            if (fresh && onRemoteUpdateRef.current) {
              onRemoteUpdateRef.current(fresh as any, {
                type: 'focus:fresh',
                entityType,
                entityId: entityId || '',
                timestamp: Date.now(),
              });
            }
            setLastSyncedAt(new Date());
          })
          .catch(() => null);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onVisibilityChange);

    setSyncStatus('synced');

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', onBroadcastMessage);
      }
      window.removeEventListener('cv:realtime_sync', onCustomEvent);
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onVisibilityChange);
    };
  }, [handleMessage, fetcher, pollIntervalMs, entityType, entityId]);

  const notifyChange = useCallback((data?: Partial<T>, actionType = 'updated') => {
    if (!entityId) return;
    setLastSyncedAt(new Date());
    broadcastRealtimeUpdate({
      type: `${entityType}:${actionType}`,
      entityType,
      entityId,
      data,
    });
  }, [entityType, entityId]);

  return {
    syncStatus,
    lastSyncedAt,
    notifyChange,
  };
}

/**
 * Convenience listener for real-time broadcast and DOM sync events
 */
export function onRealtimeUpdate(
  channelOrCallback: string | ((event: any) => void),
  optionalCallback?: (event: any) => void
): () => void {
  const cb = typeof channelOrCallback === 'function' ? channelOrCallback : optionalCallback;
  const channelFilter = typeof channelOrCallback === 'string' ? channelOrCallback : null;

  const handler = (e: any) => {
    const detail = e.detail;
    if (channelFilter && detail?.type && !detail.type.startsWith(channelFilter)) {
      return;
    }
    if (cb) cb(detail || e);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('cv:realtime_sync', handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cv:realtime_sync', handler);
    }
  };
}
