# Backend Deployment Guide

This guide will help you deploy the SkillTera backend to various platforms.

## 🚀 Quick Deploy to GitHub

### 1. Initialize Git Repository
```bash
cd backend
git init
git add .
git commit -m "Initial commit - SkillTera Backend"
```

### 2. Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `skilltera-backend` (or your preferred name)
3. Don't initialize with README (we already have one)

### 3. Push to GitHub
```bash
git remote add origin https://github.com/your-username/skilltera-backend.git
git branch -M main
git push -u origin main
```

## 🌐 Deployment Platforms

### Heroku (Recommended)
1. Create Heroku account
2. Install Heroku CLI
3. Login: `heroku login`
4. Create app: `heroku create your-app-name`
5. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_ACCESS_SECRET=your-jwt-secret
   heroku config:set JWT_REFRESH_SECRET=your-refresh-secret
   heroku config:set CLIENT_URL=your-frontend-url
   ```
6. Deploy: `git push heroku main`

### Railway
1. Create Railway account
2. Connect GitHub repository
3. Railway will auto-detect Node.js app
4. Set environment variables in Railway dashboard
5. Deploy automatically

### Render
1. Create Render account
2. Connect GitHub repository
3. Create "Web Service"
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy

### Vercel (for APIs)
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

## ⚙️ Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skilltera
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=https://your-frontend-domain.com

# Email Service (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Cloudinary (optional for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🔧 Production Setup

### 1. Database Setup
- **MongoDB Atlas** (Recommended for production)
- Create cluster
- Get connection string
- Add IP whitelist (0.0.0.0 for all IPs)
- Create database user

### 2. Security Setup
- Use strong JWT secrets (minimum 32 characters)
- Enable HTTPS in production
- Set proper CORS origins
- Configure rate limiting

### 3. Performance Setup
- Enable compression
- Use CDN for static files
- Monitor with logs
- Set up backups

## 📋 Pre-Deployment Checklist

- [ ] Update `package.json` with correct start script
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set strong JWT secrets
- [ ] Update CORS origins
- [ ] Test all API endpoints
- [ ] Check error handling
- [ ] Verify environment variables

## 🐛 Common Issues

### Port Issues
- Make sure your app listens on `process.env.PORT`
- Default to 5000 for local, dynamic for production

### Database Connection
- Verify MongoDB URI format
- Check IP whitelist in Atlas
- Ensure database user has correct permissions

### Environment Variables
- Don't commit `.env` file
- Use platform's environment variable settings
- Test all required variables are set

### CORS Issues
- Set `CLIENT_URL` to your frontend domain
- Include both HTTP and HTTPS if needed
- Test API calls from frontend

## 📊 Monitoring

### Logs
```bash
# View logs on Heroku
heroku logs --tail

# View logs on Railway
railway logs

# View logs on Render
Check dashboard > Logs
```

### Health Check
Your app includes a health check endpoint:
```
GET /health
```

Returns server status and timestamp.

## 🔄 CI/CD

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: ${{secrets.HEROKU_APP_NAME}}
          heroku_email: ${{secrets.HEROKU_EMAIL}}
```

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review error logs
3. Verify environment variables
4. Test database connection
5. Check API endpoints manually

---

**Ready to deploy! 🚀**
