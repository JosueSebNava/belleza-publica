const http = require('http');
const fs = require('fs');
const path = require('path');
const { readData, writeData } = require('./database');
const {
  createPasswordHash,
  endSession,
  getTokenFromRequest,
  hashPassword,
  publicUser,
  startSession
} = require('./auth');

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getAuthUser(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const data = readData();
  const session = data.sessions.find(item => item.token === token);
  if (!session) return null;

  const user = data.users.find(item => item.id === session.userId);
  return user ? { user, token } : null;
}

function serveFrontend(req, res) {
  const requestPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(FRONTEND_DIR, safePath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.svg': 'image/svg+xml'
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function registerClient(req, res) {
  const body = await readBody(req);

  if (body.role === 'staff') {
    return json(res, 403, { error: 'El registro de miembros del local debe hacerse por administración.' });
  }

  if (!body.name || !validateEmail(body.email) || !body.password || body.password.length < 6) {
    return json(res, 400, { error: 'Agrega nombre, correo válido y contraseña de al menos 6 caracteres.' });
  }

  const data = readData();
  const email = body.email.trim().toLowerCase();

  if (data.users.some(user => user.email === email)) {
    return json(res, 409, { error: 'Ya existe una cuenta con ese correo.' });
  }

  const password = createPasswordHash(body.password);
  const user = {
    id: cryptoRandomId(),
    role: 'client',
    name: String(body.name).trim(),
    email,
    phone: String(body.phone || '').trim(),
    provider: 'email',
    salt: password.salt,
    passwordHash: password.passwordHash,
    createdAt: new Date().toISOString()
  };

  data.users.push(user);
  const token = startSession(data, user);
  writeData(data);

  return json(res, 201, { user: publicUser(user), token });
}

async function login(req, res) {
  const body = await readBody(req);

  if (!validateEmail(body.email) || !body.password) {
    return json(res, 400, { error: 'Correo o contraseña inválidos.' });
  }

  const data = readData();
  const email = body.email.trim().toLowerCase();
  const user = data.users.find(item => item.email === email);

  if (!user || hashPassword(body.password, user.salt) !== user.passwordHash) {
    return json(res, 401, { error: 'Correo o contraseña incorrectos.' });
  }

  if (body.role && body.role !== user.role) {
    return json(res, 403, { error: 'Esta cuenta no corresponde a ese tipo de acceso.' });
  }

  const token = startSession(data, user);
  writeData(data);

  return json(res, 200, { user: publicUser(user), token });
}

async function oauthDemo(req, res) {
  const body = await readBody(req);
  const provider = body.provider === 'facebook' ? 'facebook' : 'google';
  const email = `${provider}.cliente@demo.local`;
  const data = readData();

  let user = data.users.find(item => item.email === email);

  if (!user) {
    const password = createPasswordHash(cryptoRandomId());
    user = {
      id: cryptoRandomId(),
      role: 'client',
      name: provider === 'facebook' ? 'Cliente Facebook' : 'Cliente Google',
      email,
      phone: '',
      provider,
      salt: password.salt,
      passwordHash: password.passwordHash,
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
  }

  const token = startSession(data, user);
  writeData(data);

  return json(res, 200, {
    user: publicUser(user),
    token,
    demo: true,
    message: 'OAuth real requiere credenciales de Google/Facebook; este botón simula el flujo.'
  });
}

function logout(req, res) {
  const token = getTokenFromRequest(req);
  const data = readData();
  endSession(data, token);
  writeData(data);
  return json(res, 200, { ok: true });
}

async function createAppointment(req, res) {
  const auth = getAuthUser(req);

  if (!auth || auth.user.role !== 'client') {
    return json(res, 401, { error: 'Inicia sesión como cliente para agendar.' });
  }

  const body = await readBody(req);
  const required = ['service', 'date', 'time'];

  if (required.some(key => !body[key])) {
    return json(res, 400, { error: 'Selecciona servicio, fecha y hora.' });
  }

  const data = readData();
  const appointment = {
    id: cryptoRandomId(),
    clientId: auth.user.id,
    clientName: auth.user.name,
    clientEmail: auth.user.email,
    clientPhone: String(body.phone || auth.user.phone || '').trim(),
    service: String(body.service).trim(),
    date: String(body.date).trim(),
    time: String(body.time).trim(),
    notes: String(body.notes || '').trim(),
    status: 'Confirmada',
    createdAt: new Date().toISOString(),
    emailNotification: {
      to: auth.user.email,
      subject: 'Recordatorio de cita',
      scheduledFor: `${body.date} ${body.time}`,
      status: 'demo-ready'
    }
  };

  data.appointments.push(appointment);

  const idx = data.users.findIndex(user => user.id === auth.user.id);
  if (idx >= 0) {
    data.users[idx].phone = appointment.clientPhone;
  }

  writeData(data);

  return json(res, 201, {
    appointment,
    emailNotice: `Se preparó un recordatorio para ${auth.user.email}. Para envío real se conecta un servicio SMTP/SendGrid.`
  });
}

function listStaffAppointments(req, res) {
  const auth = getAuthUser(req);

  if (!auth || auth.user.role !== 'staff') {
    return json(res, 403, { error: 'Acceso exclusivo para miembros del local.' });
  }

  const data = readData();
  return json(res, 200, { appointments: data.appointments.slice().reverse() });
}

function listMyAppointments(req, res) {
  const auth = getAuthUser(req);

  if (!auth || auth.user.role !== 'client') {
    return json(res, 401, { error: 'Inicia sesión como cliente.' });
  }

  const data = readData();
  const appointments = data.appointments
    .filter(item => item.clientId === auth.user.id)
    .slice()
    .reverse();

  return json(res, 200, { appointments });
}

async function handleApi(req, res) {
  try {
    if (req.method === 'POST' && req.url === '/api/register') return registerClient(req, res);
    if (req.method === 'POST' && req.url === '/api/login') return login(req, res);
    if (req.method === 'POST' && req.url === '/api/oauth-demo') return oauthDemo(req, res);
    if (req.method === 'POST' && req.url === '/api/logout') return logout(req, res);
    if (req.method === 'POST' && req.url === '/api/appointments') return createAppointment(req, res);
    if (req.method === 'GET' && req.url === '/api/appointments') return listStaffAppointments(req, res);
    if (req.method === 'GET' && req.url === '/api/my-appointments') return listMyAppointments(req, res);

    if (req.method === 'GET' && req.url === '/api/me') {
      const auth = getAuthUser(req);
      return auth ? json(res, 200, { user: publicUser(auth.user) }) : json(res, 401, { error: 'Sesión no iniciada.' });
    }

    return json(res, 404, { error: 'Endpoint no encontrado.' });
  } catch (error) {
    return json(res, 500, { error: error.message || 'Error del servidor.' });
  }
}

function cryptoRandomId() {
  return require('crypto').randomUUID();
}

function requestHandler(req, res) {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
    return;
  }
  serveFrontend(req, res);
}

function startServer(port = PORT) {
  const server = http.createServer(requestHandler);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Frontend + Backend running on http://localhost:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  requestHandler,
  startServer
};
