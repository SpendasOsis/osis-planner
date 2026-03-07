importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzmRFkcpk54IJpK9fmhRJMJv20EkubNVA",
  authDomain: "osis-planner.firebaseapp.com",
  projectId: "osis-planner",
  messagingSenderId: "1064878789071",
  appId: "1:1064878789071:web:67c48e3bd45a3bf9e382ba"
});

const messaging = firebase.messaging();

// ===============================
// 🔔 TERIMA NOTIF DI BACKGROUND
// ===============================
messaging.onBackgroundMessage(function(payload) {

  console.log("📩 Notif diterima:", payload);

  const title = payload.data.title;

  const options = {
    body: payload.data.body,
    icon: "/icon.png",
    badge: "/icon.png",
    data: {
      url: "/"
    }
  };

  self.registration.showNotification(title, options);

  // 🔊 PLAY CUSTOM SOUND
  const audio = new Audio("/osisnot.mp3");
  audio.play().catch(()=>{});
});

// ===============================
// 🔗 KLIK NOTIF BUKA WEBSITE
// ===============================
self.addEventListener("notificationclick", function(event) {

  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(function(clientList) {

        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }

      })
  );

});
