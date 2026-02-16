/**
 * Lorenz Wedding – local server + admin API + customer portal API
 * Run: npm install && npm start
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'lorenz-admin-secret-change-me';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '50mb' }));

// Only serve static files when running locally (not on Vercel)
if (require.main === module) {
  app.use(express.static(__dirname));
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'lorenz-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function adminAuth(req, res, next) {
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) return next();
  res.status(403).json({ error: 'Forbidden' });
}

function customerAuth(req, res, next) {
  if (req.session && req.session.customerId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ---------- Existing content API (admin only) ----------
app.post('/api/save-gallery', adminAuth, function (req, res) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, 'gallery.json'), JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});
app.post('/api/save-videos', adminAuth, function (req, res) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, 'videos.json'), JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});
app.post('/api/save-featured', adminAuth, function (req, res) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, 'featured.json'), JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});
app.post('/api/save-services', adminAuth, function (req, res) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, 'services.json'), JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});

// ---------- Customer auth ----------
app.post('/api/customer-login', function (req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
  }
  const customer = db.getCustomerByUsername(username.trim());
  if (!customer) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }
  const match = bcrypt.compareSync(password, customer.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }
  req.session.customerId = customer.id;
  req.session.save(function (err) {
    if (err) return res.status(500).json({ error: 'Oturum açılamadı.' });
    res.json({ ok: true, customer: { id: customer.id, username: customer.username, name: customer.name } });
  });
});

app.post('/api/customer-logout', function (req, res) {
  req.session.destroy(function () {
    res.json({ ok: true });
  });
});

app.get('/api/customer/me', customerAuth, function (req, res) {
  const customer = db.getCustomerById(req.session.customerId);
  if (!customer) return res.status(401).json({ error: 'Unauthorized' });
  res.json(customer);
});

// ---------- Customer album & selection ----------
app.get('/api/customer/album', customerAuth, function (req, res) {
  const album = db.getAlbumByCustomerId(req.session.customerId);
  if (!album) {
    return res.json({ album: null, photos: [], selectedIds: [], approvedAt: null });
  }
  const photos = db.getPhotosByAlbumId(album.id);
  let selectedIds = [];
  try {
    if (album.selected_photo_ids) selectedIds = JSON.parse(album.selected_photo_ids);
  } catch (e) {}
  const baseUrl = '/uploads/albums/' + album.id + '/';
  const photosWithUrl = photos.map(function (p) {
    return { id: p.id, url: baseUrl + (p.filename || path.basename(p.path)), filename: p.filename };
  });
  res.json({
    album: { id: album.id, name: album.name, event_date: album.event_date },
    photos: photosWithUrl,
    selectedIds: selectedIds,
    approvedAt: album.approved_at
  });
});

app.put('/api/customer/selection', customerAuth, function (req, res) {
  const album = db.getAlbumByCustomerId(req.session.customerId);
  if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
  const photoIds = Array.isArray(req.body.photoIds) ? req.body.photoIds.map(Number) : [];
  db.setAlbumSelection(album.id, photoIds);
  res.json({ ok: true });
});

app.post('/api/customer/approve', customerAuth, function (req, res) {
  const album = db.getAlbumByCustomerId(req.session.customerId);
  if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
  db.approveAlbum(album.id);
  res.json({ ok: true });
});

// ---------- Admin: customers & albums ----------
app.get('/api/admin/customers', adminAuth, function (req, res) {
  const list = db.getAllCustomers();
  res.json(list);
});

app.post('/api/admin/customers', adminAuth, function (req, res) {
  const { username, password, name } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
  }
  const hash = bcrypt.hashSync(password.trim(), 10);
  try {
    const id = db.createCustomer(username.trim(), hash, (name || '').trim());
    res.json({ ok: true, id });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }
    throw e;
  }
});

app.post('/api/admin/albums', adminAuth, function (req, res) {
  const { customer_id, name, event_date } = req.body || {};
  if (!customer_id) return res.status(400).json({ error: 'customer_id gerekli.' });
  try {
    const id = db.createAlbum(Number(customer_id), (name || '').trim(), (event_date || '').trim());
    res.json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/admin/albums', adminAuth, function (req, res) {
  const customerId = req.query.customer_id;
  if (!customerId) return res.status(400).json({ error: 'customer_id gerekli.' });
  const list = db.getAlbumsByCustomerId(Number(customerId));
  res.json(list);
});

app.get('/api/admin/albums/:id', adminAuth, function (req, res) {
  const album = db.getAlbumById(Number(req.params.id));
  if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
  const photos = db.getPhotosByAlbumId(album.id);
  let selectedIds = [];
  try {
    if (album.selected_photo_ids) selectedIds = JSON.parse(album.selected_photo_ids);
  } catch (e) {}
  const baseUrl = '/uploads/albums/' + album.id + '/';
  const photosWithUrl = photos.map(function (p) {
    return { id: p.id, url: baseUrl + (p.filename || path.basename(p.path)), filename: p.filename, selected: selectedIds.indexOf(p.id) !== -1 };
  });
  res.json({ album, photos: photosWithUrl, selectedIds, approvedAt: album.approved_at });
});

const albumUploadDir = path.join(UPLOADS_DIR, 'albums');
if (!fs.existsSync(albumUploadDir)) fs.mkdirSync(albumUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const albumId = req.params.id;
    const dir = path.join(albumUploadDir, String(albumId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const safe = (file.originalname || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({ storage });

app.post('/api/admin/albums/:id/photos', adminAuth, upload.array('photos', 50), function (req, res) {
  const albumId = Number(req.params.id);
  const album = db.getAlbumById(albumId);
  if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
  const files = req.files || [];
  let order = db.getPhotosByAlbumId(albumId).length;
  for (const f of files) {
    db.addPhoto(albumId, f.path, f.filename, order++);
  }
  res.json({ ok: true, count: files.length });
});

app.use('/uploads', express.static(UPLOADS_DIR));

// Only start server if running directly (not imported as module)
if (require.main === module) {
  app.listen(PORT, function () {
    db.getDb();
    console.log('Lorenz Wedding – http://localhost:' + PORT);
    console.log('Admin: http://localhost:' + PORT + '/admin.html');
    console.log('Müşteri girişi: http://localhost:' + PORT + '/customer-login.html');
  });
}

module.exports = app;
