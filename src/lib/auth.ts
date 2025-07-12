import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from './firebase';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Ensure auth persistence is set to local (browser)
setPersistence(auth, browserLocalPersistence);

export interface User {
  uid: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
}

export async function login(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const { user } = userCredential;
    const appUser: User = {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      profilePictureUrl: user.photoURL || undefined,
    };
    return { success: true, user: appUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function uploadProfilePicture(user: FirebaseUser, file: File): Promise<string> {
  const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}


export async function signup(name: string, email: string, pass: string, picture?: File) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    let photoURL: string | undefined = undefined;
    if (picture) {
      photoURL = await uploadProfilePicture(user, picture);
    }

    await updateFirebaseProfile(user, { displayName: name, photoURL });

    const appUser: User = {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      profilePictureUrl: user.photoURL || undefined,
    };

    return { success: true, user: appUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(uid: string, data: Partial<User> & { pictureFile?: File }) {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { success: false, error: "Authentication error." };
  }

  try {
    const user = auth.currentUser;
    const profileUpdate: { displayName?: string, photoURL?: string } = {};

    if (data.name) {
      profileUpdate.displayName = data.name;
    }

    if (data.pictureFile) {
      profileUpdate.photoURL = await uploadProfilePicture(user, data.pictureFile);
    }

    await updateFirebaseProfile(user, profileUpdate);

    const updatedUser: User = {
      uid: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      profilePictureUrl: user.photoURL || undefined
    };
    return { success: true, user: updatedUser };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changeUserPassword(oldPass: string, newPass: string) {
  if (!auth.currentUser || !auth.currentUser.email) {
    return { success: false, error: "Authentication error." };
  }

  try {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, oldPass);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPass);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Incorrect current password or another error occurred." };
  }
}

export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Firestore: Healthcare Info
export async function saveHealthcareInfo(uid: string, data: any) {
  try {
    await setDoc(doc(db, 'healthcare', uid), data, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loadHealthcareInfo(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, 'healthcare', uid));
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: true, data: null };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Firestore: Emergency Contacts
export async function saveEmergencyContacts(uid: string, contacts: any[]) {
  try {
    await setDoc(doc(db, 'emergencyContacts', uid), { contacts }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loadEmergencyContacts(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, 'emergencyContacts', uid));
    if (docSnap.exists()) {
      return { success: true, contacts: docSnap.data().contacts || [] };
    } else {
      return { success: true, contacts: [] };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Firestore: SOS Settings
export async function saveSosSettings(uid: string, data: { message: string, contacts: any[] }) {
  try {
    await setDoc(doc(db, 'sosSettings', uid), data, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function loadSosSettings(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, 'sosSettings', uid));
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: true, data: null };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
