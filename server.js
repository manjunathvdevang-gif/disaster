// server.js - DisasterAlert backend (Node + Express + JSON file)

// top of server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// allow requests from all origins during dev
app.use(cors());
app.use(express.json());

// quick ping route to test backend
app.get('/', (req, res) => res.send('DisasterAlert API is running.'));
app.get('/ping', (req, res) => res.json({ ok: true, time: Date.now() }));

// rest of your routes below...
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`DisasterAlert API running on http://localhost:${PORT}`));

const DB_FILE = path.join(__dirname, 'db.json');



// CORS for dev only
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helpers
function genId(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const now = Date.now();
    const seed = {
      incidents: [
        {
          id: 'inc_demo',
          title: 'Demo: small fire near market',
          description: 'Smoke at corner shop',
          location: 'MG Road',
          category: 'fire',
          imageUrl: null,
          reporterId: 'user_demo',
          status: 'reported',
          comments: [{ id: 'c_demo', author: 'Responder', text: 'On the way', ts: now }],
          likes: 0,
          ts: now - 1000 * 60 * 60
        },
        {
          id: 'inc_flood',
          title: 'Flooded street in downtown',
          description: 'Heavy rain caused flooding on Main St.',
          location: 'Main St',
          category: 'flood',
          imageUrl: null,
          reporterId: 'user_flood',
          status: 'reported',
          comments: [],
          likes: 2,
          ts: now - 1000 * 60 * 120
        },
        {
          id: 'inc_eq',
          title: 'Minor earthquake felt',
          description: 'Tremors reported by residents',
          location: 'Sector 21',
          category: 'earthquake',
          imageUrl: null,
          reporterId: 'user_eq',
          status: 'verified',
          comments: [],
          likes: 1,
          ts: now - 1000 * 60 * 180
        },
        {
          id: 'inc_cyclone',
          title: 'Cyclone warning issued',
          description: 'Authorities have issued a cyclone warning for coastal areas.',
          location: 'Coastal Zone',
          category: 'cyclone',
          imageUrl: null,
          reporterId: 'user_cyclone',
          status: 'in_progress',
          comments: [],
          likes: 3,
          ts: now - 1000 * 60 * 240
        },
        {
          id: 'inc_landslide',
          title: 'Landslide blocks highway',
          description: 'Debris on road after heavy rain',
          location: 'Hill Highway',
          category: 'landslide',
          imageUrl: null,
          reporterId: 'user_land',
          status: 'resolved',
          comments: [],
          likes: 0,
          ts: now - 1000 * 60 * 300
        }
      ],
      users: [
        { id: 'user_demo', name: 'Demo User' },
        { id: 'user_flood', name: 'Flood Reporter' },
        { id: 'user_eq', name: 'EQ Reporter' },
        { id: 'user_cyclone', name: 'Cyclone Reporter' },
        { id: 'user_land', name: 'Landslide Reporter' }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
}
function readDB(){ initDB(); return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
function writeDB(data){ fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

const STATUS_FLOW = ['reported','verified','in_progress','resolved'];

/* Routes */

// Health check
app.get('/health', (req,res) => res.json({ ok: true }));

// List incidents (filters: category, status, q, onlyActive)
app.get('/incidents', (req,res) => {
  const { category, status, q, onlyActive } = req.query;
  let { incidents } = readDB();
  if (category) incidents = incidents.filter(i => i.category === category);
  if (status) incidents = incidents.filter(i => i.status === status);
  if (q) {
    const qq = q.toLowerCase();
    incidents = incidents.filter(i =>
      (i.title||'').toLowerCase().includes(qq) ||
      (i.description||'').toLowerCase().includes(qq) ||
      (i.location||'').toLowerCase().includes(qq)
    );
  }
  if (onlyActive === 'true') incidents = incidents.filter(i => i.status !== 'resolved');
  incidents.sort((a,b)=> (b.ts||0) - (a.ts||0));
  res.json(incidents);
});

// Create incident
// body: { title, description, location, category, imageUrl?, reporterId? }
app.post('/incidents', (req,res) => {
  const { title, description, location, category, imageUrl = null, reporterId = null } = req.body;
  if (!title || !description || !location || !category) {
    return res.status(400).json({ error: 'title, description, location and category are required' });
  }
  const db = readDB();
  const incident = {
    id: genId('inc'),
    title: String(title),
    description: String(description),
    location: String(location),
    category: String(category).toLowerCase(),
    imageUrl,
    reporterId: reporterId || 'anonymous',
    status: 'reported',
    comments: [],
    likes: 0,
    ts: Date.now()
  };
  db.incidents.push(incident);
  if (reporterId) {
    db.users = db.users || [];
    if (!db.users.find(u => u.id === reporterId)) db.users.push({ id: reporterId, name: reporterId });
  }
  writeDB(db);
  res.status(201).json(incident);
});

// Incident details
app.get('/incidents/:id', (req,res) => {
  const db = readDB();
  const inc = (db.incidents||[]).find(i => i.id === req.params.id);
  if (!inc) return res.status(404).json({ error: 'incident not found' });
  res.json(inc);
});

// Update status: body { status }
app.put('/incidents/:id/status', (req,res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  const s = String(status).toLowerCase();
  if (!STATUS_FLOW.includes(s)) return res.status(400).json({ error: 'invalid status' });
  const db = readDB();
  const idx = (db.incidents||[]).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'incident not found' });
  db.incidents[idx].status = s;
  writeDB(db);
  res.json({ success: true, id: req.params.id, status: s });
});

// Add comment: body { author, text }
app.post('/incidents/:id/comment', (req,res) => {
  const { author = 'anonymous', text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const db = readDB();
  const idx = (db.incidents||[]).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'incident not found' });
  const comment = { id: genId('c'), author: String(author), text: String(text), ts: Date.now() };
  db.incidents[idx].comments = db.incidents[idx].comments || [];
  db.incidents[idx].comments.push(comment);
  writeDB(db);
  res.status(201).json(comment);
});

// Like incident
app.post('/incidents/:id/like', (req,res) => {
  const db = readDB();
  const idx = (db.incidents||[]).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'incident not found' });
  db.incidents[idx].likes = (db.incidents[idx].likes || 0) + 1;
  writeDB(db);
  res.json({ success: true, likes: db.incidents[idx].likes });
});

// User's incidents (history)
app.get('/users/:userId/incidents', (req,res) => {
  const userId = req.params.userId;
  const db = readDB();
  const list = (db.incidents || []).filter(i => i.reporterId === userId).sort((a,b)=> b.ts - a.ts);
  res.json(list);
});

// Basic analytics
app.get('/analytics', (req,res) => {
  const db = readDB();
  const incidents = db.incidents || [];
  const byCategory = {}; const byStatus = {};
  incidents.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });
  res.json({ total: incidents.length, byCategory, byStatus });
});

// Delete (admin)
app.delete('/incidents/:id', (req,res) => {
  const db = readDB();
  const idx = (db.incidents || []).findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'incident not found' });
  db.incidents.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

/* Start server */
app.listen(PORT, () => console.log(`DisasterAlert API running on http://localhost:${PORT}`));
