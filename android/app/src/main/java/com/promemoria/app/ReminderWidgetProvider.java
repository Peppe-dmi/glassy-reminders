package com.promemoria.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget ULTRA semplice per Samsung OneUI 8
 * Mostra solo il conteggio dei promemoria
 */
public class ReminderWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "ReminderWidget";
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate - widgets: " + appWidgetIds.length);
        
        for (int appWidgetId : appWidgetIds) {
            try {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            } catch (Exception e) {
                Log.e(TAG, "Error updating widget " + appWidgetId, e);
            }
        }
    }
    
    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Conta i promemoria non completati
        int count = countPendingReminders(context);
        
        Log.d(TAG, "Updating widget " + appWidgetId + " with count: " + count);
        
        // Crea RemoteViews
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        
        // Imposta il conteggio
        views.setTextViewText(R.id.widget_count, String.valueOf(count));
        
        // Click apre l'app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 
            appWidgetId, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        
        // Aggiorna widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
        
        Log.d(TAG, "Widget updated successfully");
    }
    
    private int countPendingReminders(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String json = prefs.getString("reminders", "[]");
            JSONArray reminders = new JSONArray(json);
            
            int count = 0;
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                if (!r.optBoolean("isCompleted", false)) {
                    count++;
                }
            }
            return count;
        } catch (Exception e) {
            Log.e(TAG, "Error counting reminders", e);
            return 0;
        }
    }
    
    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "Widget enabled");
    }
    
    @Override
    public void onDisabled(Context context) {
        Log.d(TAG, "Widget disabled");
    }
}
