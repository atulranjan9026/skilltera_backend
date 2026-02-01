const Job = require('../../../shared/models/job.model');
const Candidate = require('../models/candidate.model');
const ApiError = require('../../../shared/utils/ApiError');
const HTTP_STATUS = require('../../../shared/constants/httpStatus');

/**
 * Job Service
 * Handles business logic for job operations with pagination and ranking
 */

class JobService {
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

            // Apply filters
            if (options.jobTitle) {
                baseQuery.jobTitle = new RegExp(options.jobTitle, 'i');
            }

            if (options.location) {
                baseQuery.city = new RegExp(options.location, 'i');
            }

            if (options.jobType) {
                baseQuery.jobType = options.jobType;
            }

            if (options.experienceLevel) {
                baseQuery.experienceLevel = options.experienceLevel;
            }

            if (options.isRemote !== undefined) {
                // Old schema doesn't have remote field, skip for now
                // baseQuery.travelRequired = options.isRemote === 'true';
            }

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
            throw error;
        }
    }

    /**
     * Get job by ID
     * @param {string} jobId - Job ID
     * @returns {Object} Job details
     */
    async getJobById(jobId) {
        const job = await Job.findById(jobId)
            .populate('requiredSkills.skillId', 'name category')
            .populate('optionalSkills.skillId', 'name category')
            .lean();

        if (!job) {
            throw ApiError.notFound('Job not found');
        }

        return job;
    }

    /**
     * Increment job view count
     * @param {string} jobId - Job ID
     */
    async incrementJobViews(jobId) {
        await Job.findByIdAndUpdate(
            jobId,
            { $inc: { views: 1 } },
            { new: true }
        );
    }

    /**
     * Search jobs with text query
     * @param {string} query - Search query
     * @param {Object} options - Pagination options
     * @returns {Object} Search results with pagination
     */
    async searchJobs(query, options = {}) {
        const page = Math.max(1, parseInt(options.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(options.limit) || 10));
        const skip = (page - 1) * limit;

        const searchQuery = {
            $text: { $search: query },
            isActive: true,
            status: 'active'
        };

        const [jobs, total] = await Promise.all([
            Job.find(searchQuery)
                .select('title description companyName location salary jobType postedDate')
                .sort({ score: { $meta: 'textScore' }, postedDate: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Job.countDocuments(searchQuery)
        ]);

        const pagination = this.calculatePagination(page, limit, total);

        return { jobs, pagination };
    }
}

module.exports = new JobService();
