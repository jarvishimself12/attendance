import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

// Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAF0C15J6BtAqCMjtI-OIsCCTNrQ8tFPnI",
    authDomain: "dc-tech-attendance.firebaseapp.com",
    projectId: "dc-tech-attendance",
    storageBucket: "dc-tech-attendance.firebasestorage.app",
    messagingSenderId: "1004445113493",
    appId: "1:1004445113493:web:46e65299d1c94b815f8f9c",
    measurementId: "G-46BL576B81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export default app;
