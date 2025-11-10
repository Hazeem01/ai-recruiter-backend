require('dotenv').config();
const logger = require('./logger');

let emailProvider = null;

// Initialize email provider based on configuration
const initializeEmailProvider = () => {
  // Check if nodemailer is available
  try {
    const nodemailer = require('nodemailer');
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      logger.warn('Email service not configured - SMTP credentials missing');
      logger.info('Configure SMTP_USER and SMTP_PASSWORD in your .env file');
      return false;
    }

    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };

    emailProvider = nodemailer.createTransport(smtpConfig);
    logger.info('Email service initialized with SMTP', { 
      host: smtpConfig.host, 
      port: smtpConfig.port,
      from: process.env.SMTP_FROM || smtpConfig.auth.user
    });
    return true;
  } catch (error) {
    logger.warn('Nodemailer not installed. Email functionality will be disabled.', { 
      error: error.message 
    });
    logger.info('To enable email functionality, install nodemailer: npm install nodemailer');
    return false;
  }
};

// Initialize on module load
const isEmailConfigured = initializeEmailProvider();

/**
 * Send password reset email
 * @param {string} to - Recipient email address
 * @param {string} resetToken - Password reset token
 * @param {string} firstName - User's first name (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendPasswordResetEmail = async (to, resetToken, firstName = 'User') => {
  if (!isEmailConfigured || !emailProvider) {
    logger.warn('Email service not configured - password reset email not sent', { email: to });
    // In development, log the reset link instead
    if (process.env.NODE_ENV === 'development') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
      logger.info('Password reset link (development mode)', { 
        email: to, 
        resetLink 
      });
      return { 
        success: true, 
        message: 'Email service not configured. Check logs for reset link.',
        resetLink // Only in development
      };
    }
    return { 
      success: false, 
      error: 'Email service not configured' 
    };
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const appName = process.env.APP_NAME || 'Jobsilo';

    // Determine sender email
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: fromEmail,
      to: to,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ${appName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F8FF; line-height: 1.6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F3F8FF; padding: 20px;">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #FF7C23 0%, #2D3559 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">Password Reset Request</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #222327; font-size: 16px; margin: 0 0 20px 0;">Hello ${firstName},</p>
                      
                      <p style="color: #222327; font-size: 16px; margin: 0 0 30px 0;">We received a request to reset your password for your ${appName} account.</p>
                      
                      <p style="color: #222327; font-size: 16px; margin: 0 0 30px 0;">Click the button below to reset your password:</p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetLink}" 
                               style="background-color: #FF7C23; color: #FFFFFF; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 124, 35, 0.3); transition: background-color 0.3s;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #222327; font-size: 14px; margin: 30px 0 10px 0;">Or copy and paste this link into your browser:</p>
                      <p style="word-break: break-all; color: #2D3559; font-size: 14px; margin: 0 0 30px 0; padding: 12px; background-color: #F3F8FF; border-radius: 6px; border-left: 4px solid #A3D958;">
                        ${resetLink}
                      </p>
                      
                      <!-- Warning Box -->
                      <div style="background-color: #F3F8FF; border-left: 4px solid #FF7C23; padding: 15px; border-radius: 6px; margin: 30px 0;">
                        <p style="color: #222327; font-size: 14px; margin: 0; font-weight: 600;">
                          ⏰ This link will expire in 1 hour.
                        </p>
                      </div>
                      
                      <p style="color: #222327; font-size: 14px; margin: 30px 0 0 0;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #F3F8FF; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 10px 0;">
                        This is an automated message from ${appName}. Please do not reply to this email.
                      </p>
                      <p style="color: #6B7280; font-size: 12px; margin: 0;">
                        Need help? Contact us at <a href="mailto:support@hazeem.dev" style="color: #2D3559; text-decoration: none; font-weight: 600;">support@hazeem.dev</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hello ${firstName},
        
        We received a request to reset your password for your ${appName} account.
        
        Click the link below to reset your password:
        ${resetLink}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        ---
        This is an automated message from ${appName}. Please do not reply to this email.
      `
    };

    const info = await emailProvider.sendMail(mailOptions);
    logger.info('Password reset email sent successfully', { 
      email: to,
      messageId: info.messageId
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Error sending password reset email', { 
      email: to, 
      error: error.message 
    });
    return { success: false, error: error.message };
  }
};

/**
 * Test email configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const testEmailConfiguration = async () => {
  if (!isEmailConfigured || !emailProvider) {
    return { success: false, error: 'Email service not configured' };
  }

  try {
    await emailProvider.verify();
    logger.info('Email configuration verified successfully');
    return { success: true };
  } catch (error) {
    logger.error('Email configuration verification failed', { error: error.message });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  testEmailConfiguration,
  isEmailConfigured: () => isEmailConfigured && emailProvider !== null
};

