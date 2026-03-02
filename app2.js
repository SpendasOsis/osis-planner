
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

// 🔧 CONFIG (TIDAK DIHAPUS)
const firebaseConfig = {
  apiKey: "AIzaSyDzmRFkcpk54IJpK9fmhRJMJv20EkubNVA",
  authDomain: "osis-planner.firebaseapp.com",
  projectId: "osis-planner",
  storageBucket: "osis-planner.firebasestorage.app",
  messagingSenderId: "1064878789071",
  appId: "1:1064878789071:web:67c48e3bd45a3bf9e382ba"
};

// 🚀 INIT
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 📦 COLLECTION
const taskCol = collection(db, "tasks");

// ================= DOM =================
const taskContainer = document.getElementById("taskContainer");
const modal = document.getElementById("taskModal");

const taskAuthor = document.getElementById("taskAuthor");
const taskName = document.getElementById("taskName");
const taskDesc = document.getElementById("taskDesc");
const taskDeadline = document.getElementById("taskDeadline");
const taskStatus = document.getElementById("taskStatus");

const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveTask");
const cancelBtn = document.getElementById("cancelTask");
const downloadBtn = document.getElementById("downloadBtn");

// 🔥 Statistik DOM
const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const doneCount = document.getElementById("doneCount");
const lateCount = document.getElementById("lateCount");

let editId = null;
let allTasks = [];

// ================= MODAL =================
function openModal(edit = false, task = null) {
  modal.classList.add("show");

  if (edit && task) {
    editId = task.id;
    taskAuthor.value = task.author || "";
    taskName.value = task.name || "";
    taskDesc.value = task.desc || "";
    taskDeadline.value = task.deadline || "";
    taskStatus.value = task.status || "Belum mulai";
  } else {
    editId = null;
    taskAuthor.value = "";
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

  if (diff < 0) return "danger";
  if (diff === 0) return "today";
  if (diff <= 3) return "warning";
  return "normal";
}

// 🔥 H-MIN WEB
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

// 🔥 H-MIN PDF
function getHminPDF(deadline) {
  const today = new Date();
  const d = new Date(deadline);

  today.setHours(0,0,0,0);
  d.setHours(0,0,0,0);

  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `H-${diff}`;
  if (diff === 0) return `H-0 (Hari ini)`;
  return `Terlambat ${Math.abs(diff)} hari`;
}

// 🔥 SORT DEADLINE
function sortByDeadline(tasks) {
  return tasks.sort((a, b) => {
    return new Date(a.deadline) - new Date(b.deadline);
  });
}

// ================= STATISTIK =================
function updateStats(tasks) {
  const today = new Date();
  today.setHours(0,0,0,0);

  let total = tasks.length;
  let pending = 0;
  let done = 0;
  let late = 0;

  tasks.forEach(task => {
    const deadline = new Date(task.deadline);
    deadline.setHours(0,0,0,0);

    if (task.status === "Selesai") {
      done++;
    } else {
      pending++;
      if (deadline < today) {
        late++;
      }
    }
  });

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  doneCount.textContent = done;
  lateCount.textContent = late;
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
      <div class="task-meta">👤 ${task.author}</div>
      <div class="task-desc">${task.desc || ""}</div>
      <div class="task-meta">📅 ${task.deadline}</div>
      <div class="task-meta hmin-text">${hminText}</div>
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

// ================= REALTIME =================
onSnapshot(taskCol, snapshot => {
  allTasks = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  const sorted = sortByDeadline([...allTasks]);
  renderTasks(sorted);
  updateStats(allTasks); // 🔥 Statistik realtime
});

// ================= CRUD =================
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

// ================= SAVE =================
saveBtn.onclick = async () => {
  if (!taskAuthor.value || !taskName.value || !taskDeadline.value) {
    alert("Nama penulis, nama tugas & deadline wajib diisi");
    return;
  }

  const newTask = {
    author: taskAuthor.value,
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

addBtn.onclick = () => openModal();
cancelBtn.onclick = () => closeModal();

// ================= DOWNLOAD PDF =================
downloadBtn.onclick = () => {
  if (allTasks.length === 0) {
    alert("Tidak ada data untuk di-download");
    return;
  }

  const sorted = sortByDeadline([...allTasks]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("OSIS SMPN 2 SUKARAJA", 14, 15);
  doc.text("Data To-Do-List Internal", 14, 22);
  doc.text("Dicetak: " + new Date().toLocaleDateString(), 14, 29);

  const tableData = sorted.map(task => [
    task.author,
    task.name,
    task.desc || "-",
    task.deadline,
    getHminPDF(task.deadline),
    task.status
  ]);

  doc.autoTable({
    head: [["Penulis", "Tugas", "Deskripsi", "Deadline", "H-Min", "Status"]],
    body: tableData,
    startY: 40,
  });

  doc.save("OSIS-ToDo-List.pdf");
};
