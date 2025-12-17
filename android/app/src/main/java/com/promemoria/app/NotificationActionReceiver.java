package com.promemoria.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

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
        
        Log.d(TAG, "Action received: " + action + ", notificationId: " + notificationId + ", reminderId: " + reminderId);
        
        // Cancella la notifica corrente
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null && notificationId != -1) {
            notificationManager.cancel(notificationId);
            Log.d(TAG, "Notification cancelled: " + notificationId);
        }
        
        // Cancella eventuali alarm pendenti per questo reminder
        cancelPendingAlarms(context, reminderId);
        
        if (ACTION_SNOOZE.equals(action)) {
            // Verifica se il promemoria esiste ancora
            if (!reminderExists(context, reminderId)) {
                Log.d(TAG, "Reminder no longer exists, skipping snooze: " + reminderId);
                return;
            }
            
            Log.d(TAG, "Snoozing notification for 5 minutes");
            scheduleSnoozeNotification(context, reminderId, title, body);
        } else if (ACTION_COMPLETE.equals(action)) {
            Log.d(TAG, "Notification marked as complete");
            // La notifica è già cancellata, non fare altro
        }
    }
    
    /**
     * Cancella eventuali alarm pendenti per questo reminder
     */
    private void cancelPendingAlarms(Context context, String reminderId) {
        if (reminderId == null) return;
        
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        
        // Usa un ID consistente basato sul reminderId
        int requestCode = getConsistentId(reminderId);
        
        Intent intent = new Intent(context, SnoozeAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
            Log.d(TAG, "Cancelled pending alarm for: " + reminderId);
        }
    }
    
    /**
     * Verifica se il promemoria esiste ancora nel localStorage
     */
    private boolean reminderExists(Context context, String reminderId) {
        if (reminderId == null || reminderId.isEmpty() || reminderId.startsWith("test-")) {
            return true; // Permetti test notifications
        }
        
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String remindersJson = prefs.getString("reminders", "[]");
            JSONArray reminders = new JSONArray(remindersJson);
            
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                if (reminderId.equals(r.optString("id", ""))) {
                    // Controlla anche che non sia completato
                    return !r.optBoolean("isCompleted", false);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking reminder existence", e);
            return true; // In caso di errore, permetti la notifica
        }
        
        return false;
    }
    
    private void scheduleSnoozeNotification(Context context, String reminderId, String title, String body) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        
        // Usa ID consistente per evitare duplicati
        int notificationId = getConsistentId(reminderId);
        int requestCode = notificationId; // Stesso ID per sovrascrivere
        
        // Crea intent per la notifica snoozata
        Intent notifyIntent = new Intent(context, SnoozeAlarmReceiver.class);
        notifyIntent.putExtra(EXTRA_REMINDER_ID, reminderId);
        notifyIntent.putExtra(EXTRA_TITLE, cleanTitle(title));
        notifyIntent.putExtra(EXTRA_BODY, body != null ? body : "");
        notifyIntent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        
        // FLAG_UPDATE_CURRENT per sovrascrivere alarm esistenti
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            notifyIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // 5 minuti da ora
        long triggerTime = System.currentTimeMillis() + (5 * 60 * 1000);
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                );
            }
            Log.d(TAG, "Snooze alarm set for 5 minutes, id: " + notificationId);
        } catch (Exception e) {
            Log.e(TAG, "Error setting snooze alarm", e);
        }
    }
    
    /**
     * Genera un ID consistente basato sul reminderId
     */
    private int getConsistentId(String reminderId) {
        if (reminderId == null) return (int) System.currentTimeMillis() % 1000000;
        return Math.abs(reminderId.hashCode()) % 1000000;
    }
    
    /**
     * Rimuove emoji dal titolo per evitare accumulo
     */
    private String cleanTitle(String title) {
        if (title == null) return "Promemoria";
        return title.replace("⏰ ", "").replace("🔄 ", "");
    }
}
