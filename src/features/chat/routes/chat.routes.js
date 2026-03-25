const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../../../shared/middleware/auth.middleware');

// Protect all chat routes
router.use(authenticate);

// Initiate or get an existing conversation
router.post('/initiate', chatController.initiateConversation);

// Get all conversations for the logged in user
router.get('/conversations', chatController.getUserConversations);

// Get messages for a specific conversation
router.get('/messages/:conversationId', chatController.getMessages);

// Send a message in a conversation
router.post('/messages', chatController.sendMessage);

module.exports = router;
