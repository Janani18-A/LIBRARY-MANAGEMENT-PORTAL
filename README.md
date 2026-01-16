# GCE Library Management System (LMS)


A web-based **Library Management System** for GCE, built with **Node.js, Express, MySQL, and JavaScript**. 

This system helps admins manage books and track student transactions efficiently, while students can view and manage their issued books.


---


## Features

### Admin Portal


- Secure login with password authentication.
- Add, update, and manage books for all departments.
- View all student transactions in table format.
- Overdue book tracking and fine calculation.
- Export transactions to **Excel/PDF**.
- Dashboard with total books, issued books, and overdue stats.



### Student Portal

- Student login with registration number and name.
- View issued books, return history, and pending fines.
- Update personal profile dynamically.
- Track overdue books and fines automatically.



### Books Management

- Department-wise books database .
- Add books with details: title, author, publisher, edition, year, volumes, shelf, ISBN.
- Dynamic catalog fetch using REST API.



### Technology Stack

- **Backend:** Node.js, Express.js, MySQL
- **Frontend:** HTML, CSS, JavaScript
- **Authentication:** Session-based (express-session)
- **Database:** MySQL



---


## Installation


1. Clone the repository:
2. 
```bash
git clone https://github.com/Janani18-A/LIBRARY-MANAGEMENT-PORTAL.git
cd LIBRARY-MANAGEMENT-PORTAL
```

Notes:

Fine calculation is automatic: ₹10 per 15 overdue days.

Export to Excel/PDF available for admin reports.

Overdue books are highlighted in the UI.

Author:

Janani A– GitHub
