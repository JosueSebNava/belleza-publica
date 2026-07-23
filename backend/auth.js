const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(12).toString('hex');
  return {
    salt,
    passwordHash: hashPassword(password, salt)
  };
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function startSession(data, user) {
  const token = crypto.randomBytes(32).toString('hex');
  data.sessions = data.sessions.filter(session => session.userId !== user.id);
  data.sessions.push({
    token,
    userId: user.id,
    role: user.role,
    createdAt: new Date().toISOString()
  });
  return token;
}

function endSession(data, token) {
  if (!token) return;
  data.sessions = data.sessions.filter(session => session.token !== token);
}

function publicUser(user) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    provider: user.provider || 'email'
  };
}

module.exports = {
  createPasswordHash,
  endSession,
  getTokenFromRequest,
  hashPassword,
  publicUser,
  startSession
};
