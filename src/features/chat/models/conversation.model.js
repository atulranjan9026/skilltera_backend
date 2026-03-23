const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const conversationSchema = new mongoose.Schema({
    jobSubject: { type: String, required: true },
    candidateId: { type: ObjectId, ref: "Candidate", required: true },
    // Company model is registered as "Companies" in this codebase.
    companyId: { type: ObjectId, ref: "Companies", required: true },
    candidateUnread: { type: Number, default: 0 },
    companyUnread: { type: Number, default: 0 },
    isClosed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", conversationSchema);
