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
