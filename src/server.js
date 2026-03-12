require('dotenv').config();
const app = require('./app');
const { connectDB, configureCloudinary } = require('./config');
const logger = require('./shared/utils/logger');

const http = require('http');
const socketIo = require('socket.io');
const setupSocket = require('./features/chat/socket.setup');

// Create HTTP server instance
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
    cors: {
        origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_PROD, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
        methods: ["GET", "POST"]
    }
});

// Setup sockets
setupSocket(io);

const PORT = process.env.PORT || 5000;

/**
 * Start Server
 */
const startServer = async () => {
    try {
        // Connect to Database
        await connectDB();
        logger.info('✓ Database connected successfully');

        // Configure Cloudinary (skipped if not configured - resume uses local storage)
        configureCloudinary();
        const { isCloudinaryConfigured } = require('./config/storage');
        logger.info(isCloudinaryConfigured() ? '✓ Cloudinary configured' : '✓ Using local file storage for uploads');

        // Start Express Server
        server.listen(PORT, () => {
            // logger.info(`
            // ╔════════════════════════════════════════════════════════════╗
            // ║                                                            ║
            // ║   🚀 SkillTera Backend Server Running                     ║
            // ║                                                            ║
            // ║   Port:        ${PORT}                                    ║
            // ║   Environment: ${process.env.NODE_ENV || 'development'}   ║
            // ║   API Version: ${process.env.API_VERSION || 'v1'}         ║
            // ║                                                            ║
            // ║   Health:      http://localhost:${PORT}/health            ║
            // ║   API:         http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}              ║
            // ║                                                            ║
            // ╚════════════════════════════════════════════════════════════╝
            //       `);
            logger.info(` Port: ${PORT}`);
        });

        // Graceful Shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`\n${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                logger.info('✓ HTTP server closed');

                try {
                    // Close database connection
                    const mongoose = require('mongoose');
                    await mongoose.connection.close();
                    logger.info('✓ Database connection closed');

                    logger.info('✓ Graceful shutdown completed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();
// Restart trigger
