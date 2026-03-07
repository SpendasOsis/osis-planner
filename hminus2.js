const admin = require("firebase-admin");

// ===============================
// 🔐 FIREBASE INIT
// ===============================
if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error("❌ Firebase env variables tidak lengkap");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();
const messaging = admin.messaging();

// ===============================
// 🔐 CEK AKSES USER
// ===============================
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

// ===============================
// 🚀 MAIN FUNCTION
// ===============================
async function run() {
  console.log("🚀 Mulai cek reminder...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskSnapshot = await db.collection("tasks").get();
  const userSnapshot = await db.collection("users").get();

  console.log(`📋 Total task: ${taskSnapshot.size}`);
  console.log(`👤 Total user: ${userSnapshot.size}`);

  for (const taskDoc of taskSnapshot.docs) {
    const task = taskDoc.data();

    if (!task.deadline || task.status === "Selesai") continue;

    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);

    const diff = Math.ceil(
      (deadline - today) / (1000 * 60 * 60 * 24)
    );

    // hanya H-2 H-1 H-0
    if (![2, 1, 0].includes(diff)) continue;

    const kategori = task.kategori ?? "Umum";
    const tokens = [];

    userSnapshot.forEach(userDoc => {
      const user = userDoc.data();

      if (
        user.fcmTokens &&
        user.fcmTokens.length > 0 &&
        canAccess(user.role, kategori)
      ) {
        tokens.push(...user.fcmTokens);
      }
    });

    if (tokens.length === 0) {
      console.log(`⚠️ Tidak ada user untuk task ${task.name}`);
      continue;
    }

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
      `📢 Kirim notif "${title}" untuk "${task.name}" ke ${tokens.length} device`
    );

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens,
        notification: {
          title: title,
          body: body,
        },
      });

      console.log(
        `✅ Success: ${response.successCount} | Failed: ${response.failureCount}`
      );
    } catch (err) {
      console.error("❌ Error kirim notif:", err);
    }
  }

  console.log("🎉 Selesai cek reminder H-2 H-1 H-0");
}

// ===============================
// RUN
// ===============================
run().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
