package com.promemoria.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin Capacitor per notifiche native con pulsanti che NON aprono l'app
 */
@CapacitorPlugin(name = "NativeNotification")
public class NativeNotificationPlugin extends Plugin {
    
    private static final String TAG = "NativeNotificationPlugin";
    
    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id", "");
        String title = call.getString("title", "Promemoria");
        String body = call.getString("body", "");
        long timestamp = call.getLong("timestamp", 0L);
        
        if (id.isEmpty() || timestamp == 0) {
            call.reject("ID e timestamp sono richiesti");
            return;
        }
        
        int notificationId = Math.abs(id.hashCode()) % 1000000;
        
        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        
        if (alarmManager == null) {
            call.reject("AlarmManager non disponibile");
            return;
        }
        
        // Crea intent per mostrare la notifica
        Intent intent = new Intent(context, ReminderAlarmReceiver.class);
        intent.putExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID, notificationId);
        intent.putExtra(NotificationActionReceiver.EXTRA_REMINDER_ID, id);
        intent.putExtra(NotificationActionReceiver.EXTRA_TITLE, title);
        intent.putExtra(NotificationActionReceiver.EXTRA_BODY, body);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    timestamp,
                    pendingIntent
                );
            } else {
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    timestamp,
                    pendingIntent
                );
            }
            
            Log.d(TAG, "Notification scheduled: " + title + " at " + timestamp);
            
            JSObject result = new JSObject();
            result.put("id", notificationId);
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling notification", e);
            call.reject("Errore scheduling notifica: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id", "");
        
        if (id.isEmpty()) {
            call.reject("ID richiesto");
            return;
        }
        
        int notificationId = Math.abs(id.hashCode()) % 1000000;
        
        Context context = getContext();
        
        // Cancella l'alarm
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            Intent intent = new Intent(context, ReminderAlarmReceiver.class);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                notificationId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(pendingIntent);
        }
        
        // Cancella la notifica se già mostrata
        NotificationHelper.cancelNotification(context, notificationId);
        
        Log.d(TAG, "Notification cancelled: " + id);
        call.resolve();
    }
    
    @PluginMethod
    public void test(PluginCall call) {
        // Mostra notifica subito per test
        Context context = getContext();
        int notificationId = (int) System.currentTimeMillis() % 1000000;
        
        NotificationHelper.showReminderNotification(
            context,
            notificationId,
            "test-" + System.currentTimeMillis(),
            "Test Promemoria",
            "I pulsanti NON aprono l'app!"
        );
        
        JSObject result = new JSObject();
        result.put("id", notificationId);
        call.resolve(result);
    }
}

