/**
 * LORENZWED – local server + admin API + customer portal API
 * Run: npm install && npm start
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
// Use cookie-session for Vercel compatibility (serverless functions don't share memory)
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
let db;
let storageSupabase;
try {
  storageSupabase = require('./storage-supabase');
} catch (e) {
  storageSupabase = null;
}
try {
  db = require('./db');
} catch (error) {
  console.error('Failed to load database module:', error);
  console.error('Error stack:', error.stack);
  // Create a dummy db object to prevent crashes
  db = {
    getDb: () => null,
    initSchema: () => Promise.resolve(),
    createCustomer: () => Promise.reject(new Error('Database not initialized')),
    getCustomerById: () => Promise.resolve(null),
    getCustomerByUsername: () => Promise.resolve(null),
    createAlbum: () => Promise.reject(new Error('Database not initialized')),
    getAlbumByCustomerId: () => Promise.resolve(null),
    getAlbumById: () => Promise.resolve(null),
    addPhoto: () => Promise.reject(new Error('Database not initialized')),
    getPhotosByAlbumId: () => Promise.resolve([]),
    setAlbumSelection: () => Promise.reject(new Error('Database not initialized')),
    approveAlbum: () => Promise.reject(new Error('Database not initialized')),
    getAllCustomers: () => Promise.resolve([]),
    getAlbumsByCustomerId: () => Promise.resolve([])
  };
}

const app = express();
const PORT = process.env.PORT || 3000;
const isVercelEnv = process.env.VERCEL || process.env.VERCEL_ENV;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'lorenz-admin-secret-change-me';

// Set Content Security Policy header
app.use(function (req, res, next) {
  // CSP with Google Fonts and other external resources support
  // Allow Vercel Live feedback script and unsafe-eval for compatibility
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; " + // unsafe-eval and Vercel Live
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " + // Google Fonts CSS
    "font-src 'self' data: https://fonts.gstatic.com; " + // Google Fonts fonts
    "img-src 'self' data: https:; " + // All HTTPS images
    "connect-src 'self' https://*.supabase.co https://vercel.live; " + // Supabase API and Vercel Live
    "frame-src 'self' https://vercel.live; " + // Allow Vercel Live iframe
    "frame-ancestors 'none';"
  );
  next();
});

// Only create directories locally (not on Vercel - read-only filesystem)
if (!isVercelEnv) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json({ limit: '50mb' }));

// Determine the correct base directory for static files
// When api/index.js requires '../server', __dirname in server.js is the project root
// But on Vercel, we need to verify the path
let staticDir = __dirname;

try {
  // On Vercel, verify and find the correct path
  if (isVercelEnv) {
    const possiblePaths = [
      __dirname, // Project root (most likely - when required from api/index.js)
      path.join(__dirname, '..'), // One level up (if __dirname is api/)
      process.cwd() // Current working directory
    ];
    
    // Find the path that contains index.html
    for (const testPath of possiblePaths) {
      try {
        const indexPath = path.join(testPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          staticDir = testPath;
          console.log('Found static files at:', staticDir);
          break;
        }
      } catch (e) {
        console.warn('Error checking path:', testPath, e.message);
      }
    }
    
    // Log for debugging
    console.log('Vercel static file detection:');
    console.log('  __dirname:', __dirname);
    console.log('  process.cwd():', process.cwd());
    console.log('  Using staticDir:', staticDir);
    try {
      console.log('  index.html exists:', fs.existsSync(path.join(staticDir, 'index.html')));
    } catch (e) {
      console.warn('  Cannot check index.html:', e.message);
    }
  }

  // Serve static files (works both locally and on Vercel)
  // Serve CSS, JS, images, and other assets
  app.use(express.static(staticDir, {
    index: 'index.html',
    extensions: ['html'],
    setHeaders: (res, path) => {
      // Set proper content types
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  console.log('Static file middleware configured for:', staticDir);
  
  // Log available files for debugging
  try {
    const cssDir = path.join(staticDir, 'css');
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir);
      console.log('CSS files found:', cssFiles);
    } else {
      console.warn('CSS directory not found at:', cssDir);
    }
  } catch (e) {
    console.warn('Could not list CSS files:', e.message);
  }
} catch (error) {
  console.error('Error setting up static file serving:', error);
  console.error('Error stack:', error.stack);
  // Continue anyway - routes might still work
}

// Use cookie-session for Vercel (serverless) compatibility
// Cookie-session stores session data directly in cookies, not in server memory
// This works across different serverless function instances
// Note: Cookie size limit is ~4KB, so keep session data minimal
const SESSION_SECRET_VALUE = process.env.SESSION_SECRET || 'lorenz-session-secret-change-me-in-production';
console.log('[Session] Initializing cookie-session');
console.log('[Session] SESSION_SECRET is set?', !!process.env.SESSION_SECRET);
console.log('[Session] Using secret:', SESSION_SECRET_VALUE.substring(0, 10) + '...');
console.log('[Session] Vercel env?', !!process.env.VERCEL);

app.use(cookieSession({
  name: 'customer_session',
  keys: [SESSION_SECRET_VALUE],
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: process.env.VERCEL ? true : false, // HTTPS only on Vercel
  sameSite: 'lax',
  signed: true // Sign cookies for security
}));

// Log session middleware setup (only for API routes to avoid spam)
app.use(function (req, res, next) {
  if (req.path.startsWith('/api/')) {
    console.log('[Session Middleware] Request path:', req.path);
    console.log('[Session Middleware] Request cookies:', req.headers.cookie);
    console.log('[Session Middleware] Session after cookie-session:', req.session ? JSON.stringify(req.session) : 'null');
  }
  next();
});

// Intercept response to log Set-Cookie headers
app.use(function (req, res, next) {
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    if (req.path.startsWith('/api/')) {
      console.log('[Response] Response headers:', res.getHeaders());
      const setCookie = res.getHeader('set-cookie');
      console.log('[Response] Set-Cookie header:', setCookie);
    }
    originalEnd.call(this, chunk, encoding);
  };
  next();
});

function ensureDataDir() {
  // Only create directory locally (not on Vercel)
  if (!isVercelEnv && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function adminAuth(req, res, next) {
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) return next();
  res.status(403).json({ error: 'Forbidden' });
}

function customerAuth(req, res, next) {
  console.log('[Customer Auth] Checking session...');
  console.log('[Customer Auth] Request URL:', req.url);
  console.log('[Customer Auth] Request method:', req.method);
  console.log('[Customer Auth] Request cookies header:', req.headers.cookie);
  console.log('[Customer Auth] Session object:', req.session ? JSON.stringify(req.session) : 'null');
  console.log('[Customer Auth] Session keys:', req.session ? Object.keys(req.session) : 'no session');
  console.log('[Customer Auth] Customer ID:', req.session ? req.session.customerId : 'no session');
  console.log('[Customer Auth] Session type:', typeof req.session);
  
  // Check if session exists and has customerId
  if (req.session && typeof req.session === 'object' && req.session.customerId) {
    console.log('[Customer Auth] ✓ Authorized, customer ID:', req.session.customerId);
    return next();
  }
  
  console.log('[Customer Auth] ✗ Unauthorized - no customer ID in session');
  console.log('[Customer Auth] Session exists?', !!req.session);
  console.log('[Customer Auth] Session is object?', req.session && typeof req.session === 'object');
  console.log('[Customer Auth] customerId exists?', req.session && req.session.customerId);
  res.status(401).json({ error: 'Unauthorized' });
}

// ---------- Data API: serve JSON from Supabase Storage or static data/ ----------
const ALLOWED_DATA_FILES = ['gallery.json', 'videos.json', 'featured.json', 'services.json'];

app.get('/api/data/:filename', function (req, res) {
  const filename = req.params.filename;
  if (!ALLOWED_DATA_FILES.includes(filename)) {
    return res.status(404).json({ error: 'Not found' });
  }
  (async function () {
    if (storageSupabase && storageSupabase.isAvailable()) {
      const { data, error } = await storageSupabase.getJson(filename);
      if (error) {
        console.warn('Storage getJson error:', filename, error);
      }
      if (data) {
        return res.json(data);
      }
    }
    const filePath = path.join(DATA_DIR, filename);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(raw);
        return res.json(json);
      }
    } catch (e) {
      console.warn('Read data file failed:', filePath, e.message);
    }
    res.status(404).json({ error: 'Not found' });
  })();
});

// ---------- Save content API (admin only) ----------
// Saves to Supabase Storage on Vercel, or to data/ locally
function saveJsonToData(filename, data, res) {
  // Check if we should use Supabase Storage
  const useStorage = isVercelEnv && storageSupabase && storageSupabase.isAvailable();
  
  if (useStorage) {
    console.log('[Save] Using Supabase Storage for:', filename);
    console.log('[Save] Bucket:', storageSupabase.BUCKET);
    console.log('[Save] Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('[Save] Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
    
    storageSupabase.uploadJson(filename, data).then(function (result) {
      if (result.ok) {
        console.log('[Save] Successfully uploaded to Storage:', filename);
        res.json({ ok: true });
      } else {
        console.error('[Save] Storage upload failed:', filename);
        console.error('[Save] Error:', result.error);
        console.error('[Save] Hint:', result.hint);
        console.error('[Save] Code:', result.code);
        console.error('[Save] Raw Error:', result.rawError);
        console.error('[Save] Full Error:', result.fullError);
        const errorMsg = result.error || 'Storage upload failed';
        let hint = result.hint || 'Supabase Storage yapılandırmasını kontrol edin.';
        // Add raw error to hint for debugging
        if (result.rawError && result.rawError !== errorMsg) {
          hint += '\n\nGerçek hata: ' + result.rawError;
        }
        res.status(500).json({ ok: false, error: errorMsg, hint: hint, rawError: result.rawError, code: result.code });
      }
    }).catch(function (err) {
      console.error('[Save] Save to Storage exception:', filename, err);
      console.error('[Save] Exception stack:', err.stack);
      res.status(500).json({ 
        ok: false, 
        error: err.message || 'Storage upload exception',
        hint: 'Supabase Storage bucket oluşturuldu mu? Dashboard\'da kontrol edin.'
      });
    });
    return;
  }
  
  // On Vercel without Storage, return helpful error
  if (isVercelEnv) {
    const reasons = [];
    if (!process.env.SUPABASE_URL) reasons.push('SUPABASE_URL eksik');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) reasons.push('SUPABASE_SERVICE_ROLE_KEY eksik');
    if (!storageSupabase) reasons.push('Storage modülü yüklenemedi');
    if (storageSupabase && !storageSupabase.isAvailable()) reasons.push('Supabase Storage yapılandırılmamış');
    
    return res.status(503).json({
      ok: false,
      error: 'Vercel\'de dosya yazma desteklenmiyor.',
      hint: 'Supabase Storage kullanmak için: 1) Supabase Dashboard → Storage → "site-data" bucket oluşturun, 2) Vercel\'de SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY environment variable\'larını kontrol edin. ' + (reasons.length > 0 ? 'Sorun: ' + reasons.join(', ') : '')
    });
  }
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (err) {
    console.error('Save failed:', filename, err);
    res.status(500).json({ ok: false, error: 'Dosya yazılamadı: ' + err.message });
  }
}

app.post('/api/save-gallery', adminAuth, function (req, res) {
  saveJsonToData('gallery.json', req.body, res);
});
app.post('/api/save-videos', adminAuth, function (req, res) {
  saveJsonToData('videos.json', req.body, res);
});
app.post('/api/save-featured', adminAuth, function (req, res) {
  saveJsonToData('featured.json', req.body, res);
});
app.post('/api/save-services', adminAuth, function (req, res) {
  saveJsonToData('services.json', req.body, res);
});

// ---------- Customer auth ----------
app.post('/api/customer-login', async function (req, res) {
  try {
    console.log('[Customer Login] Request received');
    const { username, password } = req.body || {};
    console.log('[Customer Login] Username:', username ? username.trim() : 'missing');
    console.log('[Customer Login] Password:', password ? 'provided' : 'missing');
    
    if (!username || !password) {
      console.log('[Customer Login] Missing username or password');
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }
    
    const trimmedUsername = username.trim();
    console.log('[Customer Login] Looking up customer:', trimmedUsername);
    const customer = await db.getCustomerByUsername(trimmedUsername);
    
    if (!customer) {
      console.log('[Customer Login] Customer not found:', trimmedUsername);
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
    
    console.log('[Customer Login] Customer found:', customer.id, customer.username);
    console.log('[Customer Login] Comparing password...');
    const match = bcrypt.compareSync(password, customer.password_hash);
    
    if (!match) {
      console.log('[Customer Login] Password mismatch');
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
    
    console.log('[Customer Login] Password correct, creating session...');
    console.log('[Customer Login] Session before setting:', JSON.stringify(req.session));
    
    // cookie-session automatically saves to cookie when response is sent
    // Keep session data minimal (cookie size limit ~4KB)
    req.session.customerId = customer.id;
    
    console.log('[Customer Login] Session after setting:', JSON.stringify(req.session));
    console.log('[Customer Login] Customer ID:', customer.id);
    console.log('[Customer Login] Session will be saved automatically by cookie-session');
    
    // Send response - cookie-session will set cookie automatically
    res.json({ ok: true, customer: { id: customer.id, username: customer.username, name: customer.name } });
    
    // Log after response (cookie should be set now)
    console.log('[Customer Login] Response sent, cookie should be set');
  } catch (err) {
    console.error('[Customer Login] Exception:', err);
    console.error('[Customer Login] Stack:', err.stack);
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
});

app.post('/api/customer-logout', function (req, res) {
  // cookie-session: set session to null to clear cookie
  req.session = null;
  res.json({ ok: true });
});

app.get('/api/customer/me', customerAuth, async function (req, res) {
  try {
    const customer = await db.getCustomerById(req.session.customerId);
    if (!customer) return res.status(401).json({ error: 'Unauthorized' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ---------- Customer album & selection ----------
app.get('/api/customer/album', customerAuth, async function (req, res) {
  try {
    const album = await db.getAlbumByCustomerId(req.session.customerId);
    if (!album) {
      return res.json({ album: null, photos: [], selectedIds: [], approvedAt: null });
    }
    const photos = await db.getPhotosByAlbumId(album.id);
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
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.put('/api/customer/selection', customerAuth, async function (req, res) {
  try {
    const album = await db.getAlbumByCustomerId(req.session.customerId);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    const photoIds = Array.isArray(req.body.photoIds) ? req.body.photoIds.map(Number) : [];
    await db.setAlbumSelection(album.id, photoIds);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.post('/api/customer/approve', customerAuth, async function (req, res) {
  try {
    const album = await db.getAlbumByCustomerId(req.session.customerId);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    await db.approveAlbum(album.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// ---------- Admin: customers & albums ----------
app.get('/api/admin/customers', adminAuth, async function (req, res) {
  try {
    const list = await db.getAllCustomers();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.post('/api/admin/customers', adminAuth, async function (req, res) {
  try {
    const { username, password, name } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli.' });
    }
    const hash = bcrypt.hashSync(password.trim(), 10);
    const id = await db.createCustomer(username.trim(), hash, (name || '').trim());
    res.json({ ok: true, id });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === '23505') {
      return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor.' });
    }
    res.status(400).json({ error: e.message || 'Hata oluştu.' });
  }
});

app.post('/api/admin/albums', adminAuth, async function (req, res) {
  try {
    const { customer_id, name, event_date } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: 'customer_id gerekli.' });
    const id = await db.createAlbum(Number(customer_id), (name || '').trim(), (event_date || '').trim());
    res.json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Hata oluştu.' });
  }
});

app.get('/api/admin/albums', adminAuth, async function (req, res) {
  try {
    const customerId = req.query.customer_id;
    if (!customerId) return res.status(400).json({ error: 'customer_id gerekli.' });
    const list = await db.getAlbumsByCustomerId(Number(customerId));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

app.get('/api/admin/albums/:id', adminAuth, async function (req, res) {
  try {
    const album = await db.getAlbumById(Number(req.params.id));
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    const photos = await db.getPhotosByAlbumId(album.id);
    let selectedIds = [];
    try {
      if (album.selected_photo_ids) selectedIds = JSON.parse(album.selected_photo_ids);
    } catch (e) {}
    const baseUrl = '/uploads/albums/' + album.id + '/';
    const photosWithUrl = photos.map(function (p) {
      return { id: p.id, url: baseUrl + (p.filename || path.basename(p.path)), filename: p.filename, selected: selectedIds.indexOf(p.id) !== -1 };
    });
    res.json({ album, photos: photosWithUrl, selectedIds, approvedAt: album.approved_at });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// Multer storage configuration
// On Vercel, file uploads won't work (read-only filesystem), but we'll configure it anyway
const albumUploadDir = path.join(UPLOADS_DIR, 'albums');

// Only create directories locally (not on Vercel)
if (!isVercelEnv) {
  if (!fs.existsSync(albumUploadDir)) {
    fs.mkdirSync(albumUploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // On Vercel, use /tmp directory (writable)
    if (isVercelEnv) {
      const tmpDir = '/tmp/uploads/albums';
      if (!fs.existsSync(tmpDir)) {
        try {
          fs.mkdirSync(tmpDir, { recursive: true });
        } catch (e) {
          console.warn('Could not create tmp upload dir:', e.message);
        }
      }
      const albumId = req.params.id;
      const dir = path.join(tmpDir, String(albumId));
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
          console.warn('Could not create album dir:', e.message);
        }
      }
      cb(null, dir);
    } else {
      // Local development
      const albumId = req.params.id;
      const dir = path.join(albumUploadDir, String(albumId));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    }
  },
  filename: function (req, file, cb) {
    const safe = (file.originalname || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({ storage });

app.post('/api/admin/albums/:id/photos', adminAuth, upload.array('photos', 50), async function (req, res) {
  try {
    const albumId = Number(req.params.id);
    const album = await db.getAlbumById(albumId);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    const files = req.files || [];
    const existingPhotos = await db.getPhotosByAlbumId(albumId);
    let order = existingPhotos.length;
    for (const f of files) {
      await db.addPhoto(albumId, f.path, f.filename, order++);
    }
    res.json({ ok: true, count: files.length });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

// Serve uploads directory (only if directory exists or can be created)
try {
  const uploadsStaticDir = isVercelEnv ? path.join(__dirname, '..', 'uploads') : UPLOADS_DIR;
  // Don't fail if uploads directory doesn't exist
  if (fs.existsSync(uploadsStaticDir) || !isVercelEnv) {
    app.use('/uploads', express.static(uploadsStaticDir));
  }
} catch (err) {
  console.warn('Could not set up uploads directory:', err.message);
}

// Helper function to serve HTML files
function serveHtmlFile(filename, req, res) {
  try {
    // On Vercel, __dirname in server.js is the project root (when required from api/index.js)
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, filename), // Project root (most likely)
      path.join(staticDir, filename), // Detected static dir
      path.join(process.cwd(), filename), // Current working directory
      path.join(__dirname, '..', filename) // One level up
    ];
    
    console.log(`Attempting to serve ${filename}`);
    console.log('  __dirname:', __dirname);
    console.log('  staticDir:', staticDir);
    console.log('  process.cwd():', process.cwd());
    
    // Try each path
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          console.log(`✓ Found ${filename} at:`, filePath);
          res.sendFile(filePath);
          return;
        } else {
          console.log(`✗ Not found:`, filePath);
        }
      } catch (e) {
        console.warn(`Error checking ${filePath}:`, e.message);
      }
    }
    
    // If not found, list available files in __dirname for debugging
    try {
      const files = fs.readdirSync(__dirname);
      console.error(`Available files in __dirname (${__dirname}):`, files.filter(f => f.endsWith('.html')).slice(0, 10));
    } catch (e) {
      console.error('Cannot read __dirname:', e.message);
    }
    
    // If not found, log details and return 404
    console.error(`${filename} not found at any path`);
    console.error('Tried paths:', possiblePaths);
    
    res.status(404).send(`Not Found - ${filename} not found. Check function logs for details.`);
  } catch (err) {
    console.error(`Error serving ${filename}:`, err);
    console.error('Error stack:', err.stack);
    if (!res.headersSent) {
      res.status(500).send('Server Error: ' + err.message);
    }
  }
}

// Explicit routes for HTML files
app.get('/', function (req, res) {
  serveHtmlFile('index.html', req, res);
});

app.get('/videos.html', function (req, res) {
  serveHtmlFile('videos.html', req, res);
});

app.get('/customer-login.html', function (req, res) {
  serveHtmlFile('customer-login.html', req, res);
});

app.get('/photos.html', function (req, res) {
  serveHtmlFile('photos.html', req, res);
});

app.get('/contact.html', function (req, res) {
  serveHtmlFile('contact.html', req, res);
});

app.get('/about.html', function (req, res) {
  serveHtmlFile('about.html', req, res);
});

app.get('/faq.html', function (req, res) {
  serveHtmlFile('faq.html', req, res);
});

app.get('/services.html', function (req, res) {
  serveHtmlFile('services.html', req, res);
});

app.get('/admin.html', function (req, res) {
  serveHtmlFile('admin.html', req, res);
});

app.get('/admin-customers.html', function (req, res) {
  serveHtmlFile('admin-customers.html', req, res);
});

app.get('/customer-panel.html', function (req, res) {
  serveHtmlFile('customer-panel.html', req, res);
});

// Note: Static file serving via express.static() above handles all static files including index.html
// The root route '/' will be handled by express.static() automatically due to index: 'index.html'

// Log startup info when loaded as module (for Vercel)
if (require.main !== module) {
  console.log('Server.js loaded as module');
  console.log('__dirname:', __dirname);
  console.log('process.cwd():', process.cwd());
  const indexPath = path.join(staticDir, 'index.html');
  console.log('index.html path:', indexPath);
  console.log('index.html exists:', fs.existsSync(indexPath));
  try {
    const files = fs.readdirSync(staticDir);
    console.log('Files in staticDir (first 20):', files.slice(0, 20));
  } catch (e) {
    console.error('Cannot read staticDir:', e.message);
  }
}

// Only start server if running directly (not imported as module)
if (require.main === module) {
  app.listen(PORT, async function () {
    db.getDb();
    if (db.initSchema) {
      await db.initSchema();
    }
    console.log('LORENZWED – http://localhost:' + PORT);
    console.log('Admin: http://localhost:' + PORT + '/admin.html');
    console.log('Müşteri girişi: http://localhost:' + PORT + '/customer-login.html');
    if (process.env.SUPABASE_URL) {
      console.log('✓ Using Supabase database');
    } else {
      console.log('✓ Using SQLite database (local)');
    }
  });
}

module.exports = app;
