const bcrypt = require('bcrypt');
const LOB = require('../models/lob.model');
const CompanyUser = require('../models/companyUser.model');
const HiringManager = require('../models/hiringManager.model');
const BackupHiringManager = require('../models/backupHiringManager.model');
const Recruiter = require('../models/recruiter.model');
const { validationResult } = require('express-validator');
const { generatePassword } = require('../../../shared/utilities/passwordGenerator');
const {
  sendHiringManagerWelcomeEmail,
  sendInterviewerWelcomeEmail,
  sendRecruiterWelcomeEmail,
  sendBackupHiringManagerWelcomeEmail,
} = require('../../../shared/utilities/companyEmails');

// ─── LOB Controllers ───────────────────────────────────────────────────────────

exports.getAllLOBs = async (req, res) => {
  try {
    const { companyId } = req.user;
    const lobs = await LOB.find({ companyId, isActive: true }).sort({ createdAt: -1 });
    res.json({ lobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch LOBs' });
  }
};

exports.createLOB = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId } = req.user;
    const { name, description } = req.body;

    // Check if LOB already exists for this company
    const existingLOB = await LOB.findOne({ name, companyId });
    if (existingLOB) {
      return res.status(400).json({ error: 'LOB with this name already exists' });
    }

    const lob = new LOB({
      name,
      description,
      companyId,
      createdBy: req.user._id
    });

    await lob.save();
    res.status(201).json({ message: 'LOB created successfully', lob });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create LOB' });
  }
};

exports.updateLOB = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { companyId } = req.user;
    const { id } = req.params;
    const { name, description } = req.body;

    const lob = await LOB.findOne({ _id: id, companyId, isActive: true });
    if (!lob) {
      return res.status(404).json({ error: 'LOB not found' });
    }

    // Check if name is being changed and if it already exists
    if (name !== lob.name) {
      const existingLOB = await LOB.findOne({ name, companyId, _id: { $ne: id } });
      if (existingLOB) {
        return res.status(400).json({ error: 'LOB with this name already exists' });
      }
    }

    lob.name = name || lob.name;
    lob.description = description || lob.description;
    await lob.save();

    res.json({ message: 'LOB updated successfully', lob });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update LOB' });
  }
};

exports.deleteLOB = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const lob = await LOB.findOne({ _id: id, companyId, isActive: true });
    if (!lob) {
      return res.status(404).json({ error: 'LOB not found' });
    }

    lob.isActive = false;
    await lob.save();

    res.json({ message: 'LOB deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete LOB' });
  }
};

exports.bulkCreateLOBs = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }

    const { companyId } = req.user;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        // Check if LOB already exists
        const existingLOB = await LOB.findOne({ name: item.name, companyId });
        if (existingLOB) {
          bulkErrors.push({ item, error: 'LOB with this name already exists' });
          continue;
        }

        const lob = new LOB({
          name: item.name,
          description: item.description,
          companyId,
          createdBy: req.user._id
        });

        await lob.save();
        results.push(lob);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create LOB' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length
    };

    res.status(201).json({ message: 'Bulk LOB creation completed', results, errors: bulkErrors, summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create LOBs in bulk' });
  }
};

// ─── Hiring Manager Controllers (CompanyUser with role hiring_manager) ─────────

exports.getAllHiringManagers = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const hiringManagers = await CompanyUser.find({
      companyId,
      roles: 'hiring_manager',
      isActive: true,
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ hiringManagers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hiring managers' });
  }
};

exports.createHiringManager = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { name, email } = req.body;
    const createdBy = req.user._id;

    const existingUser = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

    const hiringManager = await CompanyUser.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      companyId,
      roles: ['hiring_manager'],
      createdBy,
    });

    try {
      await sendHiringManagerWelcomeEmail(hiringManager.email, hiringManager.name, plainPassword);
    } catch (err) {
      console.error('Error sending hiring manager welcome email:', err);
    }

    const result = hiringManager.toObject();
    delete result.password;
    res.status(201).json({ message: 'Hiring manager created successfully', hiringManager: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hiring manager' });
  }
};

