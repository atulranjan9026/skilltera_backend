/**
 * Company User Email Utilities
 * Welcome emails and job assignment emails for Hiring Managers, Interviewers,
 * Recruiters, and Backup Hiring Managers.
 *
 * SECURITY NOTE: Temporary passwords are sent in plain text via email.
 * Risk: If email is compromised, the password is exposed.
 * Mitigations: (1) Encourage users to change password on first login (see email copy).
 * (2) Consider future enhancement: time-limited magic link instead of password.
 */

const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

const CLIENT_URL = process.env.CLIENT_URL || 'https://skilltera.com';
const COMPANY_LOGIN_URL = `${CLIENT_URL}/company/login`;
const CANDIDATE_LOGIN_URL = `${CLIENT_URL}/auth/login`;

/**
 * Send generic CompanyUser welcome email with credentials
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} password - Temporary password
 */
async function sendCompanyUserWelcomeEmail(email, name, password) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>Welcome to Skilltera! Your account has been created successfully.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>We recommend changing your password after your first login.</p>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Skilltera - Your Account',
      text: `Dear ${name}, Welcome to Skilltera! Your account has been created. Login at ${COMPANY_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending company user welcome email:', err);
    throw err;
  }
}

/**
 * Send Hiring Manager welcome email (account creation)
 * @param {string} email - Hiring manager email
 * @param {string} name - Hiring manager name
 * @param {string} password - Temporary password
 */
async function sendHiringManagerWelcomeEmail(email, name, password) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>Welcome to Skilltera! Your Hiring Manager account has been created successfully.</p>
    <p>You can now login to Skilltera and manage your hiring activities.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>Once logged in, you will be able to:</p>
    <ul>
      <li>View jobs assigned to you</li>
      <li>Assign interviewers to jobs</li>
      <li>Review candidate profiles and test scores</li>
      <li>Shortlist candidates for interviews</li>
    </ul>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Skilltera - Your Hiring Manager Account',
      text: `Dear ${name}, Welcome to Skilltera! Your Hiring Manager account has been created. Login at ${COMPANY_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending hiring manager welcome email:', err);
    throw err;
  }
}

/**
 * Send Interviewer welcome email (account creation)
 * @param {string} email - Interviewer email
 * @param {string} name - Interviewer name
 * @param {string} password - Temporary password
 */
async function sendInterviewerWelcomeEmail(email, name, password) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>Welcome to Skilltera! Your Interviewer account has been created successfully.</p>
    <p>You can now login to Skilltera and conduct interviews for assigned candidates.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>Once logged in, you will be able to:</p>
    <ul>
      <li>View interview tasks assigned to you</li>
      <li>Review candidate profiles and test results</li>
      <li>Submit interview feedback</li>
    </ul>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Skilltera - Your Interviewer Account',
      text: `Dear ${name}, Welcome to Skilltera! Your Interviewer account has been created. Login at ${COMPANY_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending interviewer welcome email:', err);
    throw err;
  }
}

/**
 * Send Recruiter welcome email (account creation)
 * @param {string} email - Recruiter email
 * @param {string} name - Recruiter name
 * @param {string} password - Temporary password
 */
async function sendRecruiterWelcomeEmail(email, name, password) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>Welcome to Skilltera! Your Recruiter account has been created successfully.</p>
    <p>You can now login to Skilltera and start referring candidates for jobs.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>Once logged in, you will be able to:</p>
    <ul>
      <li>View jobs assigned to you</li>
      <li>Refer candidates for jobs</li>
      <li>Track candidate progress</li>
      <li>View job requirements and key skills</li>
    </ul>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Skilltera - Your Recruiter Account',
      text: `Dear ${name}, Welcome to Skilltera! Your Recruiter account has been created. Login at ${COMPANY_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending recruiter welcome email:', err);
    throw err;
  }
}

/**
 * Send Backup Hiring Manager welcome email (account creation)
 * @param {string} email - Backup HM email
 * @param {string} name - Backup HM name
 * @param {string} password - Temporary password
 */
