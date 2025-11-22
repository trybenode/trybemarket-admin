'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          
          // Fetch admin data from Firestore
          const adminRef = doc(db, 'admins', currentUser.uid);
          const adminSnap = await getDoc(adminRef);
          
          if (adminSnap.exists()) {
            setAdminData(adminSnap.data());
          } else {
            console.warn('No admin data found for user:', currentUser.uid);
          }
        } else {
          setUser(null);
          setAdminData(null);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Verify user is admin by checking Firestore
      const adminRef = doc(db, 'admins', userCredential.user.uid);
      const adminSnap = await getDoc(adminRef);
      
      if (!adminSnap.exists()) {
        await auth.signOut();
        throw new Error('User does not have admin privileges');
      }
      
      setAdminData(adminSnap.data());
      return userCredential.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setError(null);
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setAdminData(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    adminData,
    loading,
    error,
    login,
    logout,
    resetPassword,
    isAdmin: !!adminData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
