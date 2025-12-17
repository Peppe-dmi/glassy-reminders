package com.promemoria.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Calendar;

/**
 * Receiver per gestire le azioni delle notifiche SENZA aprire l'app
 */
public class NotificationActionReceiver extends BroadcastReceiver {
    
    private static final String TAG = "NotificationAction";
    public static final String ACTION_SNOOZE = "com.promemoria.app.ACTION_SNOOZE";
    public static final String ACTION_COMPLETE = "com.promemoria.app.ACTION_COMPLETE";
    public static final String EXTRA_NOTIFICATION_ID = "notification_id";
    public static final String EXTRA_REMINDER_ID = "reminder_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1);
        String reminderId = intent.getStringExtra(EXTRA_REMINDER_ID);
        String title = intent.getStringExtra(EXTRA_TITLE);
        String body = intent.getStringExtra(EXTRA_BODY);
        
        Log.d(TAG, "Action received: " + action + ", notificationId: " + notificationId);
        
        // Cancella la notifica corrente
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null && notificationId != -1) {
            notificationManager.cancel(notificationId);
        }
        
        if (ACTION_SNOOZE.equals(action)) {
            // Rimanda di 5 minuti
            Log.d(TAG, "Snoozing notification for 5 minutes");
            scheduleSnoozeNotification(context, reminderId, title, body);
        } else if (ACTION_COMPLETE.equals(action)) {
            // Completato - la notifica è già cancellata
            Log.d(TAG, "Notification marked as complete");
        }
    }
    
    private void scheduleSnoozeNotification(Context context, String reminderId, String title, String body) {
        // Programma una nuova notifica per 5 minuti dopo usando AlarmManager
        android.app.AlarmManager alarmManager = 
            (android.app.AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        if (alarmManager == null) return;
        
        // Crea intent per la notifica snoozata
        Intent notifyIntent = new Intent(context, SnoozeAlarmReceiver.class);
        notifyIntent.putExtra(EXTRA_REMINDER_ID, reminderId);
        notifyIntent.putExtra(EXTRA_TITLE, title != null ? title.replace("⏰ ", "").replace("🔄 ", "") : "Promemoria");
        notifyIntent.putExtra(EXTRA_BODY, body != null ? body : "");
        notifyIntent.putExtra(EXTRA_NOTIFICATION_ID, Math.abs((reminderId + System.currentTimeMillis()).hashCode()) % 1000000);
        
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getBroadcast(
            context,
            (int) System.currentTimeMillis(),
            notifyIntent,
            android.app.PendingIntent.FLAG_ONE_SHOT | android.app.PendingIntent.FLAG_IMMUTABLE
        );
        
        // 5 minuti da ora
        long triggerTime = System.currentTimeMillis() + (5 * 60 * 1000);
        
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    android.app.AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    android.app.AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            }
            Log.d(TAG, "Snooze alarm set for 5 minutes");
        } catch (Exception e) {
            Log.e(TAG, "Error setting snooze alarm", e);
        }
    }
}

