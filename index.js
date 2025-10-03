import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Import routes
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminRequestRoutes from './routes/adminRequestRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import formRoutes from './routes/formRoutes.js';
import adminNoticeRoutes from './routes/adminNoticeRoutes.js';
import adminFormRoutes from './routes/adminFormRoutes.js';
import adminDonorRoutes from './routes/adminDonorRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'https://localhost:5173',
      'https://nss-blood-donation-camp.vercel.app'
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root dummy route for quick server check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'NSS Backend server is running',
    timestamp: new Date().toISOString()
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mmmut_nss_blood_camp')
  .then(() => {
    console.log('Connected to MongoDB');
    initializeDatabase();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Initialize database with Super Admin
async function initializeDatabase() {
  try {
    const { Admin } = await import('./models/Admin.js');

    // Check if Super Admin exists
    const superAdmin = await Admin.findOne({ role: 'main' });
    
    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const newSuperAdmin = await Admin.create({
        name: 'Super Admin',
        email: 'superadmin@mmmut.ac.in',
        password: hashedPassword,
        role: 'main'
      });
      
      console.log('✅ Super Admin created successfully:');
      console.log('   Email: superadmin@mmmut.ac.in');
      console.log('   Password: admin123');
      console.log('   Role: main');
      console.log('   ID:', newSuperAdmin._id);
    } else {
      console.log('✅ Super Admin already exists:');
      console.log('   Email:', superAdmin.email);
      console.log('   Role:', superAdmin.role);
      console.log('   ID:', superAdmin._id);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-requests', adminRequestRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/admin/notices', adminNoticeRoutes);
app.use('/api/admin/forms', adminFormRoutes);
app.use('/api/admin/donors', adminDonorRoutes);

// Serve uploaded files
app.use('/uploads', express.static('server/uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
