import PocketBase from 'pocketbase';

// Singleton instance for PocketBase to avoid creating multiple instances
const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);

// Disable auto cancellation to prevent request cancellation issues in React/Next.js
pb.autoCancellation(false);
