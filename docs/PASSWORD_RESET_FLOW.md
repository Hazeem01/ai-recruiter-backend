# Password Reset Flow - Jobsilo

## Complete Flow Overview

### Step 1: User Requests Password Reset
**Endpoint:** `POST /api/v1/auth/password/reset-request`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Process:**
1. ✅ Validates email is provided
2. ✅ Checks if user exists (doesn't reveal if user doesn't exist for security)
3. ✅ Generates secure 64-character hex token using `crypto.randomBytes(32)`
4. ✅ Sets token expiration to 1 hour from now
5. ✅ Invalidates any existing unused tokens for the user
6. ✅ Stores new token in `password_reset_tokens` table
7. ✅ Sends branded email with reset link
8. ✅ Returns success message (even if email doesn't exist - security best practice)

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### Step 2: User Receives Email
**Email Contents:**
- ✅ Branded Jobsilo email template with brand colors
- ✅ Reset link format: `{FRONTEND_URL}/reset-password?token={resetToken}`
- ✅ Clear call-to-action button
- ✅ Plain text link as fallback
- ✅ Expiration warning (1 hour)
- ✅ Support contact information

**Email Link Example:**
```
http://localhost:8081/reset-password?token=abc123...xyz789
```

---

### Step 3: User Clicks Reset Link
**Frontend Action:**
- User is taken to reset password page
- Frontend extracts token from URL query parameter
- Frontend displays password reset form

---

### Step 4: User Submits New Password
**Endpoint:** `POST /api/v1/auth/password/reset`

**Request:**
```json
{
  "resetToken": "abc123...xyz789",
  "newPassword": "newSecurePassword123"
}
```

**Process:**
1. ✅ Validates resetToken and newPassword are provided
2. ✅ Validates password is at least 6 characters
3. ✅ Queries database for token with conditions:
   - Token matches
   - Token is not used (`used = FALSE`)
   - Token is not expired (`expires_at > NOW()`)
4. ✅ Additional expiration check (double verification)
5. ✅ Verifies user still exists
6. ✅ Hashes new password with bcrypt (10 salt rounds)
7. ✅ Updates user's `password_hash` in database
8. ✅ Marks token as used (`used = TRUE`)
9. ✅ Returns success message

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password.",
  "data": {
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Missing resetToken or newPassword
- `400`: Password too short (< 6 characters)
- `400`: Invalid or expired reset token
- `400`: User not found

---

## Security Features

### ✅ Token Security
- **64-character random hex token** (cryptographically secure)
- **1-hour expiration** (configurable)
- **One-time use** (marked as used after successful reset)
- **Automatic invalidation** of old tokens when new one is created

### ✅ Database Security
- **Unique token constraint** prevents duplicates
- **Foreign key constraint** with CASCADE delete (user deleted = tokens deleted)
- **Indexed queries** for performance
- **Expiration filtering** at database level

### ✅ Email Security
- **Doesn't reveal if email exists** (prevents email enumeration)
- **Secure token generation** (crypto.randomBytes)
- **HTTPS recommended** for reset links in production

### ✅ Password Security
- **Bcrypt hashing** (10 salt rounds)
- **Minimum length validation** (6 characters)
- **No password history** (can reuse old passwords - can be enhanced later)

---

## Database Schema

### `password_reset_tokens` Table
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
- `idx_password_reset_tokens_token` - Fast token lookups
- `idx_password_reset_tokens_user_id` - Fast user token queries
- `idx_password_reset_tokens_expires_at` - Expiration queries

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/password/reset-request` | Request password reset email | No |
| POST | `/api/v1/auth/password/reset` | Reset password with token | No |

---

## Frontend Integration Example

### Request Password Reset
```javascript
const requestPasswordReset = async (email) => {
  const response = await fetch('/api/v1/auth/password/reset-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};
```

### Reset Password
```javascript
const resetPassword = async (token, newPassword) => {
  const response = await fetch('/api/v1/auth/password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken: token, newPassword })
  });
  return response.json();
};
```

### Extract Token from URL
```javascript
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
```

---

## Testing

### Test Email Configuration
```bash
npm run test:email
```

### Manual Testing Flow
1. Request reset: `POST /api/v1/auth/password/reset-request` with email
2. Check email inbox for reset link
3. Extract token from email link
4. Reset password: `POST /api/v1/auth/password/reset` with token and new password
5. Login with new password: `POST /api/v1/auth/login`

---

## Configuration

### Environment Variables
```env
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=no-reply@hazeem.dev
SMTP_PASSWORD=your-password
SMTP_FROM=no-reply@hazeem.dev
FRONTEND_URL=http://localhost:8081
APP_NAME=Jobsilo
```

---

## Cleanup

### Expired Token Cleanup
The database includes a cleanup function that can be run periodically:
```javascript
await db.cleanupExpiredTokens();
```

This removes tokens that are:
- Expired
- Unused
- Older than 7 days

---

## Status: ✅ Complete and Ready

All components are implemented and tested:
- ✅ Database migration
- ✅ Token generation and storage
- ✅ Email sending with branded template
- ✅ Token validation
- ✅ Password hashing and update
- ✅ Security best practices
- ✅ Error handling
- ✅ Logging

