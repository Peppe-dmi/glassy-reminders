import { registerPlugin } from '@capacitor/core';

interface NativeNotificationPlugin {
  schedule(options: {
    id: string;
    title: string;
    body: string;
    timestamp: number;
  }): Promise<{ id: number }>;
  
  cancel(options: { id: string }): Promise<void>;
  
  test(): Promise<{ id: number }>;
}

const NativeNotification = registerPlugin<NativeNotificationPlugin>('NativeNotification');

export { NativeNotification };

