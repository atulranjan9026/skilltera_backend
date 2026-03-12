const Message = require("./models/message.model");
const Conversation = require("./models/conversation.model");

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected to socket:", socket.id);

        // Join specific conversation room
        socket.on("join_conversation", (conversationId) => {
            socket.join(conversationId);
            console.log(`User joined conversation: ${conversationId}`);
        });

        // Handle sending messages
        socket.on("send_message", async (data) => {
            const { conversationId, senderId, text, receiverRole } = data;
            
            try {
                const message = await Message.create({ conversationId, senderId, text });
                
                // Update unread count for receiver and update timestamp
                const updateQuery = receiverRole === 'company' 
                    ? { $inc: { companyUnread: 1 } } 
                    : { $inc: { candidateUnread: 1 } };
                
                await Conversation.findByIdAndUpdate(conversationId, updateQuery);

                // Broadcast directly to everyone in the conversation room
                io.to(conversationId).emit("receive_message", message);
            } catch (err) {
                console.error("Socket message error:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
};
