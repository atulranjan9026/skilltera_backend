/**
 * Password Generator Utility
 * Generates random 8-character alphanumeric passwords for new company users
 * (Hiring Managers, Interviewers, Recruiters, Backup HMs)
 */

/**
 * Generate a random 8-character alphanumeric password
 * @returns {string} Random 8-character alphanumeric string
 */
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  return password;
};

module.exports = {
  generatePassword,
};
