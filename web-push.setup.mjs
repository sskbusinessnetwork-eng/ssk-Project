import webpush from 'web-push';
const vapidKeys = webpush.generateVAPIDKeys();
console.log("PUBLIC:", vapidKeys.publicKey);
console.log("PRIVATE:", vapidKeys.privateKey);
