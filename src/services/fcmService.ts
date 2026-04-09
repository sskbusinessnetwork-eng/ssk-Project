import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app } from "../firebase";

const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
      
      // Get the device token
      // You need to provide your VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
      const token = await getToken(messaging, {
        vapidKey: "BB-uAVLS4nb-NT4Ksn0NsAtjoj8lSAVK5DZF7YXglSC3AoXdAX-pYNqe2BerPvvvt06AjaXGjN6Y7AGQhUO1280" 
      });
      
      if (token) {
        console.log("FCM Device Token:", token);
        return token;
      } else {
        console.log("No registration token available. Request permission to generate one.");
      }
    } else {
      console.log("Unable to get permission to notify.");
    }
  } catch (error) {
    console.error("An error occurred while retrieving token:", error);
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received: ", payload);
      resolve(payload);
    });
  });
