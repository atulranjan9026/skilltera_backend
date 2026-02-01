# SkillTera Backend

Modern, scalable backend for SkillTera job portal built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Modern Architecture**: Feature-based folder structure for better organization
- **Authentication**: JWT with refresh tokens, email verification, password reset
- **Security**: Helmet, rate limiting, XSS protection, NoSQL injection prevention
- **Validation**: Comprehensive input validation using Joi
- **Error Handling**: Centralized error handling with detailed logging
- **File Upload**: Cloudinary integration for resume and avatar uploads
- **Email Service**: Nodemailer with beautiful HTML templates
- **Logging**: Winston logger with file and console transports
- **API Documentation**: Well-documented endpoints with JSDoc comments

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/                 # Configuration files
│   ├── features/              # Feature modules
│   │   └── candidates/
│   │       ├── controllers/   # Request handlers
│   │       ├── services/      # Business logic
│   │       ├── routes/        # Route definitions
│   │       ├── validators/    # Input validation
│   │       └── models/        # Mongoose models
│   ├── shared/                # Shared resources
│   │   ├── constants/         # Constants and enums
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Shared models
│   │   └── utils/             # Utility functions
│   ├── app.js                 # Express app setup
│   └── server.js              # Server entry point
├── logs/                      # Log files
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)
- SMTP credentials (for emails)

### Steps

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   - MongoDB connection string
   - JWT secrets
   - Cloudinary credentials
   - SMTP settings
   - Client URL

4. **Start the server**
   
   Development mode:
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/candidates/auth/signup` | Register new candidate | Public |
| POST | `/api/v1/candidates/auth/login` | Login candidate | Public |
| POST | `/api/v1/candidates/auth/logout` | Logout candidate | Private |
| POST | `/api/v1/candidates/auth/refresh` | Refresh access token | Public |
| GET | `/api/v1/candidates/auth/verify-email/:token` | Verify email | Public |
| POST | `/api/v1/candidates/auth/resend-verification` | Resend verification email | Public |
| POST | `/api/v1/candidates/auth/forgot-password` | Request password reset | Public |
| POST | `/api/v1/candidates/auth/reset-password` | Reset password | Public |
| GET | `/api/v1/candidates/auth/me` | Get current user | Private |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables

- `JWT_ACCESS_SECRET`: Secret for access tokens (min 32 characters)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (min 32 characters)
- `MONGODB_URI`: MongoDB connection string
- `CLIENT_URL`: Frontend application URL
- `SMTP_*`: Email service configuration
- `CLOUDINARY_*`: File upload configuration

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT secrets (min 32 characters)
- [ ] Configure production MongoDB URI
- [ ] Set up proper CORS origins
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Deployment Platforms

- **Heroku**: Add `Procfile` with `web: node src/server.js`
- **Railway**: Auto-detected from `package.json`
- **Render**: Use `npm start` as start command
- **AWS/Azure/GCP**: Use PM2 or similar process manager

## 🔒 Security Features

- **Helmet**: Security HTTP headers
- **Rate Limiting**: Prevent brute force attacks
- **XSS Protection**: Sanitize user input
- **NoSQL Injection Prevention**: Sanitize MongoDB queries
- **CORS**: Configured for specific origins
- **JWT**: Secure token-based authentication
- **Password Hashing**: Bcrypt with configurable rounds
- **Input Validation**: Joi schemas for all inputs

## 📊 Logging

Logs are stored in the `logs/` directory:
- `error.log`: Error level logs
- `combined.log`: All logs

In development, logs are also output to console with colors.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

MIT

## 👥 Authors

SkillTera Team

## 🐛 Bug Reports

Please report bugs via GitHub issues.

## 📞 Support

For support, email support@skilltera.com
