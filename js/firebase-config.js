// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB1c0-77uAtQ1WOqjQR36oNKNVw4SkabZk",
    authDomain: "ndhan-8ccfd.firebaseapp.com",
    projectId: "ndhan-8ccfd",
    storageBucket: "ndhan-8ccfd.firebasestorage.app",
    messagingSenderId: "588409398474",
    appId: "1:588409398474:android:f77a9c634be9e6ab2d4033"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch(err => console.warn('Firestore persistence error:', err));

// Cloudinary Config
const CLOUDINARY_CONFIG = {
    cloudName: 'dy3zrsq5u',
    uploadPreset: 'bandhan_uploads',
    folderPath: 'Profile',
    maxGalleryPhotos: 6
};