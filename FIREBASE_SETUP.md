# Firebase Admin Login System - Setup Guide

## Overview
This guide sets up a complete Firebase authentication system for the TrybeMarket Admin Dashboard with:
- Secure admin login page with gray-800 background and white overlay
- Firebase client-side authentication
- Firebase Admin SDK server-side verification
- Protected routes and admin role verification
- Password reset functionality

## 📁 Files Created

### Authentication Files
- `src/context/AuthContext.jsx` - Auth state management & Firebase integration
- `src/lib/firebaseConfig.js` - Firebase client-side configuration
- `src/lib/firebaseAdmin.js` - Firebase Admin SDK configuration
- `src/app/login/page.jsx` - Beautiful login page with password reset
- `src/components/ProtectedRoute.jsx` - Route protection wrapper

### API Routes
- `src/app/api/auth/verify/route.js` - Server-side token verification

### Configuration
- `.env.local.example` - Environment variables template
- `package.json` - Updated with Firebase dependencies

## 🔧 Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Project Setup

#### Get your Firebase credentials:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Settings** → **Project Settings**
4. Copy your config values from the "Web" app section

#### For Admin SDK:
1. Go to **Service Accounts** tab
2. Click "Generate New Private Key"
3. Save the JSON file and note the credentials

### 3. Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your Firebase credentials in `.env.local`:
```
# Public Firebase config (safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Private Admin SDK config (NEVER commit this)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

⚠️ **IMPORTANT**: Add `.env.local` to `.gitignore` to prevent exposing credentials!

### 4. Firestore Setup

Create an `admins` collection in Firestore with admin user documents:

```json
{
  "email": "admin@trybemarket.com",
  "role": "admin",
  "name": "Admin Name",
  "createdAt": "2024-01-01T00:00:00Z",
  "permissions": ["dashboard", "users", "orders", "products", "settings"]
}
```

**Document ID should be the Firebase Auth UID**

### 5. Firebase Authentication Setup

1. Enable Email/Password authentication:
   - Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"

2. Create admin users:
   - Firebase Console → Authentication → Users
   - Click "Add user"
   - Use the same email as in Firestore admin collection

## 📖 Usage

### Login Page
Navigate to `http://localhost:3000/login`

Features:
- Email & password authentication
- Show/hide password toggle
- Forgot password functionality
- Error & success messages
- Loading states
- Beautiful gradient header with security info

### Protected Admin Routes
All routes under `/admin` are automatically protected:
```
/admin                 - Dashboard
/admin/users          - User management
/admin/orders         - Order management
/admin/products       - Product management
/admin/settings       - Settings
```

Users without admin privileges are redirected to login.

### Using Auth Context

```jsx
import { useAuth } from '@/context/AuthContext';

export default function MyComponent() {
  const { user, adminData, login, logout, loading, error } = useAuth();

  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Welcome, {adminData?.name}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

## 🔐 Security Features

1. **Client-side Authentication**: Firebase Auth with persistence
2. **Server-side Verification**: Admin SDK validates tokens and role
3. **Role-based Access**: Only users in Firestore `admins` collection can access
4. **Protected Routes**: Automatic redirection for unauthorized users
5. **Password Reset**: Secure reset email functionality
6. **HTTPS Only**: Firebase enforces HTTPS in production

## 🎨 Login Page Features

### Design
- Gray-800 (`bg-gray-800`) background
- White rounded overlay card (`bg-white rounded-2xl`)
- Animated gradient blobs for visual appeal
- Indigo gradient header with brand logo
- Professional spacing and typography

### Functionality
- **Email Input**: Validates email format
- **Password Input**: Toggle show/hide with icons
- **Remember Me**: Checkbox for future UX enhancement
- **Forgot Password**: Separate form for password reset
- **Loading States**: Spinner during authentication
- **Error Display**: Red alert boxes for errors
- **Success Display**: Green alert boxes for success
- **Security Info**: Cards showing Secure, Encrypted, Protected features

## 🚀 Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit: `http://localhost:3000/login`

## 📝 Login Credentials

Use the email and password you created in Firebase Authentication.

Example:
- Email: `admin@trybemarket.com`
- Password: Your secure password

## 🔗 API Endpoints

### POST `/api/auth/verify`
Verifies JWT token and admin role.

Request:
```json
{
  "token": "your_id_token"
}
```

Response:
```json
{
  "valid": true,
  "uid": "user_uid",
  "adminData": { "role": "admin", "name": "..." }
}
```

## 🐛 Troubleshooting

### "User does not have admin privileges"
- Ensure user document exists in Firestore `admins` collection
- Document ID must match the Firebase Auth UID

### Environment variables not loading
- Restart the dev server after updating `.env.local`
- Verify `.env.local` is in the root directory

### Firebase initialization errors
- Check all environment variables are correctly set
- Ensure `.env.local` has no typos
- Verify Firebase project is active

### CORS/Network errors
- Check internet connection
- Verify Firebase credentials are correct
- Check browser console for detailed error messages

## 📚 Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Next.js Authentication](https://nextjs.org/learn/dashboard-app/adding-authentication)
- [Tailwind CSS](https://tailwindcss.com)

## 🎯 Next Steps

1. ✅ Set up Firebase project and credentials
2. ✅ Create admin user in Firebase Auth
3. ✅ Add admin document to Firestore
4. ✅ Run `npm install`
5. ✅ Start dev server: `npm run dev`
6. ✅ Test login at `http://localhost:3000/login`
7. ✅ Customize login branding if needed
8. ✅ Deploy to production

---

**Built with Next.js 16 + Firebase + Tailwind CSS**
