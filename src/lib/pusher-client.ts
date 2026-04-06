import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

/**
 * Returns a singleton Pusher client instance.
 * Lazily initialized on first call.
 */
export function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        channelAuthorization: {
          endpoint: '/api/pusher/auth',
          transport: 'ajax',
        },
      }
    );
  }

  return pusherInstance;
}
