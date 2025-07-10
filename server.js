const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const applicantRoutes = require("./routes/applicantRoutes");
const chatRoutes = require("./routes/chatRoutes");
const fileRoutes = require("./routes/fileRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const companyRoutes = require("./routes/companyRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

let swaggerDocument;
try {
  swaggerDocument = YAML.load('./docs/swagger.yaml');
} catch (error) {
  console.error('Error loading Swagger documentation:', error.message);
  swaggerDocument = {
    openapi: '3.0.3',
    info: {
      title: 'AI Recruiter Backend API',
      version: '1.0.0',
      description: 'API documentation'
    },
    paths: {}
  };
}

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://jobsilo.hazeem.dev' || 'http://localhost:8081',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting (disabled for development)
// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs
//   message: {
//     success: false,
//     error: {
//       message: 'Too many requests from this IP, please try again later.'
//     }
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Serve static files (landing page)
app.use(express.static('public'));

// API versioning
const API_VERSION = '/api/v1';

// Route registration
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/dashboard`, dashboardRoutes);
app.use(`${API_VERSION}/applicant`, applicantRoutes);
app.use(`${API_VERSION}/chat`, chatRoutes);
app.use(`${API_VERSION}/files`, fileRoutes);
app.use(`${API_VERSION}/analytics`, analyticsRoutes);
app.use(`${API_VERSION}/companies`, companyRoutes);

// Serve API documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API root endpoint (JSON)
app.get(`${API_VERSION}`, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'AI Recruiter Backend API',
      version: '1.0.0',
      endpoints: {
        auth: `${API_VERSION}/auth`,
        dashboard: `${API_VERSION}/dashboard`,
        applicant: `${API_VERSION}/applicant`,
        chat: `${API_VERSION}/chat`,
        files: `${API_VERSION}/files`,

        companies: `${API_VERSION}/companies`,
        docs: '/docs',
        health: '/health'
      },
      documentation: '/docs'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Global error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;