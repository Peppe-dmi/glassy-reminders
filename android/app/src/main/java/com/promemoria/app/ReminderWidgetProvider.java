package com.promemoria.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ReminderWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "ReminderWidget";
    public static final String ACTION_REFRESH = "com.promemoria.app.WIDGET_REFRESH";
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new ComponentName(context, ReminderWidgetProvider.class)
            );
            onUpdate(context, manager, ids);
        }
    }
    
    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, 
            int appWidgetId, Bundle newOptions) {
        updateWidget(context, appWidgetManager, appWidgetId);
    }
    
    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
        
        // Get widget size
        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);
        
        // Get reminders data
        List<ReminderItem> reminders = getReminders(context);
        int pendingCount = 0;
        for (ReminderItem r : reminders) {
            if (!r.isCompleted) pendingCount++;
        }
        
        // Update count badge
        views.setTextViewText(R.id.widget_count, String.valueOf(pendingCount));
        
        // Show empty state or list based on data
        if (pendingCount == 0) {
            views.setViewVisibility(R.id.widget_list, android.view.View.GONE);
            views.setViewVisibility(R.id.widget_empty, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_list, android.view.View.VISIBLE);
            views.setViewVisibility(R.id.widget_empty, android.view.View.GONE);
            
            // Setup list adapter
            Intent intent = new Intent(context, ReminderWidgetService.class);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            intent.setData(Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.widget_list, intent);
        }
        
        // Click on widget opens app
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent mainPending = PendingIntent.getActivity(context, 0, mainIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, mainPending);
        
        // Add button opens app
        Intent addIntent = new Intent(context, MainActivity.class);
        addIntent.putExtra("action", "add_reminder");
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addPending = PendingIntent.getActivity(context, 1, addIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_add_button, addPending);
        
        // List item click template
        Intent listClickIntent = new Intent(context, MainActivity.class);
        PendingIntent listClickPending = PendingIntent.getActivity(context, 2, listClickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setPendingIntentTemplate(R.id.widget_list, listClickPending);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_list);
    }
    
    // Read reminders from SharedPreferences (synced from web app via Capacitor Preferences)
    public static List<ReminderItem> getReminders(Context context) {
        List<ReminderItem> items = new ArrayList<>();
        
        try {
            // Capacitor Preferences usa questo nome per SharedPreferences
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String remindersJson = prefs.getString("reminders", "[]");
            String categoriesJson = prefs.getString("categories", "[]");
            
            JSONArray categories = new JSONArray(categoriesJson);
            JSONArray reminders = new JSONArray(remindersJson);
            
            // Build category icon map
            java.util.HashMap<String, String> categoryIcons = new java.util.HashMap<>();
            for (int i = 0; i < categories.length(); i++) {
                JSONObject cat = categories.getJSONObject(i);
                categoryIcons.put(cat.getString("id"), cat.optString("icon", "📝"));
            }
            
            // Get today's date for filtering
            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            today.set(Calendar.MILLISECOND, 0);
            
            Calendar tomorrow = (Calendar) today.clone();
            tomorrow.add(Calendar.DAY_OF_YEAR, 1);
            
            Calendar weekEnd = (Calendar) today.clone();
            weekEnd.add(Calendar.DAY_OF_YEAR, 7);
            
            for (int i = 0; i < reminders.length(); i++) {
                JSONObject r = reminders.getJSONObject(i);
                
                boolean isCompleted = r.optBoolean("isCompleted", false);
                if (isCompleted) continue; // Skip completed
                
                String dateStr = r.optString("date", "");
                if (dateStr.isEmpty()) continue;
                
                // Parse date
                Date reminderDate;
                try {
                    reminderDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(dateStr);
                } catch (Exception e) {
                    continue;
                }
                
                // Only show reminders for the next 7 days
                if (reminderDate == null || reminderDate.after(weekEnd.getTime())) continue;
                if (reminderDate.before(today.getTime())) continue; // Skip past
                
                ReminderItem item = new ReminderItem();
                item.id = r.optString("id", "");
                item.title = r.optString("title", "");
                item.time = r.optString("time", "");
                item.date = dateStr;
                item.priority = r.optString("priority", "medium");
                item.categoryId = r.optString("categoryId", "");
                item.categoryIcon = categoryIcons.getOrDefault(item.categoryId, "📝");
                item.isCompleted = isCompleted;
                
                // Format relative date
                if (reminderDate.before(tomorrow.getTime())) {
                    item.displayDate = "Oggi";
                } else if (reminderDate.before(new Date(tomorrow.getTimeInMillis() + 86400000))) {
                    item.displayDate = "Domani";
                } else {
                    item.displayDate = new SimpleDateFormat("EEE d MMM", Locale.getDefault()).format(reminderDate);
                }
                
                items.add(item);
            }
            
            // Sort by date and time
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
    
    public static class ReminderItem {
        public String id;
        public String title;
        public String time;
        public String date;
        public String displayDate;
        public String priority;
        public String categoryId;
        public String categoryIcon;
        public boolean isCompleted;
    }
}

