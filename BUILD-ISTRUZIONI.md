# 📱 Come Buildare l'App Nativa

## 🤖 Build Android (APK)

### Prerequisiti
1. **Java JDK 17+**
   ```bash
   sudo apt install openjdk-17-jdk
   ```

2. **Android Studio** (opzionale ma consigliato)
   - Scarica: https://developer.android.com/studio
   - Oppure solo command-line tools: https://developer.android.com/studio#command-tools

### Metodo 1: Con Android Studio (Più Facile)
1. Apri Android Studio
2. File → Open → Seleziona la cartella `android/`
3. Aspetta che Gradle sincronizzi
4. Build → Build Bundle(s) / APK(s) → Build APK(s)
5. L'APK sarà in `android/app/build/outputs/apk/debug/app-debug.apk`

### Metodo 2: Da Terminale
```bash
# Imposta ANDROID_HOME (modifica il path se necessario)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Vai nella cartella android
cd android

# Build debug APK
./gradlew assembleDebug

# L'APK sarà in:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Metodo 3: Build Release (per distribuzione)
```bash
cd android

# Genera keystore (solo la prima volta)
keytool -genkey -v -keystore release-key.keystore -alias promemoria -keyalg RSA -keysize 2048 -validity 10000

# Build release
./gradlew assembleRelease

# L'APK sarà in:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 🍎 Build iOS (IPA)

### Prerequisiti
- **Mac** con macOS
- **Xcode** installato dall'App Store

### Metodo 1: Con Xcode (Consigliato)
1. Apri il progetto:
   ```bash
   cd ios/App
   open App.xcworkspace
   ```
2. Seleziona il tuo dispositivo o "Any iOS Device"
3. Product → Archive
4. Distribute App → Ad Hoc / Development

### Metodo 2: Per TestFlight (richiede Apple Developer Account $99/anno)
1. Archive in Xcode
2. Distribute App → App Store Connect
3. Carica su TestFlight
4. Condividi il link di invito con gli amici

### Metodo 3: Sideload con AltStore (Gratis, senza account)
1. Esporta l'IPA da Xcode (Development)
2. Scarica AltStore: https://altstore.io
3. Installa AltStore sul Mac
4. Collega iPhone e installa AltStore
5. Trascina l'IPA su AltStore per installare

---

## 🚀 Metodo Più Semplice: Servizi Cloud

Se non vuoi installare nulla, usa un servizio cloud:

### Codemagic (Gratis per progetti open source)
1. Vai su https://codemagic.io
2. Connetti il tuo repo GitHub
3. Seleziona "Capacitor/Ionic"
4. Avvia il build
5. Scarica APK e IPA pronti!

### Appflow (di Ionic)
1. Vai su https://ionic.io/appflow
2. Piano gratuito disponibile
3. Build automatici nel cloud

---

## 📤 Condividere l'APK con gli Amici (Android)

1. Carica l'APK su Google Drive
2. Condividi il link
3. Gli amici scaricano e installano (devono abilitare "Origini sconosciute" nelle impostazioni)

## 📤 Condividere con Amici iPhone

### Opzione A: TestFlight ($99/anno)
- Pubblichi su TestFlight
- Mandi link di invito
- Installano con un tap

### Opzione B: AltStore (Gratis)
- Ogni amico installa AltStore sul proprio Mac/PC
- Gli mandi il file IPA
- Installano tramite AltStore
- ⚠️ Devono reinstallare ogni 7 giorni (limite Apple)

### Opzione C: Servizio terzo
- Diawi.com - Upload IPA e condividi link (gratis, 1 giorno)
- AppCenter di Microsoft - Gratis per team piccoli

---

## 🔧 Comandi Utili

```bash
# Sync dopo modifiche al codice
npm run build && npx cap sync

# Aprire in Android Studio
npx cap open android

# Aprire in Xcode
npx cap open ios

# Live reload durante sviluppo
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

