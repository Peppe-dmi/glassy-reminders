package com.promemoria.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * Receiver per avviare l'AlarmService quando scatta l'alarm
 */
public class ReminderAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "ReminderAlarm";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        int notificationId = intent.getIntExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, 0);
        String reminderId = intent.getStringExtra(NotificationActionReceiver.EXTRA_REMINDER_ID);
        String title = intent.getStringExtra(NotificationActionReceiver.EXTRA_TITLE);
        String body = intent.getStringExtra(NotificationActionReceiver.EXTRA_BODY);
        
        Log.d(TAG, "Alarm triggered for: " + title);
        
        // Leggi se alarmMode è attivo
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String settingsJson = prefs.getString("notification-settings", "{}");
        boolean alarmMode = settingsJson.contains("\"alarmMode\":true");
        
        if (alarmMode) {
            // Avvia il servizio sveglia con suono in loop
            Intent serviceIntent = new Intent(context, AlarmService.class);
            serviceIntent.setAction(AlarmService.ACTION_START);
            serviceIntent.putExtra(AlarmService.EXTRA_NOTIFICATION_ID, notificationId);
            serviceIntent.putExtra(AlarmService.EXTRA_REMINDER_ID, reminderId);
            serviceIntent.putExtra(AlarmService.EXTRA_TITLE, title != null ? title : "Promemoria");
            serviceIntent.putExtra(AlarmService.EXTRA_BODY, body != null ? body : "");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } else {
            // Notifica semplice
            NotificationHelper.showReminderNotification(
                context,
                notificationId,
                reminderId != null ? reminderId : "",
                title != null ? title : "Promemoria",
                body != null ? body : ""
            );
        }
    }
}

