package com.promemoria.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Helper per creare notifiche con pulsanti che NON aprono l'app
 */
public class NotificationHelper {
    
    private static final String TAG = "NotificationHelper";
    private static final String CHANNEL_ID = "promemoria-alarm";
    
    /**
     * Mostra una notifica con i pulsanti "Fatto" e "5 min"
     * I pulsanti NON aprono l'app, gestiscono l'azione in background
     */
    public static void showReminderNotification(
            Context context, 
            int notificationId,
            String reminderId,
            String title, 
            String body) {
        
        Log.d(TAG, "Showing reminder notification: " + title);
        
        // Crea canale se necessario
        createNotificationChannel(context);
        
        // Intent per il pulsante SNOOZE (NON apre l'app)
        Intent snoozeIntent = new Intent(context, NotificationActionReceiver.class);
        snoozeIntent.setAction(NotificationActionReceiver.ACTION_SNOOZE);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, notificationId);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_REMINDER_ID, reminderId);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_TITLE, title);
        snoozeIntent.putExtra(NotificationActionReceiver.EXTRA_BODY, body);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
            context, 
            notificationId + 1, 
            snoozeIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Intent per il pulsante COMPLETA (NON apre l'app)
        Intent completeIntent = new Intent(context, NotificationActionReceiver.class);
        completeIntent.setAction(NotificationActionReceiver.ACTION_COMPLETE);
        completeIntent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, notificationId);
        completeIntent.putExtra(NotificationActionReceiver.EXTRA_REMINDER_ID, reminderId);
        PendingIntent completePending = PendingIntent.getBroadcast(
            context, 
            notificationId + 2, 
            completeIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Intent per aprire l'app (solo quando si tocca la notifica stessa)
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("reminderId", reminderId);
        PendingIntent openPending = PendingIntent.getActivity(
            context, 
            notificationId, 
            openIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // Costruisci la notifica
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle("⏰ " + title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(false)
            .setOngoing(true) // Non dismissibile con swipe
            .setContentIntent(openPending) // Tap sulla notifica = apri app
            .addAction(0, "✓ Fatto", completePending) // NON apre l'app
            .addAction(0, "⏰ 5 min", snoozePending); // NON apre l'app
        
        // Mostra la notifica
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Notification shown with id: " + notificationId);
        }
    }
    
    /**
     * Cancella una notifica
     */
    public static void cancelNotification(Context context, int notificationId) {
        NotificationManager notificationManager = 
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(notificationId);
        }
    }
    
    private static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Promemoria",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifiche per i tuoi promemoria");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLightColor(0xFF667eea);
            
            NotificationManager notificationManager = 
                context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}

