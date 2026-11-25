/**
 * Process entry point: validates env, connects to MongoDB, starts HTTP server.
 */
const mongoose = require('mongoose');
const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  await connectDB();
  const server = app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
  });
  // Outlive the host's load-balancer idle timeout so reused connections aren't cut mid-request.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  const shutdown = (signal) => {
    console.log(`${signal} received — shutting down`);
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// State is unknown after an uncaught exception: log it and exit so the host restarts a clean process.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

start();
