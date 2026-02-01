const mongoose = require('mongoose');

const masterSkillSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
            unique: true,
        },
        category: {
            type: String,
            enum: ['technical', 'soft', 'language', 'tool', 'framework', 'other'],
            default: 'technical',
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster search
masterSkillSchema.index({ name: 1 }); 
masterSkillSchema.index({ name: "text", active: 1 });

const MasterSkill = mongoose.model('MasterSkill', masterSkillSchema);

module.exports = MasterSkill;
