const Job = require('../../../shared/models/job.model');
const Company = require('../../../shared/models/company.model');
const Skill = require('../../candidates/models/skill.model');
const { validationResult } = require('express-validator');

/**
 * Job Controller
 * Handles all job-related operations for companies
 */

// Get all active skills for job creation
const getAllActiveSkills = async (req, res) => {
    try {
        const { search } = req.query;
        
        // Build query for active skills using existing model structure
        let query = { active: true };
        
        // Add search filter if provided
        if (search && search.trim()) {
            query.skill = {
                $regex: search.trim(),
                $options: 'i' // Case insensitive
            };
        }
        
        // Fetch skills from database using existing model
        const skills = await Skill.find(query)
            .select('_id skill')
            .sort({ skill: 1 })
            .limit(50); // Limit to 50 results for performance
        
        // Transform to match expected frontend format
        const transformedSkills = skills.map(skill => ({
            _id: skill._id,
            skillName: skill.skill,
            category: 'Technical', // Default category since existing model doesn't have it
            description: `${skill.skill} skill`
        }));
        
        res.status(200).json({
            success: true,
            message: 'Skills retrieved successfully',
            data: transformedSkills
        });
    } catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Create a new job posting
const createJob = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        // Debug logging
        console.log('User from auth middleware:', req.user);
        console.log('User role:', req.userRole);

        // Get company information from authenticated user
        const company = await Company.findById(req.user._id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Prepare job data with proper schema mapping
        const jobData = {
            title: req.body.title,
            description: req.body.description,
            companyId: company._id,
            companyName: company.companyName,
            
            // Job Details
            jobType: req.body.jobType,
            experienceLevel: req.body.experienceLevel || 'mid',
            minExperience: parseInt(req.body.minExperience) || 0,
            maxExperience: parseInt(req.body.maxExperience) || parseInt(req.body.minExperience) + 5 || 5,
            
            // Location
            location: {
                city: req.body.location?.city || '',
                state: req.body.location?.state || '',
                country: req.body.location?.country || '',
                isRemote: req.body.location?.isRemote || false,
                remoteType: req.body.location?.isRemote ? (req.body.location?.remoteType || 'fully-remote') : 'on-site'
            },
            
            // Salary
            salary: req.body.salary ? {
                min: parseFloat(req.body.salary.min),
                max: parseFloat(req.body.salary.max) || parseFloat(req.body.salary.min),
                currency: req.body.salary.currency || 'USD',
                period: req.body.salary.period || 'yearly'
            } : undefined,
            
            // Application Details
            applicationDeadline: req.body.applicationDeadline ? new Date(req.body.applicationDeadline) : null,
            openings: parseInt(req.body.openings) || 1,
            
            // Arrays
            benefits: req.body.benefits || [],
            responsibilities: req.body.responsibilities || [],
            qualifications: req.body.qualifications || [],
            tags: req.body.tags || [],
            category: req.body.category?.trim() || '',
            
            // Skills
            requiredSkills: req.body.requiredSkills || [],
            
            // Enterprise Assignment
            enterpriseAssignment: req.body.enterpriseAssignment ? {
                lobId: req.body.enterpriseAssignment.lobId || null,
                hiringManagerId: req.body.enterpriseAssignment.hiringManagerId || null,
                backupHiringManagerId: req.body.enterpriseAssignment.backupHiringManagerId || null,
                recruiterIds: req.body.enterpriseAssignment.recruiterIds || []
            } : undefined,

            // Metadata
            status: 'active',
            postedDate: new Date(),
            lastUpdated: new Date()
        };

        // Create new job
        const job = new Job(jobData);
        await job.save();

        res.status(201).json({
            success: true,
            message: 'Job created successfully',
            data: job
        });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all jobs for a company
const getCompanyJobs = async (req, res) => {
    try {
        const { companyId } = req.params;
        
        // Debug logging
        console.log('Fetching jobs for companyId:', companyId);
        console.log('Authenticated user:', req.user._id);
        
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const { page = 1, limit = 10, status, jobType } = req.query;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { companyId: companyId };
        if (status) filter.status = status;
        if (jobType) filter.jobType = jobType;

        console.log('Job filter:', filter);

        const jobs = await Job.find(filter)
            .sort({ postedDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('requiredSkills.skillId', 'name')
            .populate('optionalSkills.skillId', 'name');

        const total = await Job.countDocuments(filter);

        res.json({
            success: true,
            data: {
                jobs,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching company jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get a specific job by ID
const getJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(req.user._id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const job = await Job.findOne({ _id: id, companyId: company._id })
            .populate('requiredSkills.skillId', 'name')
            .populate('optionalSkills.skillId', 'name');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update a job
const updateJob = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const company = await Company.findById(req.user._id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const job = await Job.findOne({ _id: id, companyId: company._id });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Update job fields
        const { enterpriseAssignment, ...otherData } = req.body;
        Object.assign(job, otherData);
        
        if (enterpriseAssignment) {
            job.enterpriseAssignment = {
                ...job.enterpriseAssignment,
                ...enterpriseAssignment
            };
        }
        
        job.lastUpdated = new Date();

        await job.save();

        res.json({
            success: true,
            message: 'Job updated successfully',
            data: job
        });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Delete a job
const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(req.user._id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const job = await Job.findOne({ _id: id, companyId: company._id });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        await Job.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Job deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Toggle job status (active/inactive)
const toggleJobStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(req.user._id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const job = await Job.findOne({ _id: id, companyId: company._id });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        job.isActive = !job.isActive;
        job.lastUpdated = new Date();
        await job.save();

        res.json({
            success: true,
            message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`,
            data: job
        });
    } catch (error) {
        console.error('Error toggling job status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get job statistics for company dashboard
const getJobStats = async (req, res) => {
    try {
        const company = await Company.findById(req.user._id);

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        const stats = await Job.aggregate([
            { $match: { companyId: company._id } },
            {
                $group: {
                    _id: null,
                    totalJobs: { $sum: 1 },
                    activeJobs: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    },
                    totalApplications: { $sum: '$applicationsCount' },
                    recentJobs: {
                        $sum: {
                            $cond: [
                                { $gte: ['$postedDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const jobTypeStats = await Job.aggregate([
            { $match: { companyId: company._id, isActive: true } },
            {
                $group: {
                    _id: '$jobType',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = stats[0] || {
            totalJobs: 0,
            activeJobs: 0,
            totalApplications: 0,
            recentJobs: 0
        };

        res.json({
            success: true,
            data: {
                ...result,
                jobTypeStats
            }
        });
    } catch (error) {
        console.error('Error fetching job stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    getAllActiveSkills,
    createJob,
    getCompanyJobs,
    getJobById,
    updateJob,
    deleteJob,
    toggleJobStatus,
    getJobStats
};
