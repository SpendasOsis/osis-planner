// 🔥 IMPORT FIREBASE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔧 CONFIG LU
const firebaseConfig = {
  apiKey: "AIzaSyDzmRFkcpk54IJpK9fmhRJMJv20EkubNVA",
  authDomain: "osis-planner.firebaseapp.com",
  projectId: "osis-planner",
  storageBucket: "osis-planner.firebasestorage.app",
  messagingSenderId: "1064878789071",
  appId: "1:1064878789071:web:67c48e3bd45a3bf9e382ba",
  measurementId: "G-0V25XCGBMZ"
};

// 🚀 INIT FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 📦 COLLECTION
const taskCol = collection(db, "tasks");

// ================= DOM =================
const taskContainer = document.getElementById("taskContainer");
const modal = document.getElementById("taskModal");

const taskName = document.getElementById("taskName");
const taskDesc = document.getElementById("taskDesc");
const taskDeadline = document.getElementById("taskDeadline");
const taskStatus = document.getElementById("taskStatus");

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveTask");
const cancelBtn = document.getElementById("cancelTask");

let editId = null;

// ================= MODAL =================
function openModal(edit = false, task = null) {
  modal.classList.add("show");

  if (edit && task) {
    editId = task.id;
    taskName.value = task.name;
    taskDesc.value = task.desc;
    taskDeadline.value = task.deadline;
    taskStatus.value = task.status;
  } else {
    editId = null;
    taskName.value = "";
    taskDesc.value = "";
    taskDeadline.value = "";
    taskStatus.value = "Belum mulai";
  }
}

function closeModal() {
  modal.classList.remove("show");
}

// ================= DATE LOGIC =================
function getUrgency(deadline) {
  const today = new Date();
  const d = new Date(deadline);

  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "urgent";
  if (diff === 0) return "hariini";
  if (diff <= 3) return "warning";
  return "normal";
}

function getHmin(deadline) {
  const today = new Date();
  const d = new Date(deadline);

  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `⏳ H-${diff}`;
  if (diff === 0) return `🔥 H-0 (Hari ini)`;
  return `🚨 Terlambat ${Math.abs(diff)} hari`;
}

// ================= RENDER =================
function renderTasks(tasks) {
  taskContainer.innerHTML = "";

  tasks.forEach(task => {
    const card = document.createElement("div");
    const urgency = getUrgency(task.deadline);
    const hminText = getHmin(task.deadline);

    card.className = `task-card ${urgency}`;

    card.innerHTML = `
      <div class="task-title">${task.name}</div>
      <div class="task-desc">${task.desc}</div>
      <div class="task-meta">📅 ${task.deadline}</div>

      <div class="task-meta hmin-text">
        ${hminText}
      </div>

      <div class="status">${task.status}</div>

      <div class="task-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    card.querySelector(".edit-btn").onclick = () => openModal(true, task);
    card.querySelector(".delete-btn").onclick = () => deleteTask(task.id);

    taskContainer.appendChild(card);
  });
}

// ================= REALTIME LISTENER =================
onSnapshot(taskCol, snapshot => {
  const tasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderTasks(tasks);
});

// ================= CRUD FIRESTORE =================
async function addTask(task) {
  await addDoc(taskCol, task);
}

async function updateTask(id, task) {
  const ref = doc(db, "tasks", id);
  await updateDoc(ref, task);
}

async function deleteTask(id) {
  if (confirm("Hapus task ini?")) {
    const ref = doc(db, "tasks", id);
    await deleteDoc(ref);
  }
}

// ================= SAVE BUTTON =================
saveBtn.onclick = async () => {
  if (!taskName.value || !taskDeadline.value) {
    alert("Nama & deadline wajib diisi");
    return;
  }

  const newTask = {
    name: taskName.value,
    desc: taskDesc.value,
    deadline: taskDeadline.value,
    status: taskStatus.value
  };

  if (editId) {
    await updateTask(editId, newTask);
  } else {
    await addTask(newTask);
  }

  closeModal();
};

// ================= BUTTON EVENTS =================
addBtn.onclick = () => openModal();
cancelBtn.onclick = () => closeModal();