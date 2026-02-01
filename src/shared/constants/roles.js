/**
 * User Roles
 */
const ROLES = {
    CANDIDATE: 'candidate',
    COMPANY: 'company',
    RECRUITER: 'recruiter',
    ADMIN: 'admin',
    HIRING_MANAGER: 'hiring_manager',
    INTERVIEWER: 'interviewer',
};

/**
 * Role Permissions
 */
const PERMISSIONS = {
    // Candidate permissions
    APPLY_JOB: 'apply_job',
    VIEW_JOBS: 'view_jobs',
    MANAGE_PROFILE: 'manage_profile',

    // Company permissions
    POST_JOB: 'post_job',
    VIEW_CANDIDATES: 'view_candidates',
    MANAGE_APPLICATIONS: 'manage_applications',

    // Admin permissions
    MANAGE_USERS: 'manage_users',
    MANAGE_SYSTEM: 'manage_system',
    VIEW_ANALYTICS: 'view_analytics',
};

/**
 * Role-Permission Mapping
 */
const ROLE_PERMISSIONS = {
    [ROLES.CANDIDATE]: [
        PERMISSIONS.APPLY_JOB,
        PERMISSIONS.VIEW_JOBS,
        PERMISSIONS.MANAGE_PROFILE,
    ],
    [ROLES.COMPANY]: [
        PERMISSIONS.POST_JOB,
        PERMISSIONS.VIEW_CANDIDATES,
        PERMISSIONS.MANAGE_APPLICATIONS,
    ],
    [ROLES.ADMIN]: Object.values(PERMISSIONS),
};

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
};
