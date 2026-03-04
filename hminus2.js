const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const messaging = admin.messaging();

async function run() {
  const today = new Date();
  today.setHours(0,0,0,0);

  const taskSnapshot = await db.collection("tasks").get();
  const userSnapshot = await db.collection("users").get();

  const tokens = [];

  userSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.fcmToken) tokens.push(data.fcmToken);
  });

  if (tokens.length === 0) {
    console.log("Tidak ada token ditemukan.");
    return;
  }

  for (const doc of taskSnapshot.docs) {
    const task = doc.data();
    if (!task.deadline || task.status === "Selesai") continue;

    const deadline = new Date(task.deadline);
    deadline.setHours(0,0,0,0);

    const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diff === 2) {
      await messaging.sendEachForMulticast({
        tokens: tokens,
        notification: {
          title: "⏰ Deadline H-2!",
          body: `${task.name} deadline pada ${task.deadline}`,
        },
      });
    }
  }

  console.log("Selesai cek H-2");
}

run().catch(console.error);
