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
- **Database**: DigitalOcean PostgreSQL (PostgreSQL 15+)
- **Storage**: DigitalOcean Spaces (S3-compatible)
- **Authentication**: Custom JWT + bcrypt
- **AI**: OpenAI / Ollama (Local AI)
- **PDF Generation**: PDFKit
- **Logging**: Winston
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- DigitalOcean account (with GitHub Education Pack credits)
- PostgreSQL database (DigitalOcean Managed PostgreSQL)
- DigitalOcean Spaces (for file storage)
- OpenAI API key (optional, for AI features)

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
   FRONTEND_URL=http://localhost:8081
   
   # Database Configuration (PostgreSQL)
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   
   # DigitalOcean Spaces Configuration (S3-compatible storage)
   SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
   SPACES_KEY=your-spaces-access-key
   SPACES_SECRET=your-spaces-secret-key
   SPACES_BUCKET=your-bucket-name
   SPACES_REGION=nyc3
   
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-3.5-turbo
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRES_IN=24h
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
- `POST /api/v1/auth/password/reset-request` - Request password reset
- `POST /api/v1/auth/password/reset` - Reset password (supports migrated users without password hash)

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

### Storage Buckets (DigitalOcean Spaces)
- `resumes` - Resume file storage
- `files` - General file storage
- `avatars` - User avatar storage

**Note**: All buckets are created in a single DigitalOcean Spaces bucket with folder structure, or as separate buckets depending on your configuration.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SPACES_ENDPOINT` | DigitalOcean Spaces endpoint | Yes |
| `SPACES_KEY` | Spaces access key | Yes |
| `SPACES_SECRET` | Spaces secret key | Yes |
| `SPACES_BUCKET` | Spaces bucket name | No (if using separate buckets) |
| `SPACES_REGION` | Spaces region | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) | Optional |
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
   - Create DigitalOcean PostgreSQL database
   - Run migrations: `npm run migrate`
   - Create DigitalOcean Spaces buckets: `resumes`, `files`, `avatars`
   - Configure Spaces access keys

3. **Start Production Server**
   ```bash
   npm start
   ```

### DigitalOcean App Platform Deployment

The application includes a `.do/app.yaml` configuration file for easy deployment to DigitalOcean App Platform:

1. **Connect your repository** to DigitalOcean App Platform
2. **Configure environment variables** in the App Platform dashboard
3. **Deploy** - App Platform will automatically detect the `.do/app.yaml` file

See `DEPLOYMENT_CHECKLIST.md` for detailed deployment instructions.

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

2. **Run Database Migrations**
   ```bash
   # Run all migrations
   npm run migrate
   
   # This will execute all SQL files in the migrations/ directory
   # in order: 001_initial_schema.sql, 002_company_schema.sql, etc.
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

### v2.0.0 - DigitalOcean Migration
- **Cloud Migration** - Migrated from Supabase/Render to DigitalOcean
- **Database** - Replaced Supabase PostgreSQL with DigitalOcean Managed PostgreSQL
- **Storage** - Replaced Supabase Storage with DigitalOcean Spaces (S3-compatible)
- **Authentication** - Replaced Supabase Auth with custom JWT + bcrypt implementation
- **Password Reset** - Added password reset functionality for migrated users
- **SSL Support** - Added SSL certificate handling for DigitalOcean PostgreSQL
- **Deployment** - Added DigitalOcean App Platform configuration (`.do/app.yaml`)

### v1.1.0
- **Company Management System** - Complete company schema and management
- **Enhanced Registration** - Recruiters can register with company information
- **Analytics Dashboard** - API usage and system health monitoring
- **Improved Validation** - Dynamic request validation middleware
- **Enhanced Testing** - Comprehensive test suite with company features
- **Database Migrations** - Automated migration system

### v1.0.0
- Initial release with two-sided marketplace
- Complete authentication system
- AI-powered content generation
- File management system
- Real-time chat functionality
- Comprehensive API documentation
- Production-ready security features 