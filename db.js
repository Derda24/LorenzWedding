/**
 * SQLite database for customers, albums, photos, and approvals.
 * Uses better-sqlite3 (sync API, fast).
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'customers.db');

let db = null;

function getDb() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name TEXT,
      event_date TEXT,
      selected_photo_ids TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      filename TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_albums_customer ON albums(customer_id);
    CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
  `);

  return db;
}

function createCustomer(username, passwordHash, name) {
  const d = getDb();
  const stmt = d.prepare('INSERT INTO customers (username, password_hash, name) VALUES (?, ?, ?)');
  const run = stmt.run(username, passwordHash, name || null);
  return run.lastInsertRowid;
}

function getCustomerById(id) {
  const d = getDb();
  return d.prepare('SELECT id, username, name, created_at FROM customers WHERE id = ?').get(id);
}

function getCustomerByUsername(username) {
  const d = getDb();
  return d.prepare('SELECT * FROM customers WHERE username = ?').get(username);
}

function createAlbum(customerId, name, eventDate) {
  const d = getDb();
  const stmt = d.prepare('INSERT INTO albums (customer_id, name, event_date) VALUES (?, ?, ?)');
  const run = stmt.run(customerId, name || null, eventDate || null);
  return run.lastInsertRowid;
}

function getAlbumByCustomerId(customerId) {
  const d = getDb();
  return d.prepare('SELECT * FROM albums WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1').get(customerId);
}

function getAlbumById(albumId) {
  const d = getDb();
  return d.prepare('SELECT * FROM albums WHERE id = ?').get(albumId);
}

function addPhoto(albumId, path, filename, sortOrder) {
  const d = getDb();
  const stmt = d.prepare('INSERT INTO photos (album_id, path, filename, sort_order) VALUES (?, ?, ?, ?)');
  const run = stmt.run(albumId, path, filename || null, sortOrder ?? 0);
  return run.lastInsertRowid;
}

function getPhotosByAlbumId(albumId) {
  const d = getDb();
  return d.prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY sort_order, id').all(albumId);
}

function setAlbumSelection(albumId, selectedPhotoIds) {
  const d = getDb();
  const json = JSON.stringify(selectedPhotoIds || []);
  d.prepare('UPDATE albums SET selected_photo_ids = ? WHERE id = ?').run(json, albumId);
}

function approveAlbum(albumId) {
  const d = getDb();
  d.prepare("UPDATE albums SET approved_at = datetime('now') WHERE id = ?").run(albumId);
}

function getAllCustomers() {
  const d = getDb();
  return d.prepare(`
    SELECT c.id, c.username, c.name, c.created_at,
           a.id AS album_id, a.name AS album_name, a.approved_at
    FROM customers c
    LEFT JOIN albums a ON a.customer_id = c.id
    ORDER BY c.created_at DESC
  `).all();
}

function getAlbumsByCustomerId(customerId) {
  const d = getDb();
  return d.prepare('SELECT * FROM albums WHERE customer_id = ? ORDER BY created_at DESC').all(customerId);
}

module.exports = {
  getDb,
  createCustomer,
  getCustomerById,
  getCustomerByUsername,
  createAlbum,
  getAlbumByCustomerId,
  getAlbumById,
  addPhoto,
  getPhotosByAlbumId,
  setAlbumSelection,
  approveAlbum,
  getAllCustomers,
  getAlbumsByCustomerId
};
