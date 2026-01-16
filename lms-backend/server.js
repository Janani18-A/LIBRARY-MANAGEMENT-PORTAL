const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const path = require("path");
const session = require("express-session");
const cron = require("node-cron");

const app = express();

const {
  sessionMiddleware,
  requireAdminAuth,
  redirectIfAuthenticated,
  adminLogout
} = require("./middleware/authMiddleware");
const {
  validateAdminLogin,
  validateStudentLogin,
  validateStudentSignup
} = require("./middleware/validationMiddleware");

const { requireStudentAuth } = require('./middleware/authMiddleware');

app.use(cors());
app.use(express.json());
app.use(sessionMiddleware);

// ✅ Database connection
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
   port: process.env.DB_PORT
};

const db = mysql.createConnection(dbConfig);
db.connect((err) => {
  if (err) console.log("❌ DB connection failed:", err);
  else console.log("✅ Connected to MySQL");
});

// Fine update cron (runs daily)
cron.schedule('0 0 * * *', () => {
  const sql = `
    UPDATE transactions
    SET fine_amount = CEIL(DATEDIFF(CURDATE(), due_date)/15) * 10,
        status = 'overdue'
    WHERE return_date IS NULL AND due_date < CURDATE()
  `;
  db.query(sql, (err, result) => {
    if (err) console.error("❌ Error updating overdue transactions:", err);
    else console.log(`✅ Overdue transactions updated: ${result.affectedRows}`);
  });
});

// Serve static and login pages
app.use(express.static(path.join(__dirname, '../lms-frontend/public')));
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/admin-login.html'));
});
//user signup

app.get("/user/signup", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../lms-frontend/public/student-signup.html")
  );
});
//user login

app.get("/user/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../lms-frontend/public/student-login.html"));
});

// Admin login

app.post("/admin/login", validateAdminLogin, async (req, res) => {
  const { username, password } = req.sanitizedData;

  if (username !== process.env.ADMIN_USERNAME)
    return res.status(401).json({ success: false, error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!isMatch) return res.status(401).json({ success: false, error: "Invalid credentials" });

  req.session.adminAuthenticated = true;
  res.json({ success: true });
});
//login



// Admin dashboard & logout
app.get('/admin/dashboard', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/adminportal.html'));
});







//sign up validation


