# Firebase 設置指南

## 🔥 Firebase 配置說明

您的 PodcastStudio 使用 Firebase 進行用戶認證和數據存儲。為了使應用正常運行，需要完成以下設置。

---

## 📋 當前 Firebase 配置

**項目 ID**: `sietrendforce`
**認證域名**: `sietrendforce.firebaseapp.com`

---

## ⚠️ 常見錯誤：「載入資料時發生錯誤」

這個錯誤通常是因為 **Netlify 部署域名未添加到 Firebase 授權域名列表**。

---

## 🛠️ 解決方案：配置 Firebase 授權域名

### 步驟 1：登入 Firebase Console

1. 訪問：https://console.firebase.google.com/
2. 選擇項目：**sietrendforce**

### 步驟 2：添加授權域名

1. 左側菜單選擇：**Authentication（身份驗證）**
2. 點擊頂部標籤：**Settings（設置）**
3. 找到：**Authorized domains（授權域名）**
4. 點擊：**Add domain（添加域名）**

#### 需要添加的域名：

```
same-u0cq56wtmw4-latest.netlify.app
```

如果您有自定義域名，也需要添加。

### 步驟 3：啟用 Google 登入

1. 在 **Authentication** 頁面
2. 點擊：**Sign-in method（登入方式）**
3. 找到 **Google** 提供商
4. 確保狀態為：**已啟用** ✅
5. 如果未啟用，點擊編輯並啟用

---

## 🌐 本地開發設置

### 本地測試域名

Firebase 預設已包含 `localhost`，但如果沒有，請添加：

```
localhost
```

### 環境變數（可選）

如果您想使用環境變數管理 Firebase 配置，創建 `.env.local` 文件：

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDQd184iWHxgn1g-dPrRbupChD8MSXf4Iw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sietrendforce.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sietrendforce
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sietrendforce.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=21862818172
NEXT_PUBLIC_FIREBASE_APP_ID=1:21862818172:web:5c59a03d855b18936ec4f9
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-3J3TL6VWC8
```

⚠️ **注意**: 不要將 `.env.local` 提交到 Git！

---

## ✅ 驗證設置

完成以上設置後：

1. 重新訪問：https://same-u0cq56wtmw4-latest.netlify.app
2. 點擊「使用 Google 登入」按鈕
3. 應該會彈出 Google 登入窗口
4. 完成登入後即可使用應用

---

## 🔒 安全建議

### Firestore 安全規則

確保您的 Firestore 有適當的安全規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用戶只能訪問自己的數據
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 用戶活動記錄
    match /userActivities/{activityId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

---

## 📞 需要幫助？

如果仍然遇到問題：

1. 檢查瀏覽器控制台（F12）的錯誤信息
2. 確認 Firebase 項目配置正確
3. 檢查網絡連接

---

## 🚀 部署信息

- **GitHub**: https://github.com/amandachien-pixel/podcraft-studio-fixed
- **Netlify**: https://same-u0cq56wtmw4-latest.netlify.app

---

**最後更新**: 2025-11-04
