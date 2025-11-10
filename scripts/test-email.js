#!/usr/bin/env node

require('dotenv').config();

const readline = require('readline');
const { sendPasswordResetEmail, testEmailConfiguration } = require('../utils/emailService');
const logger = require('../utils/logger');

const TEST_EMAIL_SUBJECT = process.env.TEST_EMAIL_SUBJECT || 'Jobsilo Email Test';
const TEST_EMAIL_BODY = process.env.TEST_EMAIL_BODY || `This is a test email from the Jobsilo backend.

If you received this message, your SMTP configuration is working.`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

(async () => {
  try {
    console.log('🔍 Verifying SMTP configuration...');
    const verifyResult = await testEmailConfiguration();
    if (!verifyResult.success) {
      console.error('❌ Email configuration test failed:', verifyResult.error);
      process.exitCode = 1;
      return;
    }

    console.log('✅ SMTP configuration looks good.');

    const recipient = process.env.TEST_EMAIL_TO || await question('Enter test recipient email (or press enter to skip sending): ');

    if (!recipient) {
      console.log('ℹ️  No recipient specified. SMTP verification completed without sending an email.');
      return;
    }

    console.log(`📨 Sending test email to ${recipient}...`);

    const result = await sendPasswordResetEmail(recipient, 'TEST-TOKEN', 'Tester');

    if (result.success) {
      console.log('✅ Test email sent successfully.', result.resetLink ? `Reset link: ${result.resetLink}` : '');
    } else {
      console.error('❌ Failed to send test email:', result.error);
      process.exitCode = 1;
    }
  } catch (error) {
    logger.error('Test email script encountered an error', { error: error.message });
    console.error('❌ Error running test email script:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();
