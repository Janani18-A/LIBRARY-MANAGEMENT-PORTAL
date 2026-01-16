// ================================
// Student Portal - main.js
// ================================
  // Check if user session exists by calling backend
  fetch("/user/profile")
    .then(res => {
      if (!res.ok) {
        // Not logged in → redirect
        window.location.href = "/student-signup.html";
      }
      return res.json();
    })
    .then(data => {
      // you can populate portal data here
      console.log("User is logged in:", data.name);
    })
    .catch(err => {
      console.error(err);
      window.location.href = "/student-signup.html";
    });

let studentData = {};
let transactions = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadStudentInfo();
  await loadTransactions();
});

// --------------------
// Load Student Info
// --------------------
async function loadStudentInfo() {
  try {
    const res = await fetch("/user/profile");
    if (!res.ok) throw new Error("Failed to fetch student info");
    const data = await res.json();
    studentData = data;

    // Populate profile section
    dName.textContent = data.name;
    dReg.textContent = data.reg_no;
    dDept.textContent = data.department;
    dYear.textContent = data.year;

    // Populate edit form
    nameInput.value = data.name;
    regInput.value = data.reg_no;
    deptInput.value = data.department;
    yearInput.value = data.year;

    // Populate sidebar
    sideName.textContent = data.name;
    sideEmail.textContent = data.reg_no;
    avatar.textContent = data.name[0].toUpperCase();
  } catch (err) {
    console.error("Error loading student info:", err);
  }
}

// --------------------
// Load Transactions
// --------------------
async function loadTransactions() {
  try {
    const res = await fetch("/user/transactions");
    if (!res.ok) throw new Error("Failed to fetch transactions");

    const data = await res.json();

    // Populate global transactions
    transactions.borrowed = data.borrowed || data.filter(t => t.status === "issued" || t.status === "overdue");
    transactions.returned = data.returned || data.filter(t => t.status === "returned");
    transactions.pending = data.pending || data.filter(t => t.status === "overdue");

    // Update dashboard cards
    borrowedCard.querySelector("b").textContent = transactions.borrowed.length;
    returnedCard.querySelector("b").textContent = transactions.returned.length;
    let pendingAmount = transactions.pending.reduce((acc, t) => acc + parseFloat(t.fine_amount || 0), 0);
    pendingCard.querySelector("b").textContent = `₹${pendingAmount}`;
  } catch (err) {
    console.error("Error loading transactions:", err);
  }
}



// --------------------
// Show Table (Borrowed / Returned / Pending)
// --------------------
function showTable(type) {
  if (!transactions[type] || transactions[type].length === 0) {
    dynamicTable.innerHTML = `<p style="padding:15px;">No records found.</p>`;
    return;
  }

  let html = `<table>`;
  if (type === "pending") {
    html += `<tr><th>Book Title</th><th>Author</th><th>Department</th><th>Due Date</th><th>Fine</th></tr>`;
    transactions.pending.forEach(b => {
      html += `<tr>
        <td>${b.book_title}</td>
        <td>${b.book_author}</td>
        <td>${b.book_department}</td>
        <td>${b.due_date}</td>
        <td class="fine">₹${b.fine_amount}</td>
      </tr>`;
    });
  } else {
    html += `<tr><th>Book Title</th><th>Author</th><th>Department</th><th>Issue Date</th></tr>`;
    transactions[type].forEach(b => {
      html += `<tr>
        <td>${b.book_title}</td>
        <td>${b.book_author}</td>
        <td>${b.book_department}</td>
        <td>${b.issue_date}</td>
      </tr>`;
    });
  }
  html += `</table>`;
  dynamicTable.innerHTML = html;
}

// --------------------
// Sidebar Section Switching
// --------------------
function showSection(id, btn) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".sidebar button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

// --------------------
// Save / Update Profile
// --------------------

// --------------------
// Modals
// --------------------
function closeFieldModal() { fieldModal.style.display = "none"; }
function closeProfileModal() { profileModal.style.display = "none"; }
function logout() { logoutModal.style.display = "flex"; }
function closeLogout() { logoutModal.style.display = "none"; }
function confirmLogout() { window.location.href = "/logout"; }


//user logout()
   const logoutModal = document.getElementById("logoutModal");

  function openLogout() {
    logoutModal.classList.add("show");
  }

  function closeLogout() {
    logoutModal.classList.remove("show");
  }

  function confirmLogout() {
    fetch("/user/logout", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          window.location.href = "/user/login";
        }
      });
  }

  //save popup



async function saveProfile() {
  const name = nameInput.value.trim();
  const reg = regInput.value.trim();
  const dept = deptInput.value.trim();
  const year = yearInput.value.trim();

  if (!name || !reg || !dept || !year) {
    modalTitle.textContent = "Error ❌";
    modalMsg.textContent = "All fields are required";
    fieldModal.style.display = "flex";
    return;
  }

  const res = await fetch("/user/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      reg_no: reg,
      department: dept,
      year
    })
  });

  const data = await res.json();
if (data.success) {
  await loadStudentInfo();   // dynamic update
  showSavePopup();           // ✅ NEW popup
}

 else {
    modalTitle.textContent = "Error ❌";
    modalMsg.textContent = data.message;
    fieldModal.style.display = "flex";
  }
}
// =====================
// Save Popup Functions
// =====================
function showSavePopup() {
  document.getElementById("savePopup").classList.add("active");
}

function closeSavePopup() {
  document.getElementById("savePopup").classList.remove("active");
}
