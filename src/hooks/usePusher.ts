'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Channel } from 'pusher-js';
import { getPusherClient } from '@/lib/pusher-client';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Subscribes to the public auction channel and exposes helpers
 * to bind / unbind event handlers.  Cleans up on unmount or
 * when auctionId changes.
 */
export function usePusherChannel(auctionId: string) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected');
  const channelRef = useRef<Channel | null>(null);

  useEffect(() => {
    const client = getPusherClient();
    const channelName = `auction-${auctionId}`;
    const channel = client.subscribe(channelName);
    channelRef.current = channel;

    // ── Connection-state tracking ──────────────────────────
    const handleConnected = () => setConnectionState('connected');
    const handleDisconnected = () => setConnectionState('disconnected');
    const handleReconnecting = () => setConnectionState('reconnecting');

    client.connection.bind('connected', handleConnected);
    client.connection.bind('disconnected', handleDisconnected);
    client.connection.bind('connecting', handleReconnecting);

    // Set initial state
    const currentState = client.connection.state;
    if (currentState === 'connected') {
      setConnectionState('connected');
    } else if (currentState === 'connecting') {
      setConnectionState('reconnecting');
    } else {
      setConnectionState('disconnected');
    }

    return () => {
      client.unsubscribe(channelName);
      client.connection.unbind('connected', handleConnected);
      client.connection.unbind('disconnected', handleDisconnected);
      client.connection.unbind('connecting', handleReconnecting);
      channelRef.current = null;
    };
  }, [auctionId]);

  /** Bind a callback to a Pusher event on this channel. */
  const bind = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, callback: (data: any) => void) => {
      channelRef.current?.bind(event, callback);
    },
    []
  );

  /** Unbind a previously-bound callback. */
  const unbind = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, callback?: (data: any) => void) => {
      channelRef.current?.unbind(event, callback);
    },
    []
  );

  return { bind, unbind, connectionState };
}
