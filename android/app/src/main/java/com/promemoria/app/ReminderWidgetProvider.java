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
import java.util.List;
import java.util.Locale;

public class ReminderWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "ReminderWidget";
    public static final String ACTION_REFRESH = "com.promemoria.app.WIDGET_REFRESH";
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called for " + appWidgetIds.length + " widgets");
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        Log.d(TAG, "onReceive: " + intent.getAction());
        
        if (ACTION_REFRESH.equals(intent.getAction()) || 
            AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(
                new ComponentName(context, ReminderWidgetProvider.class)
            );
            onUpdate(context, manager, ids);
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
    
    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            
            // Get reminders
            List<ReminderItem> reminders = getReminders(context);
            int count = reminders.size();
            
            Log.d(TAG, "Updating widget with " + count + " reminders");
            
            // Update count
            views.setTextViewText(R.id.widget_count, String.valueOf(count));
            
            // Hide all items first
            views.setViewVisibility(R.id.widget_item_1, View.GONE);
            views.setViewVisibility(R.id.widget_item_2, View.GONE);
            views.setViewVisibility(R.id.widget_item_3, View.GONE);
            
            if (count == 0) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE);
                
                // Show up to 3 reminders
                for (int i = 0; i < Math.min(count, 3); i++) {
                    ReminderItem item = reminders.get(i);
                    int itemId, titleId, timeId, iconId, priorityId;
                    
                    switch (i) {
                        case 0:
                            itemId = R.id.widget_item_1;
                            titleId = R.id.widget_title_1;
                            timeId = R.id.widget_time_1;
                            iconId = R.id.widget_icon_1;
                            priorityId = R.id.widget_priority_1;
                            break;
                        case 1:
                            itemId = R.id.widget_item_2;
                            titleId = R.id.widget_title_2;
                            timeId = R.id.widget_time_2;
                            iconId = R.id.widget_icon_2;
                            priorityId = R.id.widget_priority_2;
                            break;
                        default:
                            itemId = R.id.widget_item_3;
                            titleId = R.id.widget_title_3;
                            timeId = R.id.widget_time_3;
                            iconId = R.id.widget_icon_3;
                            priorityId = R.id.widget_priority_3;
                            break;
                    }
                    
                    views.setViewVisibility(itemId, View.VISIBLE);
                    views.setTextViewText(titleId, item.title);
                    
                    String timeText = item.displayDate;
                    if (item.time != null && !item.time.isEmpty()) {
                        timeText += " • " + item.time;
                    }
                    views.setTextViewText(timeId, timeText);
                    views.setTextViewText(iconId, item.categoryIcon);
                    
                    // Priority color
                    int priorityColor;
                    switch (item.priority) {
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
                    views.setInt(priorityId, "setBackgroundColor", priorityColor);
                }
            }
            
            // Click on widget opens app
            Intent mainIntent = new Intent(context, MainActivity.class);
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent mainPending = PendingIntent.getActivity(context, appWidgetId, mainIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_container, mainPending);
            
            // Add button
            Intent addIntent = new Intent(context, MainActivity.class);
            addIntent.putExtra("action", "add_reminder");
            addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent addPending = PendingIntent.getActivity(context, appWidgetId + 1000, addIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_add_button, addPending);
            
            appWidgetManager.updateAppWidget(appWidgetId, views);
            Log.d(TAG, "Widget updated successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error updating widget", e);
        }
    }
    
    public static List<ReminderItem> getReminders(Context context) {
        List<ReminderItem> items = new ArrayList<>();
        
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String remindersJson = prefs.getString("reminders", "[]");
            String categoriesJson = prefs.getString("categories", "[]");
            
            Log.d(TAG, "Reading reminders...");
            
            JSONArray categories = new JSONArray(categoriesJson);
            JSONArray reminders = new JSONArray(remindersJson);
            
            // Category icons map
            java.util.HashMap<String, String> categoryIcons = new java.util.HashMap<>();
            for (int i = 0; i < categories.length(); i++) {
                JSONObject cat = categories.getJSONObject(i);
                categoryIcons.put(cat.getString("id"), cat.optString("icon", "📝"));
            }
            
            // Today
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
                
                ReminderItem item = new ReminderItem();
                item.id = r.optString("id", "");
                item.title = r.optString("title", "");
                item.time = r.optString("time", "");
                item.date = dateStr;
                item.priority = r.optString("priority", "medium");
                item.categoryId = r.optString("categoryId", "");
                String icon = categoryIcons.get(item.categoryId);
                item.categoryIcon = icon != null ? icon : "📝";
                
                // Display date
                if (reminderDate.before(tomorrow.getTime())) {
                    item.displayDate = "Oggi";
                } else if (reminderDate.before(new Date(tomorrow.getTimeInMillis() + 86400000))) {
                    item.displayDate = "Domani";
                } else {
                    item.displayDate = new SimpleDateFormat("EEE d", Locale.getDefault()).format(reminderDate);
                }
                
                items.add(item);
            }
            
            // Sort
            items.sort((a, b) -> {
                int dateCompare = a.date.compareTo(b.date);
                if (dateCompare != 0) return dateCompare;
                return a.time.compareTo(b.time);
            });
            
            Log.d(TAG, "Found " + items.size() + " pending reminders");
            
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
    }
}
