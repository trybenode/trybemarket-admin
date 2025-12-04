# How to Create an Admin User

This guide explains how to create your first admin user for the TrybeMarket Admin Dashboard using the secure Admin SDK API endpoint.

## Prerequisites

Before creating an admin, ensure:

1. ✅ Firebase project is set up
2. ✅ Firestore database is initialized
3. ✅ Environment variables are configured in `.env.local` (see [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md))
4. ✅ Firestore security rules have been published (Step 1 in ADMIN_SETUP_GUIDE.md)
5. ✅ Your Next.js server is running locally or deployed

If any prerequisite is missing, complete it before proceeding.

---

## Method 1: Using the Admin Creation API (Recommended for Development)

The `/api/admin/create` endpoint allows you to securely create admins using the Firebase Admin SDK.

### Using cURL

```bash
curl -X POST http://localhost:3000/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@trybemarket.com",
    "password": "SecurePassword123!",
    "displayName": "Admin User",
    "role": "admin"
  }'
```

### Using JavaScript/Fetch

```javascript
// In your browser console or a script
const response = await fetch('/api/admin/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@trybemarket.com',
    password: 'SecurePassword123!',
    displayName: 'Admin User',
    role: 'admin'
  })
});

const result = await response.json();
console.log(result);

// Success response:
// {
//   "success": true,
//   "uid": "abc123xyz",
//   "message": "Admin user 'admin@trybemarket.com' created successfully",
//   "admin": {
//     "uid": "abc123xyz",
//     "email": "admin@trybemarket.com",
//     "displayName": "Admin User",
//     "role": "admin"
//   }
// }
```

### Response Format

**Success (201):**
```json
{
  "success": true,
  "uid": "user_id_here",
  "message": "Admin user created successfully",
  "admin": {
    "uid": "user_id_here",
    "email": "admin@example.com",
    "displayName": "Admin Name",
    "role": "admin"
  }
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Error description",
  "code": "error_code"
}
```

### API Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Admin email address (must be unique) |
| `password` | string | Yes | Password (minimum 6 characters) |
| `displayName` | string | Yes | Display name for the admin |
| `role` | string | No | `'admin'` or `'super-admin'` (defaults to `'admin'`) |

---

## Method 2: Using Firebase Admin SDK Directly

If you prefer to use the Admin SDK directly in a Node.js script:

### 1. Create a Node.js Script

Save this as `scripts/create-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin(email, password, displayName, role = 'admin') {
  try {
    // Create user in Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });

    // Create admin document in Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      active: true,
      lastLogin: null
    });

    // Set custom claims
    const claims = role === 'super-admin' 
      ? { admin: true, superAdmin: true }
      : { admin: true };
    
    await auth.setCustomUserClaims(userRecord.uid, claims);

    console.log('✅ Admin created successfully!');
    console.log(`UID: ${userRecord.uid}`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

// Run with: node scripts/create-admin.js
const email = process.argv[2];
const password = process.argv[3];
const displayName = process.argv[4];
const role = process.argv[5] || 'admin';

if (!email || !password || !displayName) {
  console.log('Usage: node scripts/create-admin.js <email> <password> <displayName> [role]');
  console.log('Example: node scripts/create-admin.js admin@example.com SecurePass123 "Admin User" admin');
  process.exit(1);
}

createAdmin(email, password, displayName, role);
```

### 2. Run the Script

```bash
node scripts/create-admin.js admin@trybemarket.com SecurePass123 "Admin User" admin
```

---

## Troubleshooting

### ❌ "Missing or insufficient permissions"

**Cause:** Firestore security rules not published to production.

**Solution:**
1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to **Firestore Database** → **Rules**
3. Replace existing rules with content from `firestore.rules` file in your project
4. Click **Publish**
5. Wait 30 seconds for rules to deploy
6. Try creating admin again

### ❌ "Email already exists"

**Cause:** An admin with this email is already registered.

**Solution:** Use a different email address, or delete the existing user:
- In Firebase Console → Authentication → Find user → Delete
- In Firebase Console → Firestore → `admins` collection → Delete document matching the UID

### ❌ "Password is too weak"

**Cause:** Password must be at least 6 characters.

**Solution:** Use a stronger password:
```
❌ Bad: "test" (too short)
✅ Good: "SecurePass123!" (12 characters, mixed case, numbers, symbols)
```

### ❌ "Invalid email address"

**Cause:** Email format is invalid.

**Solution:** Use a valid email format: `user@domain.com`

### ❌ "Email/password accounts are not enabled"

**Cause:** Email/password authentication not enabled in Firebase.

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Authentication** → **Sign-in method**
3. Enable **Email/Password** provider
4. Click **Save**
5. Try again

---

## Verifying Admin Creation

### 1. Check Firebase Authentication Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Go to **Authentication** → **Users**
3. Find your new admin email in the list
4. Verify `Custom claims` shows `{ "admin": true }`

### 2. Check Firestore Database

1. Go to **Firestore Database** → **Collections**
2. Open `admins` collection
3. Find document with the admin's UID
4. Verify it contains:
   - `email`: Your admin email
   - `displayName`: Admin name
   - `role`: "admin" or "super-admin"
   - `active`: true

### 3. Test Login

1. Navigate to `http://localhost:3000/login`
2. Enter admin email and password
3. Should successfully log in and redirect to dashboard

---

## Next Steps

After creating your first admin:

1. ✅ Log in to verify authentication works
2. ✅ Explore the admin dashboard
3. ✅ Create additional admins as needed
4. ✅ Configure role-based access control for different admin levels
5. ✅ Set up audit logging for admin activities

---

## Security Notes

- ✅ Admin creation uses Firebase Admin SDK (server-side only)
- ✅ Firestore rules prevent client-side writes to `admins` collection
- ✅ Passwords are never exposed in logs or responses
- ✅ All admin actions are trackable via custom claims and Firestore records
- ⚠️ Keep service account credentials (`FIREBASE_PRIVATE_KEY`) secure
- ⚠️ Don't share admin passwords; use Firebase email verification for password resets
