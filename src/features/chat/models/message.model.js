const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const messageSchema = new mongoose.Schema({
    conversationId: { type: ObjectId, ref: "Conversation", required: true },
    senderId: { type: ObjectId, required: true }, // Can be candidate or company id
    text: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
