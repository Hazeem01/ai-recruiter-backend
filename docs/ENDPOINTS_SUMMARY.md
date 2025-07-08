# AI Recruiter Backend - Endpoints Summary

## 🚀 **Quick Reference**

**Base URL**: `http://localhost:3001`  
**API Version**: `/api/v1`  
**Auth**: Bearer Token (JWT)

## 📋 **All Endpoints**

### 🔐 **Authentication**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user |
| `POST` | `/api/v1/auth/login` | User login |
| `GET` | `/api/v1/auth/me` | Get current user |
| `POST` | `/api/v1/auth/logout` | User logout |

### 👤 **Applicant Features**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/applicant/resumes/upload` | Upload resume |
| `POST` | `/api/v1/applicant/resumes/parse` | Parse resume content |
| `POST` | `/api/v1/applicant/applications` | Apply for a job |
| `GET` | `/api/v1/applicant/applications` | Get user's job applications |
| `POST` | `/api/v1/applicant/ai/analyze-job` | Analyze job description |
| `POST` | `/api/v1/applicant/ai/generate-resume` | Generate AI resume |
| `POST` | `/api/v1/applicant/ai/generate-cover-letter` | Generate AI cover letter |
| `POST` | `/api/v1/applicant/export/resume` | Export resume PDF |
| `POST` | `/api/v1/applicant/export/cover-letter` | Export cover letter PDF |
| `GET` | `/api/v1/applicant/interviews` | Get user interviews |
| `POST` | `/api/v1/applicant/pro/signup` | Pro plan signup |

### 💼 **Recruiter Dashboard**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/dashboard/stats` | Get dashboard statistics |
| `GET` | `/api/v1/dashboard/jobs` | Get all jobs |
| `POST` | `/api/v1/dashboard/jobs` | Create new job |
| `PUT` | `/api/v1/dashboard/jobs/{id}` | Update job |
| `DELETE` | `/api/v1/dashboard/jobs/{id}` | Delete job |
| `GET` | `/api/v1/dashboard/candidates` | Get candidates |
| `PUT` | `/api/v1/dashboard/candidates/{id}` | Update candidate status |

### 💬 **AI Chat**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/chat/message` | Send chat message |
| `GET` | `/api/v1/chat/history` | Get chat history |
| `GET` | `/api/v1/chat/suggestions` | Get chat suggestions |

### 📁 **File Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/files/upload` | Upload file |
| `GET` | `/api/v1/files/{id}` | Get file details |
| `GET` | `/api/v1/files/{id}/download` | Download file |
| `GET` | `/api/v1/files/user/files` | Get user files |

### 🏢 **Company Management**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/companies` | Get all companies |
| `GET` | `/api/v1/companies/{id}` | Get company details |
| `PUT` | `/api/v1/companies/{id}` | Update company |
| `GET` | `/api/v1/companies/{id}/users` | Get company users |

### 📊 **Analytics**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/api` | Get API analytics |
| `GET` | `/api/v1/analytics/rate-limits` | Get rate limit analytics |
| `GET` | `/api/v1/analytics/health` | Get health analytics |

### 🔧 **System**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1` | API information |
| `GET` | `/docs` | API documentation |

## 🎯 **Key Features by User Role**

### **Applicants Can:**
- ✅ Upload and parse resumes
- ✅ Generate AI-powered resumes
- ✅ Generate AI-powered cover letters
- ✅ Analyze job descriptions
- ✅ Export documents to PDF
- ✅ Chat with AI assistant
- ✅ Manage their files
- ✅ View interview schedules

### **Recruiters Can:**
- ✅ View dashboard statistics
- ✅ Create and manage job postings
- ✅ View and manage candidates
- ✅ Update candidate status
- ✅ Manage company information
- ✅ View analytics and metrics
- ✅ Chat with AI assistant

## 🔑 **Authentication Flow**

1. **Register**: `POST /api/v1/auth/register`
2. **Login**: `POST /api/v1/auth/login`
3. **Store Token**: Save JWT token
4. **Use Token**: Add `Authorization: Bearer <token>` to all requests
5. **Refresh**: Handle token expiration

## 📝 **Common Request Patterns**

### **Authentication Header**
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### **File Upload**
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'resume');

fetch('/api/v1/files/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### **AI Generation**
```javascript
fetch('/api/v1/applicant/ai/generate-resume', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    resumeContent: currentResume,
    jobDescription: jobDescription,
    preferences: { style: 'professional', tone: 'confident' }
  })
});
```

## 🚨 **Error Handling**

All endpoints return consistent error format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## 📊 **Rate Limits**

- **Global**: 1000 requests per 15 minutes per IP
- **AI Endpoints**: 100 requests per hour per user
- **File Uploads**: 50 files per hour per user

## 🛠 **Development Tools**

- **API Docs**: `http://localhost:3001/docs`
- **Health Check**: `http://localhost:3001/health`
- **API Info**: `http://localhost:3001/api/v1`

## 📞 **Testing**

Use these test scripts:
- `node test-openai.js` - Test AI integration
- `node test-endpoints.js` - Test all endpoints
- `node test-login.js` - Test authentication

## 🎯 **Implementation Priority**

### **Phase 1 (Core Features)**
1. Authentication (login/register)
2. File upload for resumes
3. AI resume generation
4. Basic dashboard

### **Phase 2 (Advanced Features)**
1. Cover letter generation
2. Job analysis
3. PDF export
4. Chat interface

### **Phase 3 (Recruiter Features)**
1. Job management
2. Candidate management
3. Analytics dashboard
4. Company management 