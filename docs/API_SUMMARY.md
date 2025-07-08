# AI Recruiter Backend API - Frontend Integration Guide

## 🚀 **Quick Start**

**Base URL**: `http://localhost:3001` (Development)  
**API Version**: `/api/v1`  
**Authentication**: Bearer Token (JWT)  
**Content-Type**: `application/json`

## 🔐 **Authentication**

### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "applicant", // or "recruiter"
  "company": { // Required for recruiters
    "name": "Tech Corp",
    "description": "A leading technology company",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "size": "medium",
    "location": "San Francisco, CA",
    "foundedYear": 2020
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "applicant",
      "companyId": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "applicant"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

## 👤 **Applicant Endpoints**

### Upload Resume
```http
POST /api/v1/applicant/resumes/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <resume_file>
- type: "resume" | "cover_letter"
```

### Parse Resume
```http
POST /api/v1/applicant/resumes/parse
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileId": "uuid-of-uploaded-file"
}
```

### Job Applications
```http
POST /api/v1/applicant/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "uuid-of-job",
  "resumeUrl": "https://example.com/resume.pdf", // optional
  "coverLetterUrl": "https://example.com/cover-letter.pdf" // optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "applicationId": "uuid",
    "status": "applied",
    "appliedAt": "2025-07-08T04:00:00.000Z",
    "job": {
      "id": "job-uuid",
      "title": "Senior Frontend Developer",
      "company": "Tech Corp",
      "location": "San Francisco, CA"
    }
  }
}
```

### Get Applications
```http
GET /api/v1/applicant/applications?status=applied&page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters**:
- `status` (optional): Filter by status (`applied`, `reviewing`, `interviewing`, `offered`, `rejected`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "application-uuid",
        "status": "applied",
        "appliedAt": "2025-07-08T04:00:00.000Z",
        "updatedAt": "2025-07-08T04:00:00.000Z",
        "resumeUrl": "https://example.com/resume.pdf",
        "coverLetterUrl": "https://example.com/cover-letter.pdf",
        "job": {
          "id": "job-uuid",
          "title": "Senior Frontend Developer",
          "company": "Tech Corp",
          "location": "San Francisco, CA",
          "jobType": "full-time",
          "salaryRange": "$80,000 - $120,000",
          "status": "active"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalApplications": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### Analyze Job
```http
POST /api/v1/applicant/ai/analyze-job
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobUrl": "https://example.com/job-posting", // optional
  "jobText": "Job description text..." // optional (either URL or text required)
}
```

### Generate AI Resume
```http
POST /api/v1/applicant/ai/generate-resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "resume": "Current resume content...",
  "jobDescription": "Job description...",
  "preferences": {
    "tone": "professional",
    "focus": ["technical skills", "leadership"]
  }
}
```

### Generate AI Cover Letter
```http
POST /api/v1/applicant/ai/generate-cover-letter
Authorization: Bearer <token>
Content-Type: application/json

{
  "resume": "Current resume content...",
  "jobDescription": "Job description...",
  "preferences": {
    "tone": "enthusiastic",
    "focus": ["company culture", "growth opportunities"]
  }
}
```

### Export PDF
```http
POST /api/v1/applicant/export/resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Resume content to export...",
  "type": "resume",
  "format": "A4"
}
```

### Get Interviews
```http
GET /api/v1/applicant/interviews?status=scheduled&page=1&limit=10
Authorization: Bearer <token>
```

### Pro Signup
```http
POST /api/v1/applicant/pro/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Tech Corp",
  "role": "applicant"
}
```

## 💼 **Recruiter/Dashboard Endpoints**

### Get Dashboard Stats
```http
GET /api/v1/dashboard/stats
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalJobs": 25,
    "activeJobs": 12,
    "totalCandidates": 150,
    "interviewsScheduled": 8,
    "hiresThisMonth": 3,
    "averageTimeToHire": 15
  }
}
```

### Get Jobs
```http
GET /api/v1/dashboard/jobs
Authorization: Bearer <token>
Query Parameters:
- page: 1
- limit: 10
- status: "active" | "draft" | "closed"
- search: "software engineer"
```

### Create Job
```http
POST /api/v1/dashboard/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Senior Software Engineer",
  "description": "Job description...",
  "requirements": ["JavaScript", "React", "Node.js"],
  "location": "San Francisco, CA",
  "type": "full-time",
  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  },
  "status": "active"
}
```

### Update Job
```http
PUT /api/v1/dashboard/jobs/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated job title",
  "description": "Updated description...",
  "status": "closed"
}
```

### Delete Job
```http
DELETE /api/v1/dashboard/jobs/{id}
Authorization: Bearer <token>
```

### Get Candidates
```http
GET /api/v1/dashboard/candidates
Authorization: Bearer <token>
Query Parameters:
- page: 1
- limit: 10
- jobId: "job123"
- status: "applied" | "interviewing" | "hired" | "rejected"
- search: "john doe"
```

### Update Candidate Status
```http
PUT /api/v1/dashboard/candidates/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "interviewing",
  "notes": "Strong technical background",
  "rating": 4
}
```

## 💬 **Chat Endpoints**

### Send Message
```http
POST /api/v1/chat/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How can I improve my resume?",
  "context": "resume_advice" // Optional context
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "Here are some tips to improve your resume...",
    "model": "gpt-3.5-turbo",
    "timestamp": "2025-07-08T03:00:00Z"
  }
}
```

### Get Chat History
```http
GET /api/v1/chat/history
Authorization: Bearer <token>
Query Parameters:
- page: 1
- limit: 20
```

### Get Chat Suggestions
```http
GET /api/v1/chat/suggestions
Authorization: Bearer <token>
Query Parameters:
- context: "resume_advice" | "interview_prep" | "career_guidance"
```

## 📁 **File Management**

### Upload File
```http
POST /api/v1/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- file: <file>
- type: "resume" | "cover_letter" | "document"
- description: "Optional description"
```

### Get File
```http
GET /api/v1/files/{id}
Authorization: Bearer <token>
```