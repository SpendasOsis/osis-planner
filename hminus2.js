const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();
const messaging = admin.messaging();

// 🔐 CEK AKSES USER
function canAccess(role, category) {
  if (!role) return false;

  if (role === "Pembina") return true;
  if (role === "Trio") return true;

  if (role === "Inti") {
    return (
      category === "Umum" ||
      category === "Inti" ||
      category.startsWith("Sekbid")
    );
  }

  if (role.startsWith("Sekbid")) {
    return category === "Umum" || category === role;
  }

  return false;
}

async function run() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskSnapshot = await db.collection("tasks").get();
  const userSnapshot = await db.collection("users").get();

  for (const taskDoc of taskSnapshot.docs) {
    const task = taskDoc.data();

    if (!task.deadline || task.status === "Selesai") continue;

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const diff = Math.ceil(
      (deadline - today) / (1000 * 60 * 60 * 24)
    );

    // ✅ H-2, H-1, H-0 saja
    if (![2, 1, 0].includes(diff)) continue;

    const kategori = task.kategori ?? "Umum";

    const tokens = [];

    userSnapshot.forEach(userDoc => {
      const user = userDoc.data();

      if (
        user.fcmToken &&
        canAccess(user.role, kategori)
      ) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) continue;

    let title = "";
    let body = "";

    if (diff === 2) {
      title = "⏰ Deadline H-2!";
      body = `${task.name} (${kategori}) deadline ${task.deadline}`;
    }

    if (diff === 1) {
      title = "🚨 Deadline Besok!";
      body = `${task.name} (${kategori}) tinggal 1 hari lagi!`;
    }

    if (diff === 0) {
      title = "🔥 Deadline Hari Ini!";
      body = `${task.name} (${kategori}) HARUS SELESAI HARI INI!`;
    }

    console.log(
      `Kirim notif ${title} untuk ${task.name} ke ${tokens.length} user`
    );

    await messaging.sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
    });
  }

  console.log("✅ Selesai cek reminder H-2 H-1 H-0");
}

run().catch(console.error);
