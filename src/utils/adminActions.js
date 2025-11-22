// utils/adminActions.js
import { auth, db } from '@/lib/firebaseConfig';
import { 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp
} from 'firebase/firestore';

export async function createAdmin({ name, email, role, permissions, password }) {
  // 1. Create Firebase Auth user
  const res = await createUserWithEmailAndPassword(auth, email, password || "AdminTemp123!");
  const AdminUid = res.user.uid;

  // 2. Save admin in Firestore
  await setDoc(doc(db, "admins", AdminUid), {
    AdminUid,               
    email,
    name,
    role,
    permissions,
    createdAt: serverTimestamp(),
  });

  return AdminUid;
}

export async function updateAdmin(AdminUid, data) {
  await updateDoc(doc(db, "admins", AdminUid), data);
}

export async function deleteAdmin(AdminUid) {
  await deleteDoc(doc(db, "admins", AdminUid));
}

export async function getAllAdmins() {
  const snapshot = await getDocs(collection(db, "admins"));
  return snapshot.docs.map((doc) => doc.data());
}
