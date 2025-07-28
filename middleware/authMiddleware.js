const jwt = require('jsonwebtoken');

// Auth middleware for admin or manager
const authenticateAdminOrManager = (req, res, next) => {
  // If user already decoded (by authenticateUser), reuse it
  const user = req.user;
  console.log('[DEBUG] Checking admin/manager role for user:', user?.role);
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

// Auth middleware for all roles
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[DEBUG] No Bearer token found in Authorization header');
    return res.status(401).json({ error: 'Unauthorized: No token' });
  }

  const token = authHeader.split(' ')[1];
  console.log('[DEBUG] Raw token:', token);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      username: decoded.username,
      fullName: decoded.fullName || decoded.username || 'System'
    };
    console.log('[DEBUG] Authenticated user:', req.user);
    next();
  } catch (err) {
    console.log('[DEBUG] Token verification failed:', err.message);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Auth middleware for waiter role only (now allows waiter, manager, admin)
const authenticateWaiter = (req, res, next) => {
  authenticateUser(req, res, () => {
    console.log('[DEBUG] authenticateWaiter - decoded role:', req.user?.role);
    if (!['waiter', 'manager', 'admin'].includes(req.user?.role)) {
      console.log('[DEBUG] Access denied: user is not waiter/manager/admin but', req.user?.role);
      return res.status(403).json({ error: 'Access denied: Not authorized role for dine-in order' });
    }
    next();
  });
};

// Role Authorization Middleware, supports req.user and req.admin
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.admin?.role;
    console.log('[DEBUG] AuthorizeRole middleware on route with allowedRoles:', allowedRoles, '| Found role:', role);
    if (!allowedRoles.includes(role)) {
      console.log('[DEBUG] Access denied for role:', role, 'Expected one of:', allowedRoles);
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