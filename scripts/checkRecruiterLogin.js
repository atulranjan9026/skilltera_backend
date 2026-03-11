#!/usr/bin/env node
/**
 * Diagnose recruiter login issues.
 * Usage: node scripts/checkRecruiterLogin.js "Bearta" beartajosh@gmail.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Company = require('../src/shared/models/company.model');
const CompanyUser = require('../src/features/Company/models/companyUser.model');

async function main() {
  const companyName = process.argv[2] || 'Bearta';
  const email = (process.argv[3] || 'beartajosh@gmail.com').toLowerCase().trim();

  await mongoose.connect(process.env.MONGO_URI);

  console.log('\n=== Recruiter Login Diagnostic ===\n');
  console.log('Looking for:', { companyName, email });

  // 1. Find company
  let company = await Company.findOne({ companyName });
  if (!company) {
    company = await Company.findOne({
      companyName: new RegExp(`^${companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
  }

  if (!company) {
    console.log('\n❌ Company not found with name:', companyName);
    const all = await Company.find({}).select('companyName email').lean();
    console.log('   Existing companies:', all.map((c) => c.companyName).join(', ') || '(none)');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('\n✓ Company found:', company.companyName, '(id:', company._id.toString() + ')');

  // 2. Find CompanyUser
  const user = await CompanyUser.findOne({
    email,
    companyId: company._id,
    isActive: true,
  });

  if (!user) {
    console.log('\n❌ No active CompanyUser with email', email, 'for this company');
    const anyWithEmail = await CompanyUser.find({ email }).select('email companyId roles isActive').populate('companyId', 'companyName').lean();
    if (anyWithEmail.length) {
      console.log('   Users with this email:', JSON.stringify(anyWithEmail, null, 2));
    }
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('✓ CompanyUser found:', user.name, '| roles:', user.roles?.join(', '));

  // 3. Test password (if provided)
  const password = process.argv[4];
  if (password) {
    const ok = await bcrypt.compare(password, user.password);
    console.log('\n' + (ok ? '✓' : '❌') + ' Password', ok ? 'matches' : 'does NOT match');
  } else {
    console.log('\n(Pass password as 4th arg to verify: node scripts/checkRecruiterLogin.js "Bearta" beartajosh@gmail.com "w0j1vD43")');
  }

  console.log('\n');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
