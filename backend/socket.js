let io = null;

function init(server, opts = {}) {
  const { Server } = require('socket.io');
  const jwt = require('jsonwebtoken');

  io = new Server(server, Object.assign({
    cors: {
      origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(','),
      methods: ['GET', 'POST']
    }
  }, opts));

  // Attach optional JWT-based handshake: if a valid token is provided
  // we attach `socket.data.user`. We do not reject unauthenticated sockets
  // so legacy clients remain supported; enforce as needed later.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token
        ? socket.handshake.auth.token
        : (socket.handshake.headers && socket.handshake.headers.authorization
          ? (socket.handshake.headers.authorization.split(' ')[1] || null)
          : null);

      if (!token) return next();

      const secret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, secret);
      socket.data.user = decoded;
      return next();
    } catch (err) {
      // Log and continue without attaching user; change to `next(err)` to reject.
      console.warn('Socket auth failed:', err.message);
      return next();
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, socket.data && socket.data.user ? `user=${socket.data.user.id || socket.data.user._id}` : 'anonymous');

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized - call init(server) first');
  return io;
}

module.exports = { init, getIO };
