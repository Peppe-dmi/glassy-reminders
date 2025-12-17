package com.promemoria.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;

/**
 * Widget 2x3 stile Samsung Glass
 * Mostra fino a 3 promemoria prossimi con design moderno
 */
public class ReminderWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "ReminderWidget";
    public static final String ACTION_REFRESH = "com.promemoria.app.WIDGET_REFRESH";
    
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
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, ReminderWidgetProvider.class));
            onUpdate(context, manager, ids);
        }
    }
    
    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Leggi i promemoria
        List<ReminderData> reminders = getUpcomingReminders(context);
        int totalCount = getTotalPendingCount(context);
        
        Log.d(TAG, "Updating widget with " + reminders.size() + " reminders, total: " + totalCount);
        
        // Crea RemoteViews
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        
        // Imposta il conteggio totale
        views.setTextViewText(R.id.widget_count, String.valueOf(totalCount));
        
        // Sottotitolo con data
        String today = new SimpleDateFormat("EEEE d MMMM", Locale.getDefault()).format(new Date());
        views.setTextViewText(R.id.widget_subtitle, today);
        
        // Nascondi tutti gli item
        views.setViewVisibility(R.id.widget_item_1, View.GONE);
        views.setViewVisibility(R.id.widget_item_2, View.GONE);
        views.setViewVisibility(R.id.widget_item_3, View.GONE);
        
        if (reminders.isEmpty()) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_empty, View.GONE);
            
            // Popola fino a 3 promemoria
            int[] itemIds = {R.id.widget_item_1, R.id.widget_item_2, R.id.widget_item_3};
            int[] titleIds = {R.id.widget_title_1, R.id.widget_title_2, R.id.widget_title_3};
            int[] timeIds = {R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3};
            int[] iconIds = {R.id.widget_icon_1, R.id.widget_icon_2, R.id.widget_icon_3};
            int[] priorityIds = {R.id.widget_priority_1, R.id.widget_priority_2, R.id.widget_priority_3};
            
            for (int i = 0; i < Math.min(reminders.size(), 3); i++) {
                ReminderData r = reminders.get(i);
                
                views.setViewVisibility(itemIds[i], View.VISIBLE);
                views.setTextViewText(titleIds[i], r.title);
                views.setTextViewText(timeIds[i], r.displayTime);
                views.setTextViewText(iconIds[i], r.categoryIcon);
                
                // Colore priorità
                int priorityColor;
                switch (r.priority) {
                    case "high":
                        priorityColor = Color.parseColor("#ef4444");
                        break;
                    case "low":
                        priorityColor = Color.parseColor("#22c55e");
                        break;
                    default:
                        priorityColor = Color.parseColor("#667eea");
                        break;
                }
                views.setInt(priorityIds[i], "setBackgroundColor", priorityColor);
            }
        }
        
        // Click su widget apre l'app
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent mainPending = PendingIntent.getActivity(context, appWidgetId, mainIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, mainPending);
        
        // Click su "Aggiungi"
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.putExtra("action", "add_reminder");
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addPending = PendingIntent.getActivity(context, appWidgetId + 1000, addIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_add_button, addPending);
        
        // Aggiorna il widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
        
        Log.d(TAG, "Widget updated successfully");
    }
    
    private int getTotalPendingCount(Context context) {
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
    
    private List<ReminderData> getUpcomingReminders(Context context) {
        List<ReminderData> items = new ArrayList<>();
        
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String remindersJson = prefs.getString("reminders", "[]");
            String categoriesJson = prefs.getString("categories", "[]");
            
            JSONArray categories = new JSONArray(categoriesJson);
            JSONArray reminders = new JSONArray(remindersJson);
            
            // Mappa icone categorie
            HashMap<String, String> categoryIcons = new HashMap<>();
            for (int i = 0; i < categories.length(); i++) {
                JSONObject cat = categories.getJSONObject(i);
                categoryIcons.put(cat.getString("id"), cat.optString("icon", "📝"));
            }
            
            // Date di riferimento
            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);
            
            Calendar tomorrow = (Calendar) today.clone();
            tomorrow.add(Calendar.DAY_OF_YEAR, 1);
            
            Calendar weekEnd = (Calendar) today.clone();
            weekEnd.add(Calendar.DAY_OF_YEAR, 7);
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                
                if (r.optBoolean("isCompleted", false)) continue;
                
                String dateStr = r.optString("date", "");
                if (dateStr.isEmpty()) continue;
                
                Date reminderDate;
                try {
                    reminderDate = sdf.parse(dateStr);
                } catch (Exception e) {
                    continue;
                }
                
                if (reminderDate == null) continue;
                if (reminderDate.after(weekEnd.getTime())) continue;
                if (reminderDate.before(today.getTime())) continue;
                
                ReminderData item = new ReminderData();
                item.id = r.optString("id", "");
                item.title = r.optString("title", "");
                item.time = r.optString("time", "");
                item.date = dateStr;
                item.priority = r.optString("priority", "medium");
                
                String catId = r.optString("categoryId", "");
                String icon = categoryIcons.get(catId);
                item.categoryIcon = icon != null ? icon : "📝";
                
                // Formatta data/ora display
                String displayDate;
                if (reminderDate.before(tomorrow.getTime())) {
                    displayDate = "Oggi";
                } else if (reminderDate.before(new Date(tomorrow.getTimeInMillis() + 86400000))) {
                    displayDate = "Domani";
                } else {
                    displayDate = new SimpleDateFormat("EEE d", Locale.getDefault()).format(reminderDate);
                }
                
                if (item.time != null && !item.time.isEmpty()) {
                    item.displayTime = displayDate + " • " + item.time;
                } else {
                    item.displayTime = displayDate;
                }
                
                items.add(item);
            }
            
            // Ordina per data e ora
            items.sort((a, b) -> {
                int dateCompare = a.date.compareTo(b.date);
                if (dateCompare != 0) return dateCompare;
                return a.time.compareTo(b.time);
            });
            
        } catch (Exception e) {
            Log.e(TAG, "Error reading reminders", e);
        }
        
        return items;
    }
    
    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "Widget enabled");
    }
    
    @Override
    public void onDisabled(Context context) {
        Log.d(TAG, "Widget disabled");
    }
    
    // Classe dati semplice
    private static class ReminderData {
        String id;
        String title;
        String time;
        String date;
        String displayTime;
        String priority;
        String categoryIcon;
    }
}
