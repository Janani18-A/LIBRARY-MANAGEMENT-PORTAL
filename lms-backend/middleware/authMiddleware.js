const session = require('express-session');

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // secure cookies only in prod
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
});

// ✅ Middleware to protect admin pages and JSON routes
const requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.adminAuthenticated) {
    return next();
  }

  // If request expects HTML → redirect
  if (req.accepts('html')) {
    return res.redirect('/admin/login');
  }

  // If request expects JSON (like fetch in dashboard) → send 401
  return res.status(401).json({ success: false, error: 'Unauthorized' });
};

// ✅ Middleware to redirect authenticated admin away from login page
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

// ✅ Logout route handler (destroys session, responds JSON)
const adminLogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Logout failed:', err);
      return res.status(500).json({ success: false, error: 'Logout failed' });
    }

    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out' });
  });
};



// ✅ Student auth middleware
const requireStudentAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }

  if (req.accepts('html')) {
    return res.redirect('/user/signup'); // redirect to signup/login page
  }

  return res.status(401).json({ success: false, error: 'Unauthorized' });
};

module.exports = {
  sessionMiddleware,
  requireAdminAuth,
  redirectIfAuthenticated,
  adminLogout,
  requireStudentAuth  
};
