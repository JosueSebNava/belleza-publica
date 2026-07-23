const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'luna-atelier-data')
  : path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

const seedData = {
  users: [
    {
      id: 'staff-1',
      role: 'staff',
      name: 'Recepción Studio',
      email: 'staff@local.com',
      phone: '',
      provider: 'email',
      salt: 'demo-salt',
      passwordHash: 'e38fb497744af929f8ecff05638c8711921fd6f5a001a5c42004fe093b61d295',
      createdAt: '2026-07-23T00:00:00.000Z'
    }
  ],
  appointments: [],
  sessions: []
};

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2));
  }
}

function readData() {
  ensureDatabase();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return {
    users: Array.isArray(data.users) ? data.users : [],
    appointments: Array.isArray(data.appointments) ? data.appointments : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : []
  };
}

function writeData(data) {
  ensureDatabase();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  DATA_FILE,
  readData,
  writeData
};
