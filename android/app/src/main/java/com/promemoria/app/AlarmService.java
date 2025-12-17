package com.promemoria.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service per notifiche tipo SVEGLIA con suono in loop
 */
public class AlarmService extends Service {
    
    private static final String TAG = "AlarmService";
    public static final String CHANNEL_ID = "promemoria-alarm-service";
    
    public static final String ACTION_START = "com.promemoria.app.ACTION_START_ALARM";
    public static final String ACTION_STOP = "com.promemoria.app.ACTION_STOP_ALARM";
    public static final String ACTION_SNOOZE = "com.promemoria.app.ACTION_SNOOZE_ALARM";
    
    public static final String EXTRA_NOTIFICATION_ID = "notification_id";
    public static final String EXTRA_REMINDER_ID = "reminder_id";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_BODY = "body";
    
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private Handler handler;
    private boolean isRunning = false;
    
    // Stop automatico dopo 60 secondi
    private static final long AUTO_STOP_DELAY = 60000;
    
    private Runnable autoStopRunnable = () -> {
        Log.d(TAG, "Auto-stopping alarm after timeout");
        stopAlarm();
    };
    
    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        
        String action = intent.getAction();
        
        if (ACTION_START.equals(action)) {
            int notificationId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, 0);
            String reminderId = intent.getStringExtra(EXTRA_REMINDER_ID);
            String title = intent.getStringExtra(EXTRA_TITLE);
            String body = intent.getStringExtra(EXTRA_BODY);
            
            startAlarm(notificationId, reminderId, title, body);
        } else if (ACTION_STOP.equals(action) || ACTION_SNOOZE.equals(action)) {
            stopAlarm();
        }
        
        return START_NOT_STICKY;
    }
    
    private void startAlarm(int notificationId, String reminderId, String title, String body) {
        if (isRunning) return;
        isRunning = true;
        
        // Leggi impostazioni
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
        String settingsJson = prefs.getString("notification-settings", "{}");
        boolean vibrationEnabled = settingsJson.contains("\"vibrationEnabled\":true");
        String ringtone = "chime"; // default
        
        // Parse ringtone from settings
        int ringtoneStart = settingsJson.indexOf("\"ringtone\":\"");
        if (ringtoneStart != -1) {
            int ringtoneEnd = settingsJson.indexOf("\"", ringtoneStart + 12);
            if (ringtoneEnd != -1) {
                ringtone = settingsJson.substring(ringtoneStart + 12, ringtoneEnd);
            }
        }
        
        // Leggi nome utente
        String userName = prefs.getString("user-name", "");
        String personalizedTitle = title;
        if (!userName.isEmpty()) {
            personalizedTitle = "Ei " + userName + "! " + title;
        }
        
        // Crea notifica full-screen
        Notification notification = createAlarmNotification(notificationId, reminderId, personalizedTitle, body);
        startForeground(notificationId, notification);
        
        // Avvia suono in LOOP
        startSound(ringtone);
        
        // Avvia vibrazione in LOOP
        if (vibrationEnabled) {
            startVibration();
        }
        
        // Auto-stop dopo 60 secondi
        handler.postDelayed(autoStopRunnable, AUTO_STOP_DELAY);
        
        Log.d(TAG, "Alarm started: " + personalizedTitle);
    }
    
    private void stopAlarm() {
        isRunning = false;
        handler.removeCallbacks(autoStopRunnable);
        
        // Stop suono
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
            mediaPlayer = null;
        }
        
        // Stop vibrazione
        if (vibrator != null) {
            vibrator.cancel();
        }
        
        stopForeground(true);
        stopSelf();
        
        Log.d(TAG, "Alarm stopped");
    }
    
    private void startSound(String ringtone) {
        try {
            Uri soundUri;
            
            // Mappa suoneria a risorsa
            int soundRes = 0;
            switch (ringtone) {
                case "chime": soundRes = R.raw.chime; break;
                case "beep": soundRes = R.raw.beep; break;
                case "gentle": soundRes = R.raw.gentle; break;
                case "urgent": soundRes = R.raw.urgent; break;
                case "alert": soundRes = R.raw.alert; break;
                case "silent": return; // No sound
                default: soundRes = 0; break;
            }
            
            if (soundRes != 0) {
                soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + soundRes);
            } else {
                soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            }
            
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, soundUri);
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            mediaPlayer.setLooping(true); // LOOP!
            mediaPlayer.prepare();
            mediaPlayer.start();
            
            Log.d(TAG, "Sound started: " + ringtone);
            
        } catch (Exception e) {
            Log.e(TAG, "Error playing sound", e);
        }
    }
    
    private void startVibration() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            // Pattern: vibra-pausa-vibra-pausa (loop)
            long[] pattern = {0, 800, 400, 800, 400, 800, 1000};
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0)); // 0 = repeat from start
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
    }
    
    private Notification createAlarmNotification(int notificationId, String reminderId, String title, String body) {
        // Intent per STOP
        Intent stopIntent = new Intent(this, AlarmService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, notificationId + 100, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Intent per SNOOZE (5 minuti)
        Intent snoozeIntent = new Intent(this, NotificationActionReceiver.class);
        snoozeIntent.setAction(NotificationActionReceiver.ACTION_SNOOZE);
        snoozeIntent.putExtra(EXTRA_NOTIFICATION_ID, notificationId);
        snoozeIntent.putExtra(EXTRA_REMINDER_ID, reminderId);
        snoozeIntent.putExtra(EXTRA_TITLE, title);
        snoozeIntent.putExtra(EXTRA_BODY, body);
        PendingIntent snoozePending = PendingIntent.getBroadcast(this, notificationId + 101, snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Intent per aprire app
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, notificationId, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Full-screen intent
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        fullScreenIntent.putExtra("alarm", true);
        PendingIntent fullScreenPending = PendingIntent.getActivity(this, notificationId + 50, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle("⏰ " + title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openPending)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(0, "✓ Fatto", stopPending)
            .addAction(0, "⏰ 5 min", snoozePending)
            .build();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Sveglia Promemoria",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifiche sveglia per i promemoria");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 800, 400, 800});
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            channel.setBypassDnd(true); // Bypass Do Not Disturb
            
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        stopAlarm();
        super.onDestroy();
    }
}
