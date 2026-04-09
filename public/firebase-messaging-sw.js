// This is the service worker for Firebase Cloud Messaging.
// It must be in the public directory.

importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// You can find this in your firebase-applet-config.json
firebase.initializeApp({
  messagingSenderId: "864774128269" 
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // Add your icon path here
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
