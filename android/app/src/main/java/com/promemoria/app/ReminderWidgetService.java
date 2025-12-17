package com.promemoria.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.List;

public class ReminderWidgetService extends RemoteViewsService {
    
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new ReminderRemoteViewsFactory(getApplicationContext());
    }
    
    private static class ReminderRemoteViewsFactory implements RemoteViewsFactory {
        
        private Context context;
        private List<ReminderWidgetProvider.ReminderItem> items;
        
        public ReminderRemoteViewsFactory(Context context) {
            this.context = context;
        }
        
        @Override
        public void onCreate() {
            items = ReminderWidgetProvider.getReminders(context);
        }
        
        @Override
        public void onDataSetChanged() {
            items = ReminderWidgetProvider.getReminders(context);
        }
        
        @Override
        public void onDestroy() {
            items = null;
        }
        
        @Override
        public int getCount() {
            return items != null ? Math.min(items.size(), 5) : 0; // Max 5 items
        }
        
        @Override
        public RemoteViews getViewAt(int position) {
            if (items == null || position >= items.size()) {
                return null;
            }
            
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
            return position;
        }
        
        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}