exports.updateHiringManager = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;
    const { name, email } = req.body;

    const hiringManager = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'hiring_manager',
      isActive: true,
    });
    if (!hiringManager) {
      return res.status(404).json({ error: 'Hiring manager not found' });
    }

    if (email && email !== hiringManager.email) {
      const existing = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      hiringManager.email = email.toLowerCase().trim();
    }
    if (name) hiringManager.name = name;
    await hiringManager.save();

    const result = hiringManager.toObject();
    delete result.password;
    res.json({ message: 'Hiring manager updated successfully', hiringManager: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hiring manager' });
  }
};

exports.deleteHiringManager = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;

    const hiringManager = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'hiring_manager',
      isActive: true,
    });
    if (!hiringManager) {
      return res.status(404).json({ error: 'Hiring manager not found' });
    }

    hiringManager.isActive = false;
    await hiringManager.save();

    res.json({ message: 'Hiring manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hiring manager' });
  }
};

exports.bulkCreateHiringManagers = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const createdBy = req.user._id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        const email = (item.email || '').toLowerCase().trim();
        const existingUser = await CompanyUser.findOne({ email });
        if (existingUser) {
          bulkErrors.push({ item, error: 'User with this email already exists' });
          continue;
        }

        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

        const hiringManager = await CompanyUser.create({
          name: item.name,
          email,
          password: hashedPassword,
          companyId,
          roles: ['hiring_manager'],
          createdBy,
        });

        try {
          await sendHiringManagerWelcomeEmail(hiringManager.email, hiringManager.name, plainPassword);
        } catch (err) {
          console.error('Error sending welcome email:', err);
        }

        const result = hiringManager.toObject();
        delete result.password;
        results.push(result);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create hiring manager' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length,
    };

    res.status(201).json({
      message: 'Bulk hiring manager creation completed',
      results,
      errors: bulkErrors,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hiring managers in bulk' });
  }
};

// ─── Interviewer Controllers (CompanyUser with role interviewer) ───────────────

exports.getAllInterviewers = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const interviewers = await CompanyUser.find({
      companyId,
      roles: 'interviewer',
      isActive: true,
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ interviewers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interviewers' });
  }
};

exports.createInterviewer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { name, email } = req.body;
    const createdBy = req.user._id;

    const existingUser = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

    const interviewer = await CompanyUser.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      companyId,
      roles: ['interviewer'],
      createdBy,
    });

    try {
      await sendInterviewerWelcomeEmail(interviewer.email, interviewer.name, plainPassword);
    } catch (err) {
      console.error('Error sending interviewer welcome email:', err);
    }

    const result = interviewer.toObject();
    delete result.password;
    res.status(201).json({ message: 'Interviewer created successfully', interviewer: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create interviewer' });
  }
};

exports.updateInterviewer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;
    const { name, email } = req.body;

    const interviewer = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'interviewer',
      isActive: true,
    });
    if (!interviewer) {
      return res.status(404).json({ error: 'Interviewer not found' });
    }

    if (email && email !== interviewer.email) {
      const existing = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      interviewer.email = email.toLowerCase().trim();
    }
    if (name) interviewer.name = name;
    await interviewer.save();

    const result = interviewer.toObject();
    delete result.password;
    res.json({ message: 'Interviewer updated successfully', interviewer: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update interviewer' });
  }
};

exports.deleteInterviewer = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;

    const interviewer = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'interviewer',
      isActive: true,
    });
    if (!interviewer) {
      return res.status(404).json({ error: 'Interviewer not found' });
    }

    interviewer.isActive = false;
    await interviewer.save();

    res.json({ message: 'Interviewer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete interviewer' });
  }
};

