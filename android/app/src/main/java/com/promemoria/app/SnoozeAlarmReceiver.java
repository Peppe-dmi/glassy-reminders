package com.promemoria.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Receiver per mostrare la notifica snoozata dopo 5 minuti
 */
public class SnoozeAlarmReceiver extends BroadcastReceiver {
    
    private static final String TAG = "SnoozeAlarm";
    private static final String CHANNEL_ID = "promemoria-alarm";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String reminderId = intent.getStringExtra(NotificationActionReceiver.EXTRA_REMINDER_ID);
        String title = intent.getStringExtra(NotificationActionReceiver.EXTRA_TITLE);
        String body = intent.getStringExtra(NotificationActionReceiver.EXTRA_BODY);
        int notificationId = intent.getIntExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, 
            getConsistentId(reminderId));
        
        Log.d(TAG, "Snooze alarm triggered for: " + reminderId);
        
        // Verifica se il promemoria esiste ancora
        if (!reminderExists(context, reminderId)) {
            Log.d(TAG, "Reminder no longer exists, skipping notification: " + reminderId);
            return;
        }
        
        Log.d(TAG, "Showing snoozed notification: " + title);
        
        // Crea canale se necessario
        createNotificationChannel(context);
        
        // Usa ID consistente per evitare duplicati
        int consistentId = getConsistentId(reminderId);
        
        // Crea intents per le azioni
        Intent snoozeIntent = new Intent(context, NotificationActionReceiver.class);
        snoozeIntent.setAction(NotificationActionReceiver.ACTION_SNOOZE);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, consistentId);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_REMINDER_ID, reminderId);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_TITLE, title);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_BODY, body);
        PendingIntent snoozePending = PendingIntent.getBroadcast(context, consistentId + 1, 
            snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        Intent completeIntent = new Intent(context, NotificationActionReceiver.class);
        completeIntent.setAction(NotificationActionReceiver.ACTION_COMPLETE);
        completeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, consistentId);
        completeIntent.putExtra(NotificationActionReceiver.EXTRA_REMINDER_ID, reminderId);
        PendingIntent completePending = PendingIntent.getBroadcast(context, consistentId + 2, 
            completeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Intent per aprire l'app quando si tocca la notifica
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("reminderId", reminderId);
        PendingIntent openPending = PendingIntent.getActivity(context, consistentId, 
            openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Costruisci notifica
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle("🔄 " + title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(false)
            .setOngoing(true)
            .setContentIntent(openPending)
            .addAction(0, "✓ Fatto", completePending)
            .addAction(0, "⏰ 5 min", snoozePending);
        
        // Mostra notifica (usando ID consistente sovrascrive la precedente)
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(consistentId, builder.build());
            Log.d(TAG, "Notification shown with id: " + consistentId);
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
    
    /**
     * Genera un ID consistente basato sul reminderId
     */
    private int getConsistentId(String reminderId) {
        if (reminderId == null) return (int) System.currentTimeMillis() % 1000000;
        return Math.abs(reminderId.hashCode()) % 1000000;
    }
    
    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Promemoria",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifiche per i tuoi promemoria");
            channel.enableVibration(true);
            channel.enableLights(true);
            
            NotificationManager notificationManager = 
                context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
