/**
 * auth.controller.js
 * Re-exports from company.controller to avoid duplication.
 * The canonical login/signup implementation lives in company.controller.js.
 */
const { companyLogin, companySignup } = require('./companies.controller');

exports.companyLogin = companyLogin;
exports.companySignup = companySignup;
