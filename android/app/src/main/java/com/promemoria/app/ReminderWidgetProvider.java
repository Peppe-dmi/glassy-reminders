package com.promemoria.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
 * Widget semplice stile Samsung Glass
 */
public class ReminderWidgetProvider extends AppWidgetProvider {
    
    private static final String TAG = "ReminderWidget";
    
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate");
        for (int id : appWidgetIds) {
            updateWidget(context, appWidgetManager, id);
        }
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if ("com.promemoria.app.WIDGET_REFRESH".equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(context, ReminderWidgetProvider.class));
            onUpdate(context, mgr, ids);
        }
    }
    
    private void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);
            
            List<String[]> items = getReminders(context);
            int total = getTotalCount(context);
            
            views.setTextViewText(R.id.widget_count, String.valueOf(total));
            views.setTextViewText(R.id.widget_subtitle, 
                new SimpleDateFormat("EEEE d MMM", Locale.getDefault()).format(new Date()));
            
            views.setViewVisibility(R.id.widget_item_1, View.GONE);
            views.setViewVisibility(R.id.widget_item_2, View.GONE);
            views.setViewVisibility(R.id.widget_item_3, View.GONE);
            views.setViewVisibility(R.id.widget_empty, items.isEmpty() ? View.VISIBLE : View.GONE);
            
            int[] itemIds = {R.id.widget_item_1, R.id.widget_item_2, R.id.widget_item_3};
            int[] iconIds = {R.id.widget_icon_1, R.id.widget_icon_2, R.id.widget_icon_3};
            int[] titleIds = {R.id.widget_title_1, R.id.widget_title_2, R.id.widget_title_3};
            int[] timeIds = {R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3};
            
            for (int i = 0; i < Math.min(items.size(), 3); i++) {
                String[] item = items.get(i);
                views.setViewVisibility(itemIds[i], View.VISIBLE);
                views.setTextViewText(iconIds[i], item[0]);
                views.setTextViewText(titleIds[i], item[1]);
                views.setTextViewText(timeIds[i], item[2]);
            }
            
            // Click handlers
            Intent main = new Intent(context, MainActivity.class);
            main.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            views.setOnClickPendingIntent(R.id.widget_container, 
                PendingIntent.getActivity(context, widgetId, main, 
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            
            Intent add = new Intent(context, MainActivity.class);
            add.putExtra("action", "add");
            add.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            views.setOnClickPendingIntent(R.id.widget_add_button,
                PendingIntent.getActivity(context, widgetId + 1000, add,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            
            mgr.updateAppWidget(widgetId, views);
            Log.d(TAG, "Widget updated: " + items.size() + " items");
            
        } catch (Exception e) {
            Log.e(TAG, "Error", e);
        }
    }
    
    private int getTotalCount(Context context) {
        try {
            SharedPreferences p = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(p.getString("reminders", "[]"));
            int c = 0;
            for (int i = 0; i < arr.length(); i++) {
                if (!arr.getJSONObject(i).optBoolean("isCompleted", false)) c++;
            }
            return c;
        } catch (Exception e) {
            return 0;
        }
    }
    
    private List<String[]> getReminders(Context context) {
        List<String[]> list = new ArrayList<>();
        try {
            SharedPreferences p = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            JSONArray cats = new JSONArray(p.getString("categories", "[]"));
            JSONArray rems = new JSONArray(p.getString("reminders", "[]"));
            
            HashMap<String, String> icons = new HashMap<>();
            for (int i = 0; i < cats.length(); i++) {
                JSONObject c = cats.getJSONObject(i);
                icons.put(c.getString("id"), c.optString("icon", "📝"));
            }
            
            Calendar today = Calendar.getInstance();
            today.set(Calendar.HOUR_OF_DAY, 0);
            today.set(Calendar.MINUTE, 0);
            today.set(Calendar.SECOND, 0);
            
            Calendar week = (Calendar) today.clone();
            week.add(Calendar.DAY_OF_YEAR, 7);
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault());
            
            List<JSONObject> valid = new ArrayList<>();
            for (int i = 0; i < rems.length(); i++) {
                JSONObject r = rems.getJSONObject(i);
                if (r.optBoolean("isCompleted", false)) continue;
                String d = r.optString("date", "");
                if (d.isEmpty()) continue;
                try {
                    Date dt = sdf.parse(d);
                    if (dt != null && !dt.before(today.getTime()) && !dt.after(week.getTime())) {
                        valid.add(r);
                    }
                } catch (Exception ignored) {}
            }
            
            valid.sort((a, b) -> {
                String da = a.optString("date", "") + a.optString("time", "");
                String db = b.optString("date", "") + b.optString("time", "");
                return da.compareTo(db);
            });
            
            Calendar tomorrow = (Calendar) today.clone();
            tomorrow.add(Calendar.DAY_OF_YEAR, 1);
            
            for (int i = 0; i < Math.min(valid.size(), 3); i++) {
                JSONObject r = valid.get(i);
                String icon = icons.getOrDefault(r.optString("categoryId", ""), "📝");
                String title = r.optString("title", "");
                String time = r.optString("time", "");
                String dateStr = r.optString("date", "");
                
                String display;
                try {
                    Date dt = sdf.parse(dateStr);
                    if (dt != null && dt.before(tomorrow.getTime())) {
                        display = time.isEmpty() ? "Oggi" : time;
                    } else if (dt != null && dt.before(new Date(tomorrow.getTimeInMillis() + 86400000))) {
                        display = time.isEmpty() ? "Domani" : "Domani " + time;
                    } else {
                        display = new SimpleDateFormat("EEE", Locale.getDefault()).format(dt) + 
                            (time.isEmpty() ? "" : " " + time);
                    }
                } catch (Exception e) {
                    display = time;
                }
                
                list.add(new String[]{icon, title, display});
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting reminders", e);
        }
        return list;
    }
}
