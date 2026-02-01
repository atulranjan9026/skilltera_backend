const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./shared/middleware/errorHandler.middleware');
const { apiLimiter } = require('./shared/middleware/rateLimiter.middleware');
const logger = require('./shared/utils/logger');

// Import routes
const candidateAuthRoutes = require('./features/candidates/routes/auth.routes');
const candidateProfileRoutes = require('./features/candidates/routes/profile.routes');
const candidateJobRoutes = require('./features/candidates/routes/job.routes');
const candidateSkillRoutes = require('./features/candidates/routes/skill.routes');
const candidateCompanyRoutes = require('./features/candidates/routes/company.routes');

/**
 * Express Application Setup
 */
const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Data sanitization against NoSQL injection
app.use(xss()); // Data sanitization against XSS

// CORS Configuration
const corsOptions = {
    origin: [process.env.CLIENT_URL, process.env.CLIENT_URL_PROD, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser
app.use(cookieParser());

// Compression Middleware
app.use(compression());

// HTTP Request Logger (Morgan)
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.http(message.trim()),
        },
    }));
}

// API Rate Limiting
app.use('/api', apiLimiter);

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';

// Candidate Routes
app.use(`/api/${API_VERSION}/candidates/auth`, candidateAuthRoutes);
app.use(`/api/${API_VERSION}/candidates/profile`, candidateProfileRoutes);
app.use(`/api/${API_VERSION}/candidate/job`, candidateJobRoutes);
app.use(`/api/${API_VERSION}/candidate/companies`, candidateCompanyRoutes);



// All Active Skills
app.use(`/api/${API_VERSION}/allActiveSkills`, candidateSkillRoutes);


// API Health Check (versioned)
app.get(`/api/${API_VERSION}/health`, (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: API_VERSION,
    });
});

// Root Route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to SkillTera API',
        version: API_VERSION,
        documentation: `/api/${API_VERSION}/docs`,
    });
});

// 404 Not Found Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
