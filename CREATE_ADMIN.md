# 👤 How to Create an Admin User

Your Firebase Admin Login system requires **2 steps** to create an admin:
1. Create a user in Firebase Authentication
2. Add admin data to Firestore

---

## 📋 Step-by-Step Guide

### **Step 1: Create User in Firebase Authentication**

1. Go to **[Firebase Console](https://console.firebase.google.com)**
2. Select your project
3. Click **Authentication** (left sidebar)
4. Click **Users** tab
5. Click **"Add user"** button
6. Fill in:
   - **Email**: `admin@trybemarket.com` (or your email)
   - **Password**: Create a strong password (min 6 chars)
7. Click **"Add user"**

✅ **You'll see the user UID** - **COPY THIS** (looks like: `abc123xyz789...`)

---

### **Step 2: Add Admin Data to Firestore**

1. Go back to Firebase Console
2. Click **Firestore Database** (left sidebar)
3. Click **"Collections"** tab

#### **Option A: Create via Console (Easiest)**

1. Click **"Start collection"**
2. Name it: `admins`
3. Click **"Next"**
4. Document ID: **Paste the UID you copied** (from Step 1)
5. Click **"Next"**
6. Add these fields:

```json
{
  "email": "admin@trybemarket.com",
  "name": "Admin Name",
  "role": "admin",
  "permissions": ["dashboard", "users", "orders", "products", "settings"],
  "createdAt": "2024-11-22T00:00:00Z"
}
```

For each field, click "Add field":
- **Field**: `email` | **Type**: String | **Value**: `admin@trybemarket.com`
- **Field**: `name` | **Type**: String | **Value**: `Admin Name`
- **Field**: `role` | **Type**: String | **Value**: `admin`
- **Field**: `permissions` | **Type**: Array | **Value**: Enter each as: `dashboard`, `users`, `orders`, `products`, `settings`
- **Field**: `createdAt` | **Type**: Timestamp | **Value**: Current time

7. Click **"Save"**

✅ **Done!** Your admin is created.

---

#### **Option B: Create via Code (Firebase Admin SDK)**

If you have admin access, create a file `scripts/createAdmin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdmin() {
  const uid = 'USER_UID_FROM_STEP_1'; // Replace with the UID you copied
  
  await db.collection('admins').doc(uid).set({
    email: 'admin@trybemarket.com',
    name: 'Admin Name',
    role: 'admin',
    permissions: ['dashboard', 'users', 'orders', 'products', 'settings'],
    createdAt: new Date()
  });
  
  console.log('Admin created successfully!');
}

createAdmin();
```

Then run:
```bash
node scripts/createAdmin.js
```

---

## 🧪 Test Your Admin Login

### **Test Credentials**
- **Email**: `admin@trybemarket.com`
- **Password**: The password you created in Step 1

### **Test Steps**

1. Start your app:
```bash
npm run dev
```

2. Visit: `http://localhost:3000/login`

3. Enter your credentials:
   - Email: `admin@trybemarket.com`
   - Password: `YourPassword123`

4. Click **"Sign In"**

✅ **If successful**: Should redirect to dashboard (`/admin`)

❌ **If failed**: See troubleshooting below

---

## 🔒 Setup Firestore Security Rules (Important!)

Your app uses **production-secure rules** that require proper setup. Follow these steps:

### **Step 1: Update Firestore Rules**

1. Go to **[Firebase Console](https://console.firebase.google.com)**
2. Select your project
3. Click **Firestore Database** → **Rules** tab
4. Copy the rules from `firestore.rules` file in your project
5. Paste into the Firebase Console Rules editor
6. Click **"Publish"**

### **What These Rules Do**
✅ Only authenticated users can read data  
✅ Only users in `admins` collection can access admin data  
✅ Prevents unauthorized writes (must use Admin SDK)  
✅ Production-ready security  

### **Why You Might Get "Missing or insufficient permissions"**
This error means:
1. **Rules not published** - Publish the rules in Firebase Console
2. **Admin document missing** - Create the `admins` collection
3. **UID mismatch** - Document ID must match Firebase Authentication UID
4. **No "role" field** - Ensure admin document has `role: "admin"`

---

## 🆘 Troubleshooting

### ❌ "Missing or insufficient permissions"
**Problem**: Firestore security rules are blocking access

**Fix**:
1. Go to Firebase Console → Firestore → Rules
2. Copy rules from `firestore.rules` file in your project
3. Paste and **"Publish"** them
4. Wait 30 seconds for rules to take effect
5. Refresh your app

### ❌ "User does not have admin privileges"
**Problem**: Firestore admin document doesn't exist or has wrong UID

**Fix**:
1. Check Firebase Authentication → Users → Copy the exact UID
2. Check Firestore → admins collection → Document ID matches the UID exactly
3. Ensure all required fields exist (email, role, etc.)

### ❌ "Invalid credentials"
**Problem**: Email or password is wrong

**Fix**:
1. Verify email in Firebase Authentication
2. Check password is exactly what you entered
3. Make sure EMAIL/PASSWORD auth is enabled

### ❌ "No admin data found for user"
**Problem**: User exists in Auth but not in Firestore

**Fix**:
1. Add the user to Firestore `admins` collection
2. Use exact UID from Authentication
3. Reload the page

### ❌ "Firestore initialization error"
**Problem**: `.env.local` is missing or incorrect

**Fix**:
1. Check `.env.local` exists
2. Verify all NEXT_PUBLIC_* variables are set
3. Restart dev server: `npm run dev`

---

## 🔑 Important Notes

### ⚠️ **UID Must Match**
- Firebase Authentication UID ≠ Email
- Firestore document ID = Firebase Authentication UID
- They MUST be identical

### 🔐 **Security**
- Never hardcode credentials
- Use `.env.local` for sensitive data
- `admins` collection should be restricted via security rules

### 📝 **Required Fields**
Minimum fields for admin document:
```json
{
  "role": "admin"  // REQUIRED - identifies as admin
}
```

Optional but recommended:
```json
{
  "email": "admin@trybemarket.com",
  "name": "Admin Name",
  "permissions": ["dashboard", "users", "orders"],
  "createdAt": "2024-11-22T00:00:00Z"
}
```

---

## 📊 Complete Admin Structure (Recommended)

```json
{
  "uid_as_document_id": {
    "email": "admin@trybemarket.com",
    "name": "John Admin",
    "role": "admin",
    "permissions": [
      "dashboard",
      "users",
      "orders", 
      "products",
      "settings"
    ],
    "status": "active",
    "phone": "+1234567890",
    "department": "Management",
    "createdAt": "2024-11-22T10:30:00Z",
    "lastLogin": "2024-11-22T15:45:00Z"
  }
}
```

---

## 🎯 Quick Checklist

- [ ] Create user in Firebase Authentication
- [ ] Copy the UID
- [ ] Create `admins` collection in Firestore (if not exists)
- [ ] Create document with UID as ID
- [ ] Add required fields (at least `role: "admin"`)
- [ ] Test login at `/login`
- [ ] Verify redirect to `/admin` works
- [ ] Check browser console for errors

---

## 🚀 Multiple Admins

To create more admin users, repeat both steps for each user:

1. Create user in Authentication
2. Add to Firestore `admins` collection

Example with 2 admins:
```
Firestore admins collection:
├── uid_user_1
│   └── email: admin1@trybemarket.com
│
└── uid_user_2
    └── email: admin2@trybemarket.com
```