exports.bulkCreateInterviewers = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const createdBy = req.user._id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        const email = (item.email || '').toLowerCase().trim();
        const existingUser = await CompanyUser.findOne({ email });
        if (existingUser) {
          bulkErrors.push({ item, error: 'User with this email already exists' });
          continue;
        }

        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

        const interviewer = await CompanyUser.create({
          name: item.name,
          email,
          password: hashedPassword,
          companyId,
          roles: ['interviewer'],
          createdBy,
        });

        try {
          await sendInterviewerWelcomeEmail(interviewer.email, interviewer.name, plainPassword);
        } catch (err) {
          console.error('Error sending welcome email:', err);
        }

        const result = interviewer.toObject();
        delete result.password;
        results.push(result);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create interviewer' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length,
    };

    res.status(201).json({
      message: 'Bulk interviewer creation completed',
      results,
      errors: bulkErrors,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create interviewers in bulk' });
  }
};

// ─── Backup Hiring Manager Controllers ─────────────────────────────────────────

exports.getAllBackupHiringManagers = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const backupHiringManagers = await BackupHiringManager.find({ companyId, isActive: true })
      .select('-password')
      .populate('hiringManagerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ backupHiringManagers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch backup hiring managers' });
  }
};

exports.createBackupHiringManager = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { name, email, hiringManagerId } = req.body;
    const createdBy = req.user._id;

    const existingBHM = await BackupHiringManager.findOne({ email: email.toLowerCase().trim(), companyId, isActive: true });
    if (existingBHM) {
      return res.status(400).json({ error: 'Backup hiring manager with this email already exists' });
    }

    if (hiringManagerId) {
      const hm = await CompanyUser.findOne({ _id: hiringManagerId, companyId, roles: 'hiring_manager', isActive: true });
      if (!hm) {
        const legacyHm = await HiringManager.findOne({ _id: hiringManagerId, companyId, isActive: true });
        if (!legacyHm) {
          return res.status(400).json({ error: 'Invalid hiring manager' });
        }
      }
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

    const backupHiringManager = new BackupHiringManager({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      hiringManagerId,
      companyId,
      createdBy,
    });

    await backupHiringManager.save();
    await backupHiringManager.populate('hiringManagerId', 'name email');

    try {
      await sendBackupHiringManagerWelcomeEmail(backupHiringManager.email, backupHiringManager.name, plainPassword);
    } catch (err) {
      console.error('Error sending backup hiring manager welcome email:', err);
    }

    const result = backupHiringManager.toObject();
    delete result.password;
    res.status(201).json({ message: 'Backup hiring manager created successfully', backupHiringManager: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup hiring manager' });
  }
};

exports.updateBackupHiringManager = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;
    const { name, email, hiringManagerId } = req.body;

    const backupHiringManager = await BackupHiringManager.findOne({ _id: id, companyId, isActive: true });
    if (!backupHiringManager) {
      return res.status(404).json({ error: 'Backup hiring manager not found' });
    }

    if (email && email !== backupHiringManager.email) {
      const existingBHM = await BackupHiringManager.findOne({ email: email.toLowerCase().trim(), companyId, _id: { $ne: id }, isActive: true });
      if (existingBHM) {
        return res.status(400).json({ error: 'Backup hiring manager with this email already exists' });
      }
      backupHiringManager.email = email.toLowerCase().trim();
    }

    if (hiringManagerId) {
      const hm = await CompanyUser.findOne({ _id: hiringManagerId, companyId, roles: 'hiring_manager', isActive: true });
      if (!hm) {
        const legacyHm = await HiringManager.findOne({ _id: hiringManagerId, companyId, isActive: true });
        if (!legacyHm) {
          return res.status(400).json({ error: 'Invalid hiring manager' });
        }
      }
      backupHiringManager.hiringManagerId = hiringManagerId;
    }

    if (name) backupHiringManager.name = name;
    await backupHiringManager.save();
    await backupHiringManager.populate('hiringManagerId', 'name email');

    const result = backupHiringManager.toObject();
    delete result.password;
    res.json({ message: 'Backup hiring manager updated successfully', backupHiringManager: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update backup hiring manager' });
  }
};

exports.deleteBackupHiringManager = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;

    const backupHiringManager = await BackupHiringManager.findOne({ _id: id, companyId, isActive: true });
    if (!backupHiringManager) {
      return res.status(404).json({ error: 'Backup hiring manager not found' });
    }

    backupHiringManager.isActive = false;
    await backupHiringManager.save();

    res.json({ message: 'Backup hiring manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete backup hiring manager' });
  }
};

// ─── Recruiter Controllers (CompanyUser with role recruiter) ─────────────────────

exports.getAllRecruiters = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const recruiters = await CompanyUser.find({
      companyId,
      roles: 'recruiter',
      isActive: true,
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ recruiters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruiters' });
  }
};

exports.createRecruiter = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { name, email, keySkills } = req.body;
    const createdBy = req.user._id;

    const existingUser = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

    const keySkillsArr = Array.isArray(keySkills)
      ? keySkills
      : typeof keySkills === 'string'
        ? keySkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    const recruiter = await CompanyUser.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      companyId,
      roles: ['recruiter'],
      keySkills: keySkillsArr,
      createdBy,
    });

    try {
      await sendRecruiterWelcomeEmail(recruiter.email, recruiter.name, plainPassword);
    } catch (err) {
      console.error('Error sending recruiter welcome email:', err);
    }

    const result = recruiter.toObject();
    delete result.password;
    res.status(201).json({ message: 'Recruiter created successfully', recruiter: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recruiter' });
  }
};

exports.updateRecruiter = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;
    const { name, email, keySkills } = req.body;

    const recruiter = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'recruiter',
      isActive: true,
    });
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    if (email && email !== recruiter.email) {
      const existing = await CompanyUser.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      recruiter.email = email.toLowerCase().trim();
    }
    if (name) recruiter.name = name;
    if (keySkills !== undefined) {
      recruiter.keySkills = Array.isArray(keySkills)
        ? keySkills
        : typeof keySkills === 'string'
          ? keySkills.split(',').map((s) => s.trim()).filter(Boolean)
          : recruiter.keySkills;
    }
    await recruiter.save();

    const result = recruiter.toObject();
    delete result.password;
    res.json({ message: 'Recruiter updated successfully', recruiter: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recruiter' });
  }
};

exports.deleteRecruiter = async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user._id;
    const { id } = req.params;

    const recruiter = await CompanyUser.findOne({
      _id: id,
      companyId,
      roles: 'recruiter',
      isActive: true,
    });
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    recruiter.isActive = false;
    await recruiter.save();

    res.json({ message: 'Recruiter deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recruiter' });
  }
};

exports.bulkCreateRecruiters = async (req, res) => {
  try {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      return res.status(400).json({ errors: validationErrors.array() });
    }

    const companyId = req.user.companyId || req.user._id;
    const createdBy = req.user._id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        const email = (item.email || '').toLowerCase().trim();
        const existingUser = await CompanyUser.findOne({ email });
        if (existingUser) {
          bulkErrors.push({ item, error: 'User with this email already exists' });
          continue;
        }

        const plainPassword = generatePassword();
        const hashedPassword = await bcrypt.hash(plainPassword, await bcrypt.genSalt());

        const keySkillsArr = item.keySkills
          ? (typeof item.keySkills === 'string'
            ? item.keySkills.split(',').map((s) => s.trim()).filter(Boolean)
            : Array.isArray(item.keySkills) ? item.keySkills : [])
          : [];

        const recruiter = await CompanyUser.create({
          name: item.name,
          email,
          password: hashedPassword,
          companyId,
          roles: ['recruiter'],
          keySkills: keySkillsArr,
          createdBy,
        });

        try {
          await sendRecruiterWelcomeEmail(recruiter.email, recruiter.name, plainPassword);
        } catch (err) {
          console.error('Error sending welcome email:', err);
        }

        const result = recruiter.toObject();
        delete result.password;
        results.push(result);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create recruiter' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length,
    };

    res.status(201).json({
      message: 'Bulk recruiter creation completed',
      results,
      errors: bulkErrors,
      summary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recruiters in bulk' });
  }
};
