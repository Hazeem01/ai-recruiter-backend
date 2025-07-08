# AI Recruiter Backend

A comprehensive **two-sided recruitment platform** that serves both **recruiters** and **job applicants** with AI-powered features, file management, and real-time chat assistance.

## 🚀 Features

### For Recruiters
- **Dashboard Analytics** - Comprehensive metrics and insights
- **Job Management** - Create, update, and manage job postings
- **Candidate Management** - Track and filter candidates
- **Interview Scheduling** - Schedule and manage interviews
- **AI-Powered Evaluation** - AI assistance for candidate assessment
- **Company Management** - Create and manage company profiles
- **Team Management** - Add and manage team members

### For Job Applicants
- **Resume Upload & Parsing** - Upload and extract content from resumes
- **AI Resume Generation** - Generate tailored resumes using AI
- **AI Cover Letter Generation** - Create personalized cover letters
- **Job Analysis** - Analyze job postings from URLs or text
- **PDF Export** - Export resumes and cover letters as PDFs
- **AI Chat Assistant** - Get career guidance and interview tips

### General Features
- **User Authentication** - Secure login/registration with JWT
- **File Management** - Upload, store, and manage files
- **Real-time Chat** - AI-powered chat for career guidance
- **Comprehensive Logging** - Detailed request and error logging
- **API Documentation** - Interactive Swagger UI documentation
- **Rate Limiting** - Protection against abuse
- **Security Headers** - Helmet.js security middleware

## 🛠️ Technology Stack

- **Runtime**: Node.js with Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth + JWT
- **AI**: Ollama (Local AI)
- **PDF Generation**: PDFKit
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project
- Ollama (for local AI)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-recruiter-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```bash
   cp env.example .env
   ```
   
   Configure your environment variables:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # AI Configuration (Hugging Face + Llama 2 70B)
   AI_PROVIDER=huggingface
   OPENAI_API_KEY=your_huggingface_api_token
   HUGGINGFACE_MODEL=meta-llama/Llama-2-70b-chat-hf
   
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📚 API Documentation

The API documentation is available at `http://localhost:3001/docs` when the server is running.

### Registration with Company Support

Recruiters can register with company information:

```json
{
  "email": "recruiter@company.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "recruiter",
  "company": {
    "name": "Tech Corp",
    "description": "A technology company",
    "website": "https://techcorp.com",
    "industry": "Technology",
    "size": "medium",
    "location": "San Francisco, CA",
    "foundedYear": 2020
  }
}
```

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration (supports company creation for recruiters)
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

#### Recruiter Dashboard
- `GET /api/v1/dashboard/stats` - Dashboard metrics
- `GET /api/v1/dashboard/jobs` - List all jobs
- `POST /api/v1/dashboard/jobs` - Create new job posting
- `PUT /api/v1/dashboard/jobs/:id` - Update job posting
- `DELETE /api/v1/dashboard/jobs/:id` - Delete job posting
- `GET /api/v1/dashboard/candidates` - List candidates
- `GET /api/v1/dashboard/candidates/:id` - Get candidate details

#### Applicant Features
- `POST /api/v1/applicant/resumes/upload` - Upload resume file
- `POST /api/v1/applicant/resumes/parse` - Parse resume text
- `POST /api/v1/applicant/applications` - Apply for a job
- `GET /api/v1/applicant/applications` - Get user's job applications
- `POST /api/v1/applicant/ai/analyze-job` - Analyze job posting
- `POST /api/v1/applicant/ai/generate-resume` - Generate tailored resume
- `POST /api/v1/applicant/ai/generate-cover-letter` - Generate cover letter
- `POST /api/v1/applicant/export/resume` - Export resume as PDF
- `POST /api/v1/applicant/export/cover-letter` - Export cover letter as PDF
- `POST /api/v1/applicant/pro/signup` - Pro version signup

#### Interview Management
- `GET /api/v1/applicant/interviews` - List interviews
- `POST /api/v1/applicant/interviews` - Schedule interview

#### Company Management
- `GET /api/v1/companies` - List companies
- `POST /api/v1/companies` - Create new company
- `GET /api/v1/companies/:id` - Get company details
- `PUT /api/v1/companies/:id` - Update company
- `GET /api/v1/companies/:id/users` - Get company users
- `POST /api/v1/companies/:id/users` - Add user to company
- `DELETE /api/v1/companies/:id/users/:userId` - Remove user from company

