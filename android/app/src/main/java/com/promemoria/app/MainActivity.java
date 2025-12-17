package com.promemoria.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registra il plugin per le notifiche native
        registerPlugin(NativeNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
