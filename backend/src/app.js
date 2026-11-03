const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const { performance } = require('node:perf_hooks');

// Load env vars
dotenv.config();

// Fix SRV DNS resolution (works both locally and on Vercel)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const app = express();

// ─── Serverless MongoDB Connection Cache ─────────────────────────────────────
// On Vercel serverless, functions can be reused between requests.
// We cache the connection to avoid reconnecting on every request.
let isDbConnected = false;
let dbConnectionPromise = null;

const connectDB = async () => {
  if (isDbConnected && mongoose.connection.readyState === 1) return;
  if (dbConnectionPromise) return dbConnectionPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  dbConnectionPromise = (async () => {
    const startedAt = performance.now();
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      isDbConnected = true;
      console.log(JSON.stringify({
        event: 'mongodb_connected',
        durationMs: Math.round(performance.now() - startedAt),
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      }));
    } catch (error) {
      isDbConnected = false;
      console.error(JSON.stringify({
        event: 'mongodb_connection_failed',
        durationMs: Math.round(performance.now() - startedAt),
        message: error.message,
      }));
      throw error;
    } finally {
      dbConnectionPromise = null;
    }
  })();

  return dbConnectionPromise;
};

// Record slow API calls without logging query strings or request data.
const slowRequestThresholdMs = Number(process.env.SLOW_REQUEST_THRESHOLD_MS ?? 500);
app.use((req, res, next) => {
  const startedAt = performance.now();
  const requestPath = (req.originalUrl || req.url).split('?')[0];
  req.mongoWaitMs = 0;

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs < slowRequestThresholdMs && res.statusCode < 400) return;

    console.log(JSON.stringify({
      event: 'slow_http_request',
      method: req.method,
      path: requestPath,
      status: res.statusCode,
      durationMs,
      mongoWaitMs: req.mongoWaitMs,
      authLookupMs: req.authLookupMs || 0,
      authCache: req.authCache || 'not_applicable',
    }));
  });
  next();
});

// Lazy DB connection middleware — connects on first request, reuses after
app.use(async (req, res, next) => {
  // Skip health check (it reports DB status itself)
  if (req.path === '/api/health' || req.path === '/') return next();
  const dbStartedAt = performance.now();
  try {
    await connectDB();
  } catch (err) {
    req.mongoWaitMs = Math.round(performance.now() - dbStartedAt);
    return res.status(503).json({
      success: false,
      message: 'Database unavailable. Please try again in a moment.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  req.mongoWaitMs = Math.round(performance.now() - dbStartedAt);
  next();
});

// ─── Security Middleware ─────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet());

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://skrt.company',
  'https://www.skrt.company',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);

// Request Logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.url}`);
    next();
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'SKRT Logistics API is running ✅',
    version: '2.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbName = 'unknown';
  const dbStartedAt = performance.now();
  try {
    await connectDB();
    dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    dbName = mongoose.connection.name || 'unknown';
  } catch (err) {
    dbStatus = 'error';
  } finally {
    req.mongoWaitMs = Math.round(performance.now() - dbStartedAt);
  }
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    dbName,
    environment: process.env.NODE_ENV || 'development',
    socketio: 'disabled on serverless (Vercel)'
  });
});

// Module Routes
app.use('/api/auth',               require('./modules/auth/routes'));
app.use('/api/inventory',          require('./modules/inventory/routes'));
app.use('/api/shipments',          require('./modules/shipments/routes'));
app.use('/api/contacts',           require('./modules/contacts/routes'));
app.use('/api/vehicles',           require('./modules/vehicles/routes'));
app.use('/api/drivers',            require('./modules/drivers/routes'));
app.use('/api/invoices',           require('./modules/invoices/routes'));
app.use('/api/analytics',          require('./modules/analytics/routes'));
app.use('/api/clients',            require('./modules/clients/routes'));
app.use('/api/expenses',           require('./modules/expenses/routes'));
app.use('/api/tracking',           require('./modules/tracking/routes'));
app.use('/api/public/tracking',    require('./modules/tracking/publicRoutes'));
app.use('/api/notifications',      require('./modules/notifications/routes'));
app.use('/api/cash-memo',          require('./modules/cash-memo/routes'));
app.use('/api/entry',              require('./modules/entry/routes'));
app.use('/api/summary',            require('./modules/summary/routes'));
app.use('/api/delivery-statement', require('./modules/delivery-statement/routes'));
app.use('/api/challan',            require('./modules/challan/routes'));
app.use('/api/search',             require('./modules/search/routes'));
app.use('/api/suggestions',        require('./modules/suggestions/routes'));
app.use('/api/upload',             require('./modules/upload/routes'));
app.use('/api/whatsapp',           require('./modules/whatsapp/routes'));
app.use('/api/settings',           require('./modules/settings/routes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message
  });
});

module.exports = app;
module.exports.connectDB = connectDB;