app.post("/signup", validateStudentSignup, (req, res) => {
  const { reg_no, name, department, year } = req.sanitizedData;

  const sql = `
    INSERT INTO users (reg_no, name, department, year)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [reg_no, name, department, year], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "⚠️ User already exists" });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    // ✅ Set session immediately so the portal knows the user is logged in
    req.session.user = { reg_no, name, department, year };

    // ✅ Respond success → frontend can redirect
    res.json({ success: true, message: "✅ Signup successful" });
  });
});


//login validation
app.post("/user/login", validateStudentLogin, (req, res) => {
  const { reg_no, name } = req.sanitizedData;

  const sql = `
    SELECT * FROM users
    WHERE reg_no = ? AND name = ?
  `;

  db.query(sql, [reg_no, name], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Server error"
      });
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: "❌ Invalid Student ID or Name"
      });
    }

    req.session.user = {
      reg_no: results[0].reg_no,
      name: results[0].name,
      department: results[0].department,
      year: results[0].year
    };

    res.json({
      success: true,
      message: "✅ Login successful"
    });
  });
});




// Protect student portal page
app.get('/user/portal', requireStudentAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/student-portal.html'));
});

// ===============================
// DASHBOARD STATS (COUNTS ONLY)
// ===============================
app.get("/admin/dashboard-stats", requireAdminAuth, (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM transactions WHERE status = 'issued') AS borrowedCount,
      (SELECT COUNT(*) FROM transactions 
        WHERE status = 'issued' AND due_date < CURDATE()) AS overdueCount
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Dashboard stats error:", err);
      return res.status(500).json({ borrowedCount: 0, overdueCount: 0 });
    }

    res.json(results[0]);
  });
});
//user logout
app.post("/user/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie("connect.sid"); // important
    res.json({ success: true, message: "Logged out successfully" });
  });
});


//total books display
// Get total books count
app.get("/admin/total-books", requireAdminAuth, (req, res) => {
  const tables = [
    "books_civil", "books_cse", "books_ece", "books_eee",
    "books_english", "books_general", "books_maths", "books_mech", "books_physics"
  ];

  let queries = tables.map(table => `SELECT SUM(total_volumes) AS count FROM ${table}`);
  let finalSql = queries.join(" UNION ALL ");

  db.query(finalSql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: "DB query error" });

    // Sum all results
    let totalBooks = results.reduce((sum, row) => sum + (row.count || 0), 0);
    res.json({ success: true, totalBooks });
  });
});


// Get all transactions (admin page)
app.get("/admin/transactions", requireAdminAuth, (req, res) => {
  const sql = "SELECT * FROM transactions ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json([]);
    res.json(results);
  });
});

// Return book – no login required
app.post("/transactions/return/:id", (req, res) => {
  const transactionId = req.params.id;
  const returnDate = new Date();

  const selectSql = `SELECT due_date FROM transactions WHERE id = ?`;
  db.query(selectSql, [transactionId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0) return res.status(404).json({ success: false, message: "Transaction not found" });

    const dueDate = new Date(results[0].due_date);
    let fine = 0;
    if (returnDate > dueDate) {
      const overdueDays = Math.ceil((returnDate - dueDate) / (1000*60*60*24));
      fine = Math.ceil(overdueDays / 15) * 10;
    }

    const updateSql = `
      UPDATE transactions
      SET return_date = ?, fine_amount = ?, status = 'returned'
      WHERE id = ?
    `;
    db.query(updateSql, [returnDate, fine, transactionId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: "DB error" });
      res.json({ success: true, message: `Book returned! Fine: Rs.${fine}` });
    });
  });
});

// Add transaction & store student
app.post("/transactions/add", (req, res) => {
  const { student_id, student_name, student_dept, student_year, book_id, book_department, book_title, book_author } = req.body;

  if (!student_id || !student_name || !student_dept || !student_year || !book_id || !book_department || !book_title || !book_author)
    return res.status(400).json({ success: false, message: "Missing required fields" });

  const studentSql = `
    INSERT INTO students (reg_no, name, department, year)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      department = VALUES(department),
      year = VALUES(year)
  `;
  db.query(studentSql, [student_id, student_name, student_dept, student_year], (err) => {
    if (err) return res.status(500).json({ success: false, message: "DB error (student)" });

    const issue_date = new Date();
    const due_date = new Date();
    due_date.setDate(issue_date.getDate() + 15);

    const transSql = `
      INSERT INTO transactions
      (student_id,student_name, book_id, book_department, book_title, book_author, issue_date, due_date, status)
      VALUES (?, ?,?, ?, ?, ?, ?, ?, 'issued')
    `;
    db.query(transSql, [student_id,student_name, book_id, book_department, book_title, book_author, issue_date, due_date], (err) => {
      if (err) return res.status(500).json({ success: false, message: "DB error (transaction)" });
      res.json({ success: true, message: "Book issued and student stored successfully!" });
    });
  });
  console.log("REQ BODY 👉", req.body);
});
app.get('/admin/information', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/information.html'));
});


app.get('/admin/overdue-report', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/overdue.html'));
});


//information from transaction table
// GET all transactions with student info
app.get("/admin/transactions-all", requireAdminAuth, (req, res) => {
  const sql = `
    SELECT 
      t.id,
      t.book_id,
      t.book_title,
      t.book_author,
      t.book_department,
      t.issue_date,
      t.due_date,
      t.return_date,
      t.status,
      t.fine_amount,
      s.name AS student_name,
      s.reg_no AS student_id,
      s.department AS student_dept,
      s.year AS student_year
    FROM transactions t
    JOIN students s ON t.student_id = s.reg_no
    ORDER BY t.issue_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json([]);
    res.json(results);
  });
});



