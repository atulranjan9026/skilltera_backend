/**
 * Company Auth Middleware
 * Role-based access for CompanyUser (company_admin, hiring_manager, interviewer, recruiter)
 */

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const TokenManager = require('../utils/tokenManager');
const { ERROR_MESSAGES } = require('../constants');
const CompanyUser = require('../../features/Company/models/companyUser.model');
const Company = require('../models/company.model');
const HiringManager = require('../models/hiringManager.model');
const Interviewer = require('../models/interviewer.model');

/**
 * Require valid company JWT (Company or CompanyUser)
 * Attaches req.user, req.userId, req.companyId
 */
const requireCompanyAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
  }

  const token = authHeader.split(' ')[1];
  const decoded = TokenManager.verifyAccessToken(token);

  const { userId, role, isCompanyUser, companyId: tokenCompanyId } = decoded;

  let user = null;
  let companyId = null;

  if (isCompanyUser && userId) {
    user = await CompanyUser.findById(userId)
      .select('-password')
      .populate({ path: 'companyId', select: 'companyName email' });
    if (user) {
      companyId = user.companyId?._id || user.companyId;
      user.role = role;
      user.roles = decoded.roles || [];
      if (user.companyId && user.companyId._id) {
        user.companyName = user.companyId.companyName;
        user.companyId = user.companyId._id;
      }
    }
  }

  if (!user) {
    switch (role) {
      case 'company':
        user = await Company.findById(userId).select('-password');
        if (user) {
          companyId = user._id;
          user.companyId = user._id;
          user.companyName = user.companyName;
        }
        break;
      case 'hiring_manager':
        user = await HiringManager.findById(userId)
          .select('-password')
          .populate({ path: 'companyId', select: 'companyName email' });
        if (user && user.companyId) {
          companyId = user.companyId._id;
          user.companyName = user.companyId.companyName;
          user.companyId = user.companyId._id;
        }
        break;
      case 'interviewer':
        user = await Interviewer.findById(userId)
          .select('-password')
          .populate({ path: 'companyId', select: 'companyName email' });
        if (user && user.companyId) {
          companyId = user.companyId._id;
          user.companyName = user.companyId.companyName;
          user.companyId = user.companyId._id;
        }
        break;
      default:
        throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }
  } else {
    companyId = companyId || tokenCompanyId;
  }

  if (!user) {
    throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  req.user = user;
  req.userId = user._id;
  req.companyId = companyId || user.companyId;

  next();
});

/**
 * Require at least one of the given roles
 * @param {...string} roles - Allowed roles (company_admin, hiring_manager, interviewer, recruiter, or 'company' for legacy)
 */
const requireRole = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const userRoles = req.user.roles || [];
    const userRole = req.user.role || (userRoles.includes('company_admin') ? 'company' : userRoles[0]);

    const allowed = roles.includes(userRole) || roles.some((r) => userRoles.includes(r));
    if (!allowed) {
      throw ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN);
    }

    next();
  });
};

/**
 * Require company_admin role (full company access)
 */
const requireCompanyAdmin = requireRole('company', 'company_admin');

/**
 * Require hiring_manager role
 */
const requireHiringManager = requireRole('hiring_manager', 'company', 'company_admin');

/**
 * Require interviewer role
 */
const requireInterviewer = requireRole('interviewer', 'company', 'company_admin');

module.exports = {
  requireCompanyAuth,
  requireRole,
  requireCompanyAdmin,
  requireHiringManager,
  requireInterviewer,
};
