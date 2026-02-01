const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email Service for sending emails
 */
class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            logger.info('Email transporter initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
        }
    }

    /**
     * Send email
     * @param {object} options - Email options
     * @param {string} options.to - Recipient email
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text content
     * @param {string} options.html - HTML content
     * @returns {Promise<object>} Email send result
     */
    async sendEmail({ to, subject, text, html }) {
        try {
            const mailOptions = {
                from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
                to,
                subject,
                text,
                html,
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${to}`);
            return info;
        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Send verification email
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} verificationToken - Verification token
     */
    async sendVerificationEmail(email, name, verificationToken) {
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SkillTera!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Thank you for signing up! Please verify your email address to activate your account.</p>
            <p>Click the button below to verify your email:</p>
            <a href="${verificationUrl}" class="button">Verify Email</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SkillTera. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${name},
      
      Thank you for signing up! Please verify your email address to activate your account.
      
      Click this link to verify: ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
    `;

        return this.sendEmail({
            to: email,
            subject: 'Verify Your Email - SkillTera',
            text,
            html,
        });
    }

    /**
     * Send password reset email
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     * @param {string} resetToken - Password reset token
     */
    async sendPasswordResetEmail(email, name, resetToken) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SkillTera. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${name},
      
      We received a request to reset your password.
      
      Click this link to reset your password: ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
    `;

        return this.sendEmail({
            to: email,
            subject: 'Password Reset Request - SkillTera',
            text,
            html,
        });
    }

    /**
     * Send welcome email
     * @param {string} email - Recipient email
     * @param {string} name - Recipient name
     */
    async sendWelcomeEmail(email, name) {
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SkillTera!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Your email has been verified successfully! Welcome to the SkillTera community.</p>
            <p>You can now:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Upload your resume</li>
              <li>Search and apply for jobs</li>
              <li>Get matched with opportunities</li>
            </ul>
            <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SkillTera. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

        const text = `
      Hi ${name},
      
      Your email has been verified successfully! Welcome to the SkillTera community.
      
      You can now complete your profile, upload your resume, and start applying for jobs.
      
      Visit your dashboard: ${process.env.CLIENT_URL}/dashboard
    `;

        return this.sendEmail({
            to: email,
            subject: 'Welcome to SkillTera! 🎉',
            text,
            html,
        });
    }
}

// Export singleton instance
module.exports = new EmailService();