async function sendBackupHiringManagerWelcomeEmail(email, name, password) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>Welcome to Skilltera! Your Backup Hiring Manager account has been created successfully.</p>
    <p>You can now login to Skilltera and assist with hiring activities when needed.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>Once logged in, you will be able to:</p>
    <ul>
      <li>View jobs assigned to the Hiring Manager you support</li>
      <li>Assist with interviewer assignments</li>
      <li>Review candidate profiles and test scores</li>
      <li>Help with candidate shortlisting</li>
    </ul>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Skilltera - Your Backup Hiring Manager Account',
      text: `Dear ${name}, Welcome to Skilltera! Your Backup Hiring Manager account has been created. Login at ${COMPANY_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending backup hiring manager welcome email:', err);
    throw err;
  }
}

/**
 * Send job assignment email (no new credentials - user already has account)
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} jobTitle - Job title
 */
async function sendJobAssignmentEmail(email, name, jobTitle) {
  const html = `
    <h2>Dear ${name},</h2>
    <p>You have been assigned to the job "<b>${jobTitle}</b>" on Skilltera.</p>
    <p>Please login at <a href="${COMPANY_LOGIN_URL}">${COMPANY_LOGIN_URL}</a> with your existing credentials to view the job and manage candidates.</p>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: `Job Assignment: ${jobTitle}`,
      text: `Dear ${name}, You have been assigned to the job "${jobTitle}" on Skilltera. Login at ${COMPANY_LOGIN_URL} to view and manage.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending job assignment email:', err);
    throw err;
  }
}

/**
 * Notify new candidate when referred by recruiter (signup email with temp password)
 * @param {string} email - Candidate email
 * @param {string} candidateName - Candidate name
 * @param {string} password - Temporary password
 * @param {string} recruiterName - Recruiter name
 * @param {string} jobTitle - Job title
 * @param {string} connectionType - How recruiter knows candidate
 */
async function notifyNewCandidateRecruiterReferral(email, candidateName, password, recruiterName, jobTitle, connectionType) {
  const html = `
    <h2>Dear ${candidateName},</h2>
    <p><b>${recruiterName}</b> has referred you for a job opportunity at Skilltera.</p>
    <p>Job: <b>${jobTitle}</b></p>
    ${connectionType ? `<p>${recruiterName} mentioned they know you as: ${connectionType}</p>` : ''}
    <p>Your account has been created. Please login at <a href="${CANDIDATE_LOGIN_URL}">${CANDIDATE_LOGIN_URL}</a> with your email as <b>${email}</b> and password as "<b>${password}</b>".</p>
    <p>We recommend changing your password after your first login.</p>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: `You have been referred by ${recruiterName} for job opportunity: ${jobTitle}`,
      text: `Dear ${candidateName}, ${recruiterName} has referred you for ${jobTitle}. Login at ${CANDIDATE_LOGIN_URL} with email ${email} and password ${password}.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending new candidate recruiter referral email:', err);
    throw err;
  }
}

/**
 * Notify existing candidate when referred by recruiter
 * @param {string} email - Candidate email
 * @param {string} candidateName - Candidate name
 * @param {string} recruiterName - Recruiter name
 * @param {string} jobTitle - Job title
 * @param {string} companyId - Company ID (for context)
 */
async function notifyExistingCandidateRecruiterReferral(email, candidateName, recruiterName, jobTitle, companyId) {
  const html = `
    <h2>Dear ${candidateName},</h2>
    <p><b>${recruiterName}</b> has referred you for a new job opportunity on Skilltera.</p>
    <p>Job: <b>${jobTitle}</b></p>
    <p>Please login at <a href="${CANDIDATE_LOGIN_URL}">${CANDIDATE_LOGIN_URL}</a> with your existing credentials to view the job and apply.</p>
    <br><br>
    <h3>Regards,<br>The Skilltera Team</h3>
    <b>Hire Top Talents in Technology.</b>
  `;
  try {
    await emailService.sendEmail({
      to: email,
      subject: `You have been referred by ${recruiterName} for job: ${jobTitle}`,
      text: `Dear ${candidateName}, ${recruiterName} has referred you for ${jobTitle}. Login at ${CANDIDATE_LOGIN_URL} to view and apply.`,
      html,
    });
  } catch (err) {
    logger.error('Error sending existing candidate recruiter referral email:', err);
    throw err;
  }
}

module.exports = {
  sendCompanyUserWelcomeEmail,
  sendHiringManagerWelcomeEmail,
  sendInterviewerWelcomeEmail,
  sendRecruiterWelcomeEmail,
  sendBackupHiringManagerWelcomeEmail,
  sendJobAssignmentEmail,
  notifyNewCandidateRecruiterReferral,
  notifyExistingCandidateRecruiterReferral,
};
