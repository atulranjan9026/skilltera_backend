const Joi = require('joi');



/**

 * Validation schemas for profile endpoints

 */



// Update profile validation

const updateProfileSchema = Joi.object({

    name: Joi.string().min(2).max(100).optional(),

    phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),

    bio: Joi.string().max(500).optional(),

    currentRole: Joi.string().max(100).optional(),

    experience: Joi.number().min(0).max(50).optional(),

    noticePeriod: Joi.number().min(0).max(365).optional(),



    location: Joi.object({

        city: Joi.string().optional(),

        state: Joi.string().optional(),

        country: Joi.string().optional(),

    }).optional(),



    expectedSalary: Joi.alternatives()

        .try(

            Joi.object({

                min: Joi.number().min(0).optional(),

                max: Joi.number().min(0).optional(),

                currency: Joi.string().optional(),

            }),

            Joi.number().min(0),

            Joi.string()

        )

        .optional(),



    dateOfBirth: Joi.date().max('now').optional(),

    gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),

});



// Add skill validation

const addSkillSchema = Joi.object({

    skillId: Joi.string()

        .required()

        .messages({

            'string.empty': 'Skill is required',

        }),



    rating: Joi.number()

        .min(1)

        .max(5)

        .default(5)

        .messages({

            'number.min': 'Rating must be at least 1',

            'number.max': 'Rating cannot exceed 5',

        }),



    experience: Joi.number()

        .min(0)

        .default(0)

        .messages({

            'number.min': 'Experience years cannot be negative',

        }),

});



// Update skill validation

const updateSkillSchema = Joi.object({

    rating: Joi.number().min(1).max(5).optional(),

    experience: Joi.number().min(0).optional(),

});



// Add experience validation

const addExperienceSchema = Joi.object({

    company: Joi.string()

        .required()

        .messages({

            'string.empty': 'Company name is required',

        }),



    position: Joi.string()

        .required()

        .messages({

            'string.empty': 'Position is required',

        }),



    location: Joi.object({

        city: Joi.string().optional(),

        state: Joi.string().optional(),

        country: Joi.string().optional(),

    }).optional(),



    employmentType: Joi.string()

        .valid('full-time', 'part-time', 'contract', 'internship', 'freelance')

        .default('full-time'),



    startDate: Joi.date()

        .required()

        .messages({

            'date.base': 'Start date is required',

        }),



    endDate: Joi.date()

        .min(Joi.ref('startDate'))

        .when('isCurrentlyWorking', {

            is: false,

            then: Joi.required(),

            otherwise: Joi.optional(),

        })

        .messages({

            'date.min': 'End date must be after start date',

        }),



    isCurrentlyWorking: Joi.boolean().default(false),

    description: Joi.string().max(1000).optional(),

    responsibilities: Joi.array().items(Joi.string()).optional(),

    achievements: Joi.array().items(Joi.string()).optional(),

    skills: Joi.array().items(Joi.string()).optional(),

});



// Update experience validation

const updateExperienceSchema = Joi.object({

    company: Joi.string().optional(),

    position: Joi.string().optional(),

    location: Joi.object({

        city: Joi.string().optional(),

        state: Joi.string().optional(),

        country: Joi.string().optional(),

    }).optional(),

    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'freelance').optional(),

    startDate: Joi.date().optional(),

    endDate: Joi.date().optional(),

    isCurrentlyWorking: Joi.boolean().optional(),

    description: Joi.string().max(1000).optional(),

    responsibilities: Joi.array().items(Joi.string()).optional(),

    achievements: Joi.array().items(Joi.string()).optional(),

    skills: Joi.array().items(Joi.string()).optional(),

});



// Add education validation

const addEducationSchema = Joi.object({

    institution: Joi.string()

        .required()

        .messages({

            'string.empty': 'Institution name is required',

        }),



    degree: Joi.string()

        .required()

        .messages({

            'string.empty': 'Degree is required',

        }),



    fieldOfStudy: Joi.string()

        .required()

        .messages({

            'string.empty': 'Field of study is required',

        }),



    location: Joi.object({

        city: Joi.string().optional(),

        state: Joi.string().optional(),

        country: Joi.string().optional(),

    }).optional(),



    startDate: Joi.date()

        .required()

        .messages({

            'date.base': 'Start date is required',

        }),



    endDate: Joi.date()

        .min(Joi.ref('startDate'))

        .when('isCurrentlyStudying', {

            is: false,

            then: Joi.required(),

            otherwise: Joi.optional(),

        }),



    isCurrentlyStudying: Joi.boolean().default(false),

    grade: Joi.string().optional(),

    description: Joi.string().max(500).optional(),

    activities: Joi.array().items(Joi.string()).optional(),

});



// Add certificate validation

const addCertificateSchema = Joi.object({

    name: Joi.string()

        .required()

        .messages({

            'string.empty': 'Certificate name is required',

        }),



    issuingOrganization: Joi.string()

        .required()

        .messages({

            'string.empty': 'Issuing organization is required',

        }),



    issueDate: Joi.date()

        .required()

        .messages({

            'date.base': 'Issue date is required',

        }),



    expiryDate: Joi.date().min(Joi.ref('issueDate')).optional(),

    credentialId: Joi.string().optional(),

    credentialUrl: Joi.string().uri().optional(),

    description: Joi.string().max(500).optional(),

    skills: Joi.array().items(Joi.string()).optional(),

});



module.exports = {

    updateProfileSchema,

    addSkillSchema,

    updateSkillSchema,

    addExperienceSchema,

    updateExperienceSchema,

    addEducationSchema,

    addCertificateSchema,

};

