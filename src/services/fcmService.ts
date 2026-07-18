export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted (Supabase backend).");
      return "dummy-supabase-fcm-token";
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
    // Dummy listener since Firebase is removed.
    // Supabase Realtime can be used to listen to notifications table instead.
  });