#### Analytics
- `GET /api/v1/analytics/api` - Get API usage analytics
- `GET /api/v1/analytics/rate-limits` - Get rate limiting statistics
- `GET /api/v1/analytics/health` - Get system health status

#### AI Chat
- `POST /api/v1/chat/message` - Send message to AI
- `GET /api/v1/chat/history` - Get chat history
- `DELETE /api/v1/chat/history` - Clear chat history
- `GET /api/v1/chat/suggestions` - Get chat suggestions

#### File Management
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/:id` - Get file information
- `GET /api/v1/files/:id/download` - Download file
- `DELETE /api/v1/files/:id` - Delete file
- `GET /api/v1/files/user/files` - Get user's files

## 🗄️ Database Schema

### Core Tables
- `users` - User profiles and authentication (with company_id)
- `companies` - Company profiles and information
- `jobs` - Job postings and requirements (with company_id)
- `candidates` - Candidate applications and status
- `resumes` - Resume data and parsed content
- `interviews` - Interview scheduling and details
- `chat_history` - AI chat conversations
- `files` - File uploads and metadata
- `pro_signups` - Pro version signup data

### Storage Buckets
- `resumes` - Resume file storage
- `files` - General file storage
- `avatars` - User avatar storage

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `AI_PROVIDER` | AI provider (ollama) | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | No |

### Rate Limiting

- **Global**: 1000 requests per 15 minutes per IP
- **Auth Routes**: 10 requests per 15 minutes per IP
- **Dashboard Routes**: 100 requests per 15 minutes per IP
- **Applicant Routes**: 50 requests per 15 minutes per IP
- **Chat Routes**: 100 requests per 15 minutes per IP
- **File Routes**: 30 requests per 15 minutes per IP

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Protection against abuse
- **Input Validation** - Request data validation
- **JWT Authentication** - Secure token-based auth
- **File Upload Validation** - Secure file handling

## 📊 Logging

The application uses Winston for comprehensive logging:

- **Console Logging** - Development environment
- **File Logging** - Production environment with rotation
- **Request Logging** - All incoming requests
- **Error Logging** - Detailed error tracking
- **Performance Logging** - Response time tracking

## 🚀 Deployment

### Production Setup

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   PORT=3001
   ```

2. **Database Setup**
   - Create Supabase project
   - Set up database tables
   - Configure storage buckets

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🧪 Testing

### Database Setup

1. **Run Database Connection Test**
   ```bash
   npm run test:db
   ```

2. **Run Migrations** (if using Supabase SQL Editor)
   ```bash
   # Copy contents of migrations/001_initial_schema.sql
   # Copy contents of migrations/002_company_schema.sql
   # Run in Supabase SQL Editor
   ```

### Automated Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Manual Testing

1. **Health Check**
   ```bash
   curl http://localhost:3001/health
   ```

2. **API Documentation**
   ```bash
   curl http://localhost:3001/docs
   ```

3. **Authentication Test**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
   ```

4. **Recruiter Registration with Company**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email":"recruiter@company.com",
       "password":"password123",
       "firstName":"Jane",
       "lastName":"Smith",
       "role":"recruiter",
       "company":{
         "name":"Tech Corp",
         "description":"A technology company",
         "website":"https://techcorp.com",
         "industry":"Technology",
         "size":"medium",
         "location":"San Francisco, CA",
         "foundedYear":2020
       }
     }'
   ```

## 📈 Monitoring

- **Health Endpoint** - `/health`
- **Request Logging** - All requests logged
- **Error Tracking** - Comprehensive error logging
- **Performance Metrics** - Response time tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/docs`
- Review the logs for error details

## 🔄 Changelog

### v1.1.0
- **Company Management System** - Complete company schema and management
- **Enhanced Registration** - Recruiters can register with company information
- **Analytics Dashboard** - API usage and system health monitoring
- **Improved Validation** - Dynamic request validation middleware
- **Enhanced Testing** - Comprehensive test suite with company features
- **Database Migrations** - Automated migration system for Supabase

### v1.0.0
- Initial release with two-sided marketplace
- Complete authentication system
- AI-powered content generation
- File management system
- Real-time chat functionality
- Comprehensive API documentation
- Production-ready security features 