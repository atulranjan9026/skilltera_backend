const Conversation = require("../models/conversation.model");
const Message = require("../models/message.model");

// Create or get conversation
exports.initiateConversation = async (req, res) => {
    try {
        const { candidateId, companyId, jobSubject } = req.body;
        
        let conversation = await Conversation.findOne({ candidateId, companyId, jobSubject });
        if (!conversation) {
            conversation = await Conversation.create({ candidateId, companyId, jobSubject });
        }
        res.status(200).json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get conversations for a user
exports.getUserConversations = async (req, res) => {
    try {
        const userId = req.user._id; // from auth middleware

        // "Company-side" roles map to the conversation.companyId.
        // Interviewers store the company reference on req.user.companyId.
        const companySideRoles = ['company', 'hiring_manager', 'backup_hiring_manager', 'interviewer'];
        const isCompanySide = companySideRoles.includes(req.userRole);

        const companyId =
            req.userRole === 'company'
                ? userId
                : (req.user.companyId?._id || req.user.companyId);

        // Match user to right field based on role
        const query = isCompanySide ? { companyId } : { candidateId: userId };

        const conversations = await Conversation.find(query)
            .populate('candidateId', 'name email phone avatar.url')
            .populate('companyId', 'companyName imageLink')
            .sort({ updatedAt: -1 });
            
        res.status(200).json({ success: true, conversations });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Fetch messages & reset unread counter
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const companySideRoles = ['company', 'hiring_manager', 'backup_hiring_manager', 'interviewer'];
        const isCompanySide = companySideRoles.includes(req.userRole);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ error: "Conversation not found" });

        // Reset unread count for the requesting user
        if (isCompanySide) conversation.companyUnread = 0;
        else conversation.candidateUnread = 0;
        await conversation.save();

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
        res.status(200).json({ success: true, messages, conversation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Send a message in a conversation
exports.sendMessage = async (req, res) => {
    try {
        const { conversationId, text } = req.body;
        if (!conversationId || !text) {
            return res.status(400).json({ success: false, message: 'conversationId and text are required' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const senderId = req.user._id;
        const message = await Message.create({ conversationId, senderId, text });

        const companySideRoles = ['company', 'hiring_manager', 'backup_hiring_manager', 'interviewer'];
        const isCompanySide = companySideRoles.includes(req.userRole);

        // Increment unread for receiver
        if (isCompanySide) {
            conversation.candidateUnread = (conversation.candidateUnread || 0) + 1;
        } else {
            conversation.companyUnread = (conversation.companyUnread || 0) + 1;
        }
        await conversation.save();

        res.status(201).json({ success: true, message, conversation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
