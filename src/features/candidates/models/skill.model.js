const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
    {
        skill: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
            unique: true,
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
skillSchema.index({ skill: 1 });
skillSchema.index({ skill: "text", active: 1 });

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
