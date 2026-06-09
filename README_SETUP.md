# إعداد منظومة رُقي على GitHub Pages + Firebase

## الخطوات

### 1. إنشاء مشروع Firebase (مجاني)
1. اذهب إلى: https://console.firebase.google.com
2. "Add project" → اسم: ruqi-finance
3. Disable Google Analytics → Create project
4. من القائمة اليسرى: Build → Realtime Database
5. "Create Database" → Start in test mode → Enable
6. من Project Settings (⚙️) → General → Your apps → Web (</>)
7. انسخ الـ firebaseConfig object

### 2. رفع على GitHub Pages
1. أنشئ repository جديد: ruqi-finance
2. ارفع جميع الملفات
3. Settings → Pages → Branch: main → Save
4. رابطك: https://USERNAME.github.io/ruqi-finance

### 3. ضع Firebase Config في الملفات
في كل من index.html و mobile.html:
ابحث عن: PASTE_YOUR_FIREBASE_CONFIG_HERE
واستبدله بـ config الخاص بك
