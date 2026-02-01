const mongoose = require('mongoose');
const logger = require('../shared/utils/logger');

/**
 * Connect to MongoDB database
 * @returns {Promise<mongoose.Connection>} MongoDB connection
 */
const connectDB = async () => {
    try {
        const mongoURI = process.env.NODE_ENV === 'production'
            ? process.env.MONGO_URI
            : process.env.MONGO_URI;

        const options = {
            // Connection pool size
            maxPoolSize: 10,
            minPoolSize: 2,

            // Timeout settings
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,

            // Retry settings
            retryWrites: true,
            retryReads: true,
        };

        const conn = await mongoose.connect(mongoURI, options);

        // logger.info(`MongoDB Connected: ${conn.connection.host}`);
        // logger.info(`Database: ${conn.connection.name}`);

        // Connection event handlers
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            logger.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('Mongoose connection closed due to app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