// Get all overdue transactions
app.get("/admin/overdue", requireAdminAuth, (req, res) => {
  const sql = `
    SELECT 
      t.id AS transaction_id,
      t.book_id,
      t.book_title,
      t.book_author,
      t.book_department,
      t.issue_date,
      t.due_date,
      t.fine_amount,
      s.reg_no AS student_id,
      s.name AS student_name,
      s.department AS student_dept,
      s.year AS student_year
    FROM transactions t
    JOIN students s ON t.student_id = s.reg_no
    WHERE t.status = 'overdue'
    ORDER BY t.due_date ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: "DB error" });
    res.json({ success: true, overdueBooks: results });
  });
});


// Fetch books by department
app.get("/books/:dept", (req, res) => {
  const dept = req.params.dept.toUpperCase();
  const tableMap = {
    CSE: "books_cse", ECE: "books_ece", EEE: "books_eee", CIVIL: "books_civil",
    MECH: "books_mech", ENGLISH: "books_english", MATHS: "books_maths",
    PHYSICS: "books_physics", CHEMISTRY: "books_chemistry", GENERAL: "books_general",
  };
  const tableName = tableMap[dept];
  if (!tableName) return res.status(400).json({ error: "Invalid department" });

  db.query(`SELECT * FROM ${tableName}`, (err, results) => {
    if (err) return res.status(500).json({ error: "DB query error" });
    res.json(results);
  });
});

// Serve books catalog
app.get("/admin/books-catalog.html", requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../lms-frontend/public/books-catalog.html"));
});

// Serve transactions page
app.get('/admin/transactions-page', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/public/transactions.html'));
});


//add book button
// ADD NEW BOOK (Admin)
app.post("/admin/add-book", requireAdminAuth, (req, res) => {
  const {
    department,
    sno,
    title,
    author,
    publisher,
    subject,
      access_from,
    access_to,
    edition,
    year,
    total_volumes,
    isbn,
        rate_book,
    shelf
  } = req.body;

  if (!department || !title) {
    return res.status(400).json({ success: false, message: "Required fields missing" });
  }

  const tableMap = {
    CSE: "books_cse",
    ECE: "books_ece",
    EEE: "books_eee",
    CIVIL: "books_civil",
    MECH: "books_mech",
    ENGLISH: "books_english",
    MATHS: "books_maths",
    PHYSICS: "books_physics",
    GENERAL: "books_general"
  };

  const table = tableMap[department.toUpperCase()];
  if (!table) {
    return res.status(400).json({ success: false, message: "Invalid department" });
  }
 const sql = `
    INSERT INTO ${table}
    (sno, author, title, publisher, subject, access_from, access_to, edition, year, total_volumes, isbn, rate_book, shelf)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

   db.query(
    sql,
    [
      sno || null,
      author || null,
      title,
      publisher || null,
      subject || null,
      access_from || null,
      access_to || null,
      edition || null,
      year || null,
      total_volumes || 1,
      isbn || null,
      rate_book || null,
      shelf || null
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "DB error" });
      }
      res.json({ success: true, message: "Book added successfully" });
    }
  );
 
});

//USER PORTAL - CODE
//routes for user portal
// Student dashboard stats
app.get("/user/dashboard-stats", requireStudentAuth, (req, res) => {
  const studentId = req.session.user.reg_no;

  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM transactions WHERE student_id = ? AND status IN ('issued','overdue')) AS borrowedCount,
      (SELECT COUNT(*) FROM transactions WHERE student_id = ? AND status = 'returned') AS returnedCount,
      (SELECT IFNULL(SUM(fine_amount),0) FROM transactions WHERE student_id = ? AND status = 'overdue') AS pendingFine
  `;

  db.query(sql, [studentId, studentId, studentId], (err, results) => {
    if (err) {
      console.error("🔴 Dashboard stats error:", err);
      return res.status(500).json({ borrowedCount: 0, returnedCount: 0, pendingFine: 0 });
    }

    res.json({
      borrowedCount: results[0].borrowedCount || 0,
      returnedCount: results[0].returnedCount || 0,
      pendingFine: results[0].pendingFine || 0
    });
  });
});

// Student transaction table
app.get("/user/transactions", requireStudentAuth, (req, res) => {
  const studentId = req.session.user.reg_no;

  const sql = `
    SELECT id, book_id, book_title, book_author, book_department, issue_date, due_date, return_date, status, fine_amount
    FROM transactions
    WHERE student_id = ?
    ORDER BY issue_date DESC
  `;

  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error("🔴 Student transactions error:", err);
      return res.status(500).json({ borrowed: [], returned: [], pending: [] });
    }

    const borrowed = results.filter(t => t.status === "issued" || t.status === "overdue");
    const returned = results.filter(t => t.status === "returned");
    const pending = results.filter(t => t.status === "overdue");

    res.json({ borrowed, returned, pending });
  });
});


// GET student profile (for frontend to load profile page dynamically)
app.get("/user/profile", requireStudentAuth, (req, res) => {
  const studentId = req.session.user.reg_no;
  const sql = `SELECT reg_no, name, department, year FROM users WHERE reg_no = ?`;
  db.query(sql, [studentId], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(results[0]);
  });
});

// POST edit profile (only fields in DB: name, reg_no, department, year)
app.post("/user/edit", requireStudentAuth, (req, res) => {
  const studentId = req.session.user.reg_no;
  const { name, reg_no, department, year } = req.body;

  if(!name || !reg_no || !department || !year){
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  const sql = `UPDATE users SET name = ?, reg_no = ?, department = ?, year = ? WHERE reg_no = ?`;
  db.query(sql, [name, reg_no, department, year, studentId], (err) => {
    if(err){
      console.error(err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    // Update session info
    req.session.user = { name, reg_no, department, year };
    res.json({ success: true, message: "Profile updated successfully" });
  });
});


// Home
app.get("/", (req, res) => {
  res.send("LMS Backend is Running...");
});

// Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

