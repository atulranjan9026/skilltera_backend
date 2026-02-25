const Job = require('../../../shared/models/job.model');
const Candidate = require('../models/candidate.model');
const Application = require('../../../shared/models/application.model');
const Company = require('../../../shared/models/company.model');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

/**
 * Job Service
 * Handles business logic for job operations with pagination and ranking
 */

class JobService {
    /**
     * Convert work experience years to experience level
     * @param {number} years - Years of experience
     * @returns {string} Experience level
     */
    getExperienceLevel(years) {
        if (!years || years === 0) return 'Entry Level';
        if (years <= 2) return 'Entry Level';
        if (years <= 5) return 'Mid Level';
        if (years <= 8) return 'Senior Level';
        if (years <= 12) return 'Lead';
        return 'Director';
    }

    /**
     * Calculate pagination metadata
     * @param {number} page - Current page number
     * @param {number} limit - Items per page
     * @param {number} total - Total items count
     * @returns {Object} Pagination metadata
     */
    calculatePagination(page, limit, total) {
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return {
            currentPage: page,
            totalPages,
            totalJobs: total,
            limit,
            hasNextPage,
            hasPrevPage
        };
    }

    /**
     * Get ranked jobs for candidate with pagination
     * @param {string} candidateId - Candidate ID
     * @param {Object} options - Query options
     * @returns {Object} Jobs with pagination metadata
     */
    async getRankingJobs(candidateId, options = {}) {
        console.log(options)
        try {
            // Extract and validate pagination parameters
            const page = Math.max(1, parseInt(options.page) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(options.limit) || 10)); // Max 50 items per page
            const skip = (page - 1) * limit;

            // Get candidate skills for matching
            const candidate = await Candidate.findById(candidateId)
                .select('skills overallExperience currentCity country')
                .lean();

            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            // Extract candidate skill IDs
            const candidateSkillIds = candidate.skills?.map(s => s.skillId?.toString()) || [];

            // Build base query for active jobs
            const baseQuery = {
                active: true,
                status: 'APPROVED' // Only show approved jobs
                // Note: Old backend doesn't filter by status for general job listings
            };

            const jobTitleRegex = options.jobTitle ? new RegExp(options.jobTitle, 'i') : null;

            if (options.location) {
                // Search across city, state, and country fields
                baseQuery.$or = [
                    { city: new RegExp(options.location, 'i') },
                    { state: new RegExp(options.location, 'i') },
                    { country: new RegExp(options.location, 'i') }
                ];
            }

            if (options.postedWithin) {
                console.log('postedWithin option:', options.postedWithin);
                const daysAgo = new Date();
                daysAgo.setDate(daysAgo.getDate() - parseInt(options.postedWithin));
                console.log('Filtering postedOn >=', daysAgo);
                baseQuery.postedOn = { $gte: daysAgo };
            }

            if (options.jobType) {
                baseQuery.jobType = options.jobType;
            }

            if (options.experienceLevel) {
                const levels = Array.isArray(options.experienceLevel) ? options.experienceLevel : [options.experienceLevel];
                const conditions = levels.map(level => {
                    if (level.toLowerCase().includes('entry')) return { workExperience: { $lte: 2 } };
                    if (level.toLowerCase().includes('mid')) return { workExperience: { $gt: 2, $lte: 5 } };
                    if (level.toLowerCase().includes('senior')) return { workExperience: { $gt: 5, $lte: 8 } };
                    if (level.toLowerCase().includes('lead')) return { workExperience: { $gt: 8, $lte: 12 } };
                    if (level.toLowerCase().includes('director') || level.toLowerCase().includes('executive')) return { workExperience: { $gt: 12 } };
                    return { workExperience: { $gte: 0 } };
                });
                baseQuery.$or = conditions;
            }

            if (options.isRemote !== undefined) {
                // Old schema doesn't have remote field, skip for now
                // baseQuery.travelRequired = options.isRemote === 'true';
            }

            console.log('Final baseQuery before aggregation:', JSON.stringify(baseQuery, null, 2));

            // Salary filter - old schema doesn't have salary, skip for now
            // if (options.minSalary || options.maxSalary) {
            //     baseQuery['salary.min'] = {};
            //     if (options.minSalary) {
            //         baseQuery['salary.min'].$gte = parseInt(options.minSalary);
            //     }
            //     if (options.maxSalary) {
            //         baseQuery['salary.max'] = { $lte: parseInt(options.maxSalary) };
            //     }
            // }

            // Build aggregation pipeline for skill matching and scoring
            const pipeline = [
                { $match: baseQuery },
                {
                    $addFields: {
                        experience: {
                            $switch: {
                                branches: [
                                    { case: { $lte: ['$workExperience', 2] }, then: 'Entry Level' },
                                    { case: { $lte: ['$workExperience', 5] }, then: 'Mid Level' },
                                    { case: { $lte: ['$workExperience', 8] }, then: 'Senior Level' },
                                    { case: { $lte: ['$workExperience', 12] }, then: 'Lead' }
                                ],
                                default: 'Director'
                            }
                        }
                    }
                },
                ...(options.experienceLevel ? [{}] : []),
                {
                    $lookup: {
                        from: 'companies',
                        let: { companyIdStr: '$companyId' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            { $toString: '$_id' },
                                            '$$companyIdStr'
                                        ]
                                    }
                                }
                            },
                            { $project: { companyName: 1 } }
                        ],
                        as: 'companyInfo'
                    }
                },
                {
                    $addFields: {
                        companyName: {
                            $ifNull: [
                                { $arrayElemAt: ['$companyInfo.companyName', 0] },
                                '$companyName'
                            ]
                        }
                    }
                },
                ...(jobTitleRegex ? [{
                    $match: {
                        $or: [
                            { title: jobTitleRegex },
                            { jobTitle: jobTitleRegex },
                            { companyName: jobTitleRegex }
                        ]
                    }
                }] : []),

                // Add skill match score
                {
                    $addFields: {
                        skillRequired: { $ifNull: ['$skillRequired', []] },
                        totalRequiredSkills: { $size: { $ifNull: ['$skillRequired', []] } }
                    }
                },
                {
                    $addFields: {
                        skillMatchCount: {
                            $size: {
                                $filter: {
                                    input: { $ifNull: ['$skillRequired', []] },
                                    as: 'skill',
                                    cond: {
                                        $in: [
                                            { $toString: '$$skill.skillId' },
                                            candidateSkillIds
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },

                // Calculate match percentage
                {
                    $addFields: {
                        matchPercentage: {
                            $cond: {
                                if: { $gt: ['$totalRequiredSkills', 0] },
                                then: {
                                    $multiply: [
                                        { $divide: ['$skillMatchCount', '$totalRequiredSkills'] },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    }
                },

                // Experience match score
                {
                    $addFields: {
                        experienceMatch: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gte: [candidate.overallExperience || 0, '$workExperience'] },
                                        { $lte: [candidate.overallExperience || 0, '$workExperience'] }
                                    ]
                                },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                },

                // Calculate overall match score
                {
                    $addFields: {
                        matchScore: {
                            $add: [
                                { $multiply: ['$matchPercentage', 0.7] }, // 70% weight on skills
                                { $multiply: ['$experienceMatch', 30] }    // 30% weight on experience
                            ]
                        }
                    }
                },

                // Sort by match score and posted date
                {
                    $sort: {
                        matchScore: -1,
                        postedOn: -1
                    }
                },

                // Get total count before pagination
                {
                    $facet: {
                        metadata: [{ $count: 'total' }],
                        jobs: [
                            { $skip: skip },
                            { $limit: limit },
                            {
                                $lookup: {
                                    from: 'companies',
                                    let: { companyIdStr: '$companyId' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: [
                                                        { $toString: '$_id' },
                                                        '$$companyIdStr'
                                                    ]
                                                }
                                            }
                                        }
                                    ],
                                    as: 'companyInfo'
                                }
                            },
                            {
                                $lookup: {
                                    from: 'skills',
                                    let: { skillIds: '$skillRequired.skillId', skillRequired: '$skillRequired' },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $in: [
                                                        { $toString: '$_id' },
                                                        '$$skillIds'
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            $addFields: {
                                                rating: {
                                                    $let: {
                                                        vars: {
                                                            matchedSkill: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: '$$skillRequired',
                                                                            as: 'req',
                                                                            cond: {
                                                                                $eq: [
                                                                                    { $toString: '$$req.skillId' },
                                                                                    { $toString: '$_id' }
                                                                                ]
                                                                            }
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        },
                                                        in: '$$matchedSkill.rating'
                                                    }
                                                },
                                                requiredExperience: {
                                                    $let: {
                                                        vars: {
                                                            matchedSkill: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: '$$skillRequired',
                                                                            as: 'req',
                                                                            cond: {
                                                                                $eq: [
                                                                                    { $toString: '$$req.skillId' },
                                                                                    { $toString: '$_id' }
                                                                                ]
                                                                            }
                                                                        }
                                                                    },
                                                                    0
                                                                ]
                                                            }
                                                        },
                                                        in: '$$matchedSkill.requiredExperience'
                                                    }
                                                }
                                            }
                                        }
                                    ],
                                    as: 'skillDetails'
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    jobId: 1,
                                    jobTitle: 1,
                                    jobDescription: 1,
                                    companyId: 1,
                                    jobType: 1,
                                    workExperience: 1,
                                    experience: {
                                        $switch: {
                                            branches: [
                                                { case: { $lte: ['$workExperience', 2] }, then: 'Entry Level' },
                                                { case: { $lte: ['$workExperience', 5] }, then: 'Mid Level' },
                                                { case: { $lte: ['$workExperience', 8] }, then: 'Senior Level' },
                                                { case: { $lte: ['$workExperience', 12] }, then: 'Lead' }
                                            ],
                                            default: 'Director'
                                        }
                                    },
                                    city: 1,
                                    state: 1,
                                    country: 1,
                                    postedOn: 1,
                                    lastDate: 1,
                                    jobRole: 1,
                                    matchScore: 1,
                                    matchPercentage: 1,
                                    skillMatchCount: 1,
                                    totalRequiredSkills: 1,
                                    skillDetails: 1,
                                    openings: 1,
                                    applicationsCount: 1,
                                    companyName: {
                                        $ifNull: [
                                            { $arrayElemAt: ['$companyInfo.companyName', 0] },
                                            { $ifNull: ['$companyName', 'Unknown Company'] }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                }
            ];

            // Execute aggregation
            const result = await Job.aggregate(pipeline);

            const total = result[0]?.metadata[0]?.total || 0;
            const jobs = result[0]?.jobs || [];

            // Calculate pagination metadata
            const pagination = this.calculatePagination(page, limit, total);

            return {
                jobs,
                pagination
            };

        } catch (error) {
            console.error('Error in getRankingJobs:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Suggest job titles and company names
     * @param {string} query - Partial query
     * @param {number} limit - Max suggestions
     */
    async getJobSuggestions(query, limit = 8) {
        const search = query.trim();
        if (!search) return [];

        const regex = new RegExp(search, 'i');

        const results = await Job.aggregate([
            {
                $match: {
                    $and: [
                        { $or: [{ isActive: true }, { active: true }, { isActive: { $exists: false } }, { active: { $exists: false } }] },
                        { $or: [{ status: 'active' }, { status: 'APPROVED' }, { status: { $exists: false } }] }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'companies',
                    let: { companyIdStr: '$companyId' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        { $toString: '$_id' },
                                        '$$companyIdStr'
                                    ]
                                }
                            }
                        },
                        {
                            $project: { companyName: 1 }
                        }
                    ],
                    as: 'companyInfo'
                }
            },
            {
                $addFields: {
                    companyName: {
                        $ifNull: [
                            { $arrayElemAt: ['$companyInfo.companyName', 0] },
                            '$companyName'
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [{ title: regex }, { jobTitle: regex }, { companyName: regex }]
                }
            },
            {
                $project: {
                    title: 1,
                    jobTitle: 1,
                    companyName: 1
                }
            },
            {
                $facet: {
                    titles: [
                        { $match: { $or: [{ title: regex }, { jobTitle: regex }] } },
                        { $group: { _id: { $ifNull: ['$jobTitle', '$title'] } } },
                        { $limit: limit }
                    ],
                    companies: [
                        { $match: { companyName: regex } },
                        { $group: { _id: '$companyName' } },
                        { $limit: limit }
                    ]
                }
            }
        ]);

        const titles = results[0]?.titles?.map(item => item._id) || [];
        const companies = results[0]?.companies?.map(item => item._id) || [];

        return { titles, companies };
    }

    /**
     * Suggest locations by state/country
     * @param {string} query - Partial query
     * @param {number} limit - Max suggestions
     */
    async getLocationSuggestions(query, limit = 8) {
        const search = query.trim();
        if (!search) return [];

        const regex = new RegExp(search, 'i');

        const results = await Job.aggregate([
            {
                $match: {
                    $and: [
                        { $or: [{ isActive: true }, { active: true }, { isActive: { $exists: false } }, { active: { $exists: false } }] },
                        { $or: [{ status: 'active' }, { status: 'APPROVED' }, { status: { $exists: false } }] }
                    ],
                    $or: [
                        { 'location.state': regex },
                        { 'location.country': regex },
                        { state: regex },
                        { country: regex },
                        { city: regex }
                    ]
                }
            },
            {
                $project: {
                    city: { $ifNull: ['$location.city', '$city'] },
                    state: { $ifNull: ['$location.state', '$state'] },
                    country: { $ifNull: ['$location.country', '$country'] }
                }
            },
            {
                $facet: {
                    cities: [
                        { $match: { city: regex } },
                        { $group: { _id: '$city' } },
                        { $limit: limit }
                    ],
                    states: [
                        { $match: { state: regex } },
                        { $group: { _id: '$state' } },
                        { $limit: limit }
                    ],
                    countries: [
                        { $match: { country: regex } },
                        { $group: { _id: '$country' } },
                        { $limit: limit }
                    ]
                }
            }
        ]);

        const cities = results[0]?.cities?.map(item => item._id).filter(Boolean) || [];
        const states = results[0]?.states?.map(item => item._id).filter(Boolean) || [];
        const countries = results[0]?.countries?.map(item => item._id).filter(Boolean) || [];

        return { cities, states, countries };
    }

    /**
     * Apply for a job
     * @param {string} candidateId - Candidate ID
     * @param {string} jobId - Job ID
     * @param {Object} applicationData - Application details (coverLetter, resume etc)
     * @returns {Object} Created application
     */
    async applyForJob(candidateId, jobId, applicationData = {}) {
        try {
            // 1. Validate job existence and status
            const job = await Job.findById(jobId);
            if (!job || job.status !== 'APPROVED') {
                throw ApiError.badRequest('This job is no longer accepting applications');
            }

            // 2. Validate candidate
            const candidate = await Candidate.findById(candidateId);
            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            // 3. Create application
            // Use unique index in MongoDB to handle duplicate prevention (code 11000)
            const application = await Application.create({
                candidate: candidateId,
                job: jobId,
                coverLetter: applicationData.coverLetter,
                resume: applicationData.resume || candidate.resume,
                status: 'applied',
                appliedAt: applicationData.appliedAt || new Date()
            });

            // 4. Increment job application count
            await job.incrementApplications();

            return application;
        } catch (error) {
            console.error('Error in applyForJob:', error);
            if (error.code === 11000) { // MongoDB duplicate key error
                throw ApiError.badRequest('You have already applied for this job');
            }
            throw error;
        }
    }

    /**
     * Save a job for candidate
     * @param {string} candidateId - Candidate ID
     * @param {string} jobId - Job ID
     * @returns {Object} Updated candidate with saved jobs
     */
    async saveJob(candidateId, jobId) {
        try {
            // Validate job exists
            const job = await Job.findById(jobId);
            if (!job) {
                throw ApiError.notFound('Job not found');
            }

            // Add job to saved jobs (avoid duplicates with $addToSet)
            const candidate = await Candidate.findByIdAndUpdate(
                candidateId,
                { $addToSet: { savedJobs: jobId } },
                { new: true }
            ).populate('savedJobs');

            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            return candidate;
        } catch (error) {
            console.error('Error in saveJob:', error);
            if (error.code === 11000) {
                throw ApiError.badRequest('Job already saved');
            }
            throw error;
        }
    }

    /**
     * Unsave a job for candidate
     * @param {string} candidateId - Candidate ID
     * @param {string} jobId - Job ID
     * @returns {Object} Updated candidate
     */
    async unsaveJob(candidateId, jobId) {
        try {
            // Remove job from saved jobs
            const candidate = await Candidate.findByIdAndUpdate(
                candidateId,
                { $pull: { savedJobs: jobId } },
                { new: true }
            ).populate('savedJobs');

            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            return candidate;
        } catch (error) {
            console.error('Error in unsaveJob:', error);
            throw error;
        }
    }

    /**
     * Get saved jobs for candidate
     * @param {string} candidateId - Candidate ID
     * @param {Object} options - Query options (page, limit)
     * @returns {Object} Saved jobs with pagination
     */
    async getSavedJobs(candidateId, options = {}) {
        try {
            const page = Math.max(1, parseInt(options.page) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(options.limit) || 10));
            const skip = (page - 1) * limit;

            // Get candidate and count total saved jobs
            const candidate = await Candidate.findById(candidateId);
            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            const total = candidate.savedJobs.length;

            // Get paginated saved jobs with full details
            const savedJobs = await Candidate.findById(candidateId)
                .select('savedJobs')
                .populate({
                    path: 'savedJobs',
                    select: 'jobTitle title description city state country jobType workExperience postedOn salary companyId',
                    populate: {
                        path: 'companyId',
                        select: 'companyName'
                    }
                })
                .lean();

            // Apply pagination on the frontend since populate doesn't handle skip/limit properly with lean
            const paginatedJobs = savedJobs.savedJobs
                ? savedJobs.savedJobs.slice(skip, skip + limit)
                : [];

            // Calculate pagination
            const pagination = this.calculatePagination(page, limit, total);

            return {
                jobs: paginatedJobs,
                pagination
            };
        } catch (error) {
            console.error('Error in getSavedJobs:', error);
            throw error;
        }
    }

    /**
     * Get applications for candidate
     * @param {string} candidateId - Candidate ID
     * @param {Object} options - Query options (page, limit, status)
     * @returns {Object} Applications with pagination
     */
    async getApplications(candidateId, options = {}) {
        try {
            const page = Math.max(1, parseInt(options.page) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(options.limit) || 10));
            const skip = (page - 1) * limit;

            const candidate = await Candidate.findById(candidateId);
            if (!candidate) {
                throw ApiError.notFound('Candidate not found');
            }

            // Build query
            const query = { candidate: candidateId };
            if (options.status) {
                query.status = options.status;
            }

            // Get total count
            const total = await Application.countDocuments(query);

            // Get paginated applications with job details
            const applications = await Application.find(query)
                .populate({
                    path: 'job',
                    select: 'jobTitle title description city state country jobType workExperience postedOn salary companyId',
                    populate: {
                        path: 'companyId',
                        select: 'companyName'
                    }
                })
                .sort({ appliedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Calculate pagination
            const pagination = this.calculatePagination(page, limit, total);

            return {
                applications,
                pagination
            };
        } catch (error) {
            console.error('Error in getApplications:', error);
            throw error;
        }
    }

}

module.exports = new JobService();
