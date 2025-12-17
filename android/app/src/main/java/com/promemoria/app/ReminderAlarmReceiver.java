package com.promemoria.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receiver per mostrare la notifica quando scatta l'alarm
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
        
        // Mostra la notifica con i pulsanti nativi
        NotificationHelper.showReminderNotification(
            context,
            notificationId,
            reminderId != null ? reminderId : "",
            title != null ? title : "Promemoria",
            body != null ? body : ""
        );
    }
}

