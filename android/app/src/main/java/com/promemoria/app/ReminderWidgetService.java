package com.promemoria.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;

public class ReminderWidgetService extends RemoteViewsService {
    
    private static final String TAG = "ReminderWidgetService";
    
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        Log.d(TAG, "Creating RemoteViewsFactory");
        int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, 
            AppWidgetManager.INVALID_APPWIDGET_ID);
        return new ReminderRemoteViewsFactory(getApplicationContext(), appWidgetId);
    }
    
    private static class ReminderRemoteViewsFactory implements RemoteViewsFactory {
        
        private Context context;
        private int appWidgetId;
        private List<ReminderWidgetProvider.ReminderItem> items;
        
        public ReminderRemoteViewsFactory(Context context, int appWidgetId) {
            this.context = context;
            this.appWidgetId = appWidgetId;
            this.items = new ArrayList<>();
        }
        
        @Override
        public void onCreate() {
            Log.d(TAG, "Factory onCreate");
            loadData();
        }
        
        @Override
        public void onDataSetChanged() {
            Log.d(TAG, "Factory onDataSetChanged");
            loadData();
        }
        
        private void loadData() {
            try {
                items = ReminderWidgetProvider.getReminders(context);
                Log.d(TAG, "Loaded " + items.size() + " items");
            } catch (Exception e) {
                Log.e(TAG, "Error loading data", e);
                items = new ArrayList<>();
            }
        }
        
        @Override
        public void onDestroy() {
            Log.d(TAG, "Factory onDestroy");
            items = null;
        }
        
        @Override
        public int getCount() {
            int count = items != null ? Math.min(items.size(), 5) : 0;
            Log.d(TAG, "getCount: " + count);
            return count;
        }
        
        @Override
        public RemoteViews getViewAt(int position) {
            Log.d(TAG, "getViewAt: " + position);
            
            if (items == null || position >= items.size()) {
                Log.w(TAG, "Invalid position or null items");
                return null;
            }
            
            try {
                ReminderWidgetProvider.ReminderItem item = items.get(position);
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_item);
                
                // Title
                views.setTextViewText(R.id.widget_item_title, item.title);
                
                // Time and date
                String timeText = item.displayDate;
                if (item.time != null && !item.time.isEmpty()) {
                    timeText += " • " + item.time;
                }
                views.setTextViewText(R.id.widget_item_time, timeText);
                
                // Category icon
                views.setTextViewText(R.id.widget_item_category, item.categoryIcon);
                
                // Priority color
                int priorityColor;
                switch (item.priority) {
                    case "high":
                        priorityColor = Color.parseColor("#ef4444"); // Red
                        break;
                    case "low":
                        priorityColor = Color.parseColor("#22c55e"); // Green
                        break;
                    default:
                        priorityColor = Color.parseColor("#667eea"); // Primary blue
                        break;
                }
                views.setInt(R.id.widget_item_priority, "setBackgroundColor", priorityColor);
                
                // Fill-in intent for click
                Intent fillInIntent = new Intent();
                fillInIntent.putExtra("reminderId", item.id);
                views.setOnClickFillInIntent(R.id.widget_item_container, fillInIntent);
                
                return views;
                
            } catch (Exception e) {
                Log.e(TAG, "Error creating view at position " + position, e);
                return null;
            }
        }
        
        @Override
        public RemoteViews getLoadingView() {
            return null;
        }
        
        @Override
        public int getViewTypeCount() {
            return 1;
        }
        
        @Override
        public long getItemId(int position) {
            if (items != null && position < items.size()) {
                return items.get(position).id.hashCode();
            }
            return position;
        }
        
        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
