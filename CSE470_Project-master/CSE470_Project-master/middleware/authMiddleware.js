/**
 * middleware/authMiddleware.js
 * Role-based access control guards
 */

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      req.flash('error', 'Access denied. Insufficient permissions.');
      return res.status(403).render('error', {
        title: '403 Forbidden',
        message: 'You do not have permission to access this page.',
        code: 403
      });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
