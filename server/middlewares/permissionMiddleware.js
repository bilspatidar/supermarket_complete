export function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { roles = [], permissions = [] } = req.user;

    // Super Admin has all permissions
    if (roles.includes('SUPER_ADMIN')) {
      return next();
    }

    if (permissions.includes(permissionName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires permission: "${permissionName}"`,
    });
  };
}

export function requireAnyPermission(permissionNames = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { roles = [], permissions = [] } = req.user;

    if (roles.includes('SUPER_ADMIN')) {
      return next();
    }

    const hasAny = permissionNames.some(p => permissions.includes(p));
    if (hasAny) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Requires one of: ${permissionNames.join(', ')}`,
    });
  };
}

export default {
  requirePermission,
  requireAnyPermission,
};
