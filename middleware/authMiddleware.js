const jwt = require('jsonwebtoken');

// Auth middleware for admin or manager
const authenticateAdminOrManager = (req, res, next) => {
  // If user already decoded (by authenticateUser), reuse it
  const user = req.user;
  if (user) {
    if (!['admin', 'manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied: Not admin or manager' });
    }
    req.admin = user;
    return next();
  }
  // Else, decode from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Access denied: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'manager'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Access denied: Not admin or manager' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized: No token' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Auth middleware for waiter role only
const authenticateWaiter = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (req.user?.role !== 'waiter') {
      return res.status(403).json({ error: 'Access denied: Not waiter' });
    }
    next();
  });
};

// Role Authorization Middleware, supports req.user and req.admin
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.admin?.role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: `Access denied for role: ${role}` });
    }
    next();
  };
};

module.exports = {
  authenticateAdmin: authenticateAdminOrManager,
  authenticateUser,
  authenticateWaiter,
  authorizeRole
};