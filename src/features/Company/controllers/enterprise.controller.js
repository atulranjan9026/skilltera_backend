const LOB = require('../models/lob.model');
const HiringManager = require('../models/hiringManager.model');
const BackupHiringManager = require('../models/backupHiringManager.model');
const Recruiter = require('../models/recruiter.model');
const { validationResult } = require('express-validator');

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
      createdBy: req.user.id
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
          createdBy: req.user.id
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

// ─── Hiring Manager Controllers ───────────────────────────────────────────────

exports.getAllHiringManagers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const hiringManagers = await HiringManager.find({ companyId, isActive: true })
      .sort({ createdAt: -1 });
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

    const { companyId } = req.user;
    const { name, email } = req.body;

    // Check if hiring manager already exists for this company
    const existingHM = await HiringManager.findOne({ email, companyId });
    if (existingHM) {
      return res.status(400).json({ error: 'Hiring manager with this email already exists' });
    }

    const hiringManager = new HiringManager({
      name,
      email,
      companyId,
      createdBy: req.user.id
    });

    await hiringManager.save();
    res.status(201).json({ message: 'Hiring manager created successfully', hiringManager });
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

    const { companyId } = req.user;
    const { id } = req.params;
    const { name, email } = req.body;

    const hiringManager = await HiringManager.findOne({ _id: id, companyId, isActive: true });
    if (!hiringManager) {
      return res.status(404).json({ error: 'Hiring manager not found' });
    }

    // Check if email is being changed and if it already exists
    if (email !== hiringManager.email) {
      const existingHM = await HiringManager.findOne({ email, companyId, _id: { $ne: id } });
      if (existingHM) {
        return res.status(400).json({ error: 'Hiring manager with this email already exists' });
      }
    }

    hiringManager.name = name || hiringManager.name;
    hiringManager.email = email || hiringManager.email;
    await hiringManager.save();

    res.json({ message: 'Hiring manager updated successfully', hiringManager });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hiring manager' });
  }
};

exports.deleteHiringManager = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const hiringManager = await HiringManager.findOne({ _id: id, companyId, isActive: true });
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

    const { companyId } = req.user;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        // Check if hiring manager already exists
        const existingHM = await HiringManager.findOne({ email: item.email, companyId });
        if (existingHM) {
          bulkErrors.push({ item, error: 'Hiring manager with this email already exists' });
          continue;
        }

        const hiringManager = new HiringManager({
          name: item.name,
          email: item.email,
          companyId,
          createdBy: req.user.id
        });

        await hiringManager.save();
        results.push(hiringManager);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create hiring manager' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length
    };

    res.status(201).json({ message: 'Bulk hiring manager creation completed', results, errors: bulkErrors, summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hiring managers in bulk' });
  }
};

// ─── Backup Hiring Manager Controllers ─────────────────────────────────────────

exports.getAllBackupHiringManagers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const backupHiringManagers = await BackupHiringManager.find({ companyId, isActive: true })
      .populate('hiringManagerId', 'name email')
      .sort({ createdAt: -1 });
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

    const { companyId } = req.user;
    const { name, email, hiringManagerId } = req.body;

    // Check if backup hiring manager already exists for this company
    const existingBHM = await BackupHiringManager.findOne({ email, companyId });
    if (existingBHM) {
      return res.status(400).json({ error: 'Backup hiring manager with this email already exists' });
    }

    // Validate hiring manager if provided
    if (hiringManagerId) {
      const hm = await HiringManager.findOne({ _id: hiringManagerId, companyId, isActive: true });
      if (!hm) {
        return res.status(400).json({ error: 'Invalid hiring manager' });
      }
    }

    const backupHiringManager = new BackupHiringManager({
      name,
      email,
      hiringManagerId,
      companyId,
      createdBy: req.user.id
    });

    await backupHiringManager.save();
    await backupHiringManager.populate('hiringManagerId', 'name email');

    res.status(201).json({ message: 'Backup hiring manager created successfully', backupHiringManager });
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

    const { companyId } = req.user;
    const { id } = req.params;
    const { name, email, hiringManagerId } = req.body;

    const backupHiringManager = await BackupHiringManager.findOne({ _id: id, companyId, isActive: true });
    if (!backupHiringManager) {
      return res.status(404).json({ error: 'Backup hiring manager not found' });
    }

    // Check if email is being changed and if it already exists
    if (email !== backupHiringManager.email) {
      const existingBHM = await BackupHiringManager.findOne({ email, companyId, _id: { $ne: id } });
      if (existingBHM) {
        return res.status(400).json({ error: 'Backup hiring manager with this email already exists' });
      }
    }

    // Validate hiring manager if provided
    if (hiringManagerId) {
      const hm = await HiringManager.findOne({ _id: hiringManagerId, companyId, isActive: true });
      if (!hm) {
        return res.status(400).json({ error: 'Invalid hiring manager' });
      }
    }

    backupHiringManager.name = name || backupHiringManager.name;
    backupHiringManager.email = email || backupHiringManager.email;
    backupHiringManager.hiringManagerId = hiringManagerId || backupHiringManager.hiringManagerId;
    await backupHiringManager.save();
    await backupHiringManager.populate('hiringManagerId', 'name email');

    res.json({ message: 'Backup hiring manager updated successfully', backupHiringManager });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update backup hiring manager' });
  }
};

exports.deleteBackupHiringManager = async (req, res) => {
  try {
    const { companyId } = req.user;
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

// ─── Recruiter Controllers ───────────────────────────────────────────────────────

exports.getAllRecruiters = async (req, res) => {
  try {
    const { companyId } = req.user;
    const recruiters = await Recruiter.find({ companyId, isActive: true })
      .sort({ createdAt: -1 });
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

    const { companyId } = req.user;
    const { name, email, keySkills } = req.body;

    // Check if recruiter already exists for this company
    const existingRecruiter = await Recruiter.findOne({ email, companyId });
    if (existingRecruiter) {
      // If recruiter exists but is not invited yet, send invitation
      if (!existingRecruiter.isInvited) {
        existingRecruiter.isInvited = true;
        await existingRecruiter.save();
        return res.status(200).json({ 
          message: 'Invitation sent to existing recruiter', 
          isExistingRecruiter: true,
          recruiter: existingRecruiter 
        });
      }
      return res.status(400).json({ error: 'Recruiter with this email already exists' });
    }

    const recruiter = new Recruiter({
      name,
      email,
      keySkills: keySkills || [],
      companyId,
      isInvited: true,
      createdBy: req.user.id
    });

    await recruiter.save();
    res.status(201).json({ message: 'Recruiter created successfully', recruiter });
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

    const { companyId } = req.user;
    const { id } = req.params;
    const { name, email, keySkills } = req.body;

    const recruiter = await Recruiter.findOne({ _id: id, companyId, isActive: true });
    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter not found' });
    }

    // Check if email is being changed and if it already exists
    if (email !== recruiter.email) {
      const existingRecruiter = await Recruiter.findOne({ email, companyId, _id: { $ne: id } });
      if (existingRecruiter) {
        return res.status(400).json({ error: 'Recruiter with this email already exists' });
      }
    }

    recruiter.name = name || recruiter.name;
    recruiter.email = email || recruiter.email;
    recruiter.keySkills = keySkills || recruiter.keySkills;
    await recruiter.save();

    res.json({ message: 'Recruiter updated successfully', recruiter });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recruiter' });
  }
};

exports.deleteRecruiter = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const recruiter = await Recruiter.findOne({ _id: id, companyId, isActive: true });
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

    const { companyId } = req.user;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    const results = [];
    const bulkErrors = [];

    for (const item of items) {
      try {
        // Check if recruiter already exists
        const existingRecruiter = await Recruiter.findOne({ email: item.email, companyId });
        if (existingRecruiter) {
          bulkErrors.push({ item, error: 'Recruiter with this email already exists' });
          continue;
        }

        const recruiter = new Recruiter({
          name: item.name,
          email: item.email,
          keySkills: item.keySkills ? item.keySkills.split(',').map(skill => skill.trim()).filter(skill => skill) : [],
          companyId,
          isInvited: true,
          createdBy: req.user.id
        });

        await recruiter.save();
        results.push(recruiter);
      } catch (error) {
        bulkErrors.push({ item, error: 'Failed to create recruiter' });
      }
    }

    const summary = {
      total: items.length,
      successful: results.length,
      failed: bulkErrors.length
    };

    res.status(201).json({ message: 'Bulk recruiter creation completed', results, errors: bulkErrors, summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recruiters in bulk' });
  }
};
