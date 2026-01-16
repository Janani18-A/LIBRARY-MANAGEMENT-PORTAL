require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const path = require('path');
const { sessionMiddleware, requireAdminAuth, redirectIfAuthenticated, adminLogout } = require('./middleware/authMiddleware');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
db.connect(err => {
  if (err) console.error('❌ DB Connection Failed:', err);
  else console.log('✅ MySQL Connected');
});

// ✅ Static files (frontend)
app.use(express.static(path.join(__dirname, '../lms-frontend')));

// ===== ROUTES =====

// Home
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../lms-frontend/index.html')));

// Login page
app.get('/admin/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/admin-login.html'));
});

// Login API
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.adminAuthenticated = true;
    req.session.adminUser = username;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

// Dashboard page
app.get('/admin/dashboard', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../lms-frontend/admin-dashboard.html'));
});

// Logout
app.post('/admin/logout', adminLogout);


// Protected admin data
app.get('/admin/data', requireAdminAuth, (req, res) => {
  res.json({ success: true, user: req.session.adminUser });
});

// ===== DEPT BOOK ROUTE =====
app.get('/books/:dept', (req, res) => {
  const dept = req.params.dept.toUpperCase();
  const map = {
    CSE: 'books_cse', ECE: 'books_ece', EEE: 'books_eee', CIVIL: 'books_civil',
    MECH: 'books_mech', ENGLISH: 'books_english', MATHS: 'books_maths',
    PHYSICS: 'books_physics', CHEMISTRY: 'books_chemistry', GENERAL: 'books_general'
  };
  const table = map[dept];
  if (!table) return res.status(400).json({ error: 'Invalid department' });
  db.query(`SELECT * FROM ${table}`, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB query error' });
    res.json(results);
  });
});


// ===== BORROWING ANALYTICS ROUTE =====
app.get('/admin/analytics', requireAdminAuth, (req, res) => {
  const analytics = {};

  // 1️⃣ Total issued, returned, overdue
  const statusQuery = `
    SELECT 
      SUM(status='issued') AS issued,
      SUM(status='returned') AS returned,
      SUM(status='overdue') AS overdue
    FROM transactions;
  `;

  // 2️⃣ Books issued by department
  const deptQuery = `
    SELECT book_department AS department, COUNT(*) AS total
    FROM transactions
    GROUP BY book_department;
  `;

  // 3️⃣ Monthly borrowing trend
  const trendQuery = `
    SELECT DATE_FORMAT(issue_date, '%Y-%m') AS month, COUNT(*) AS total
    FROM transactions
    GROUP BY month
    ORDER BY month;
  `;

  db.query(statusQuery, (err, statusResult) => {
    if (err) return res.status(500).json({ error: 'Status query failed', details: err });

    analytics.status = statusResult[0];

    db.query(deptQuery, (err, deptResult) => {
      if (err) return res.status(500).json({ error: 'Dept query failed', details: err });

      analytics.byDepartment = deptResult;

      db.query(trendQuery, (err, trendResult) => {
        if (err) return res.status(500).json({ error: 'Trend query failed', details: err });

        analytics.monthlyTrend = trendResult;

        res.json({ success: true, analytics });
      });
    });
  });
});


// Start server
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
