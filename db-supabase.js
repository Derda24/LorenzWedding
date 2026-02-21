/**
 * Supabase (PostgreSQL) database for customers, albums, photos, and approvals.
 * Replaces SQLite for Vercel deployment.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not found. Using fallback mode.');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize database schema (run once via migration SQL)
async function initSchema() {
  if (!supabase) return;
  // Schema is created via SQL migration file (see supabase-migration.sql)
  // This function can be called to verify connection
  try {
    const { error } = await supabase.from('customers').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.warn('⚠️  Tables not found. Run the SQL migration from supabase-migration.sql');
    }
  } catch (e) {
    console.warn('⚠️  Could not verify schema:', e.message);
  }
}

function getDb() {
  return supabase;
}

async function createCustomer(username, passwordHash, name) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('customers')
    .insert({ username, password_hash: passwordHash, name: name || null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getCustomerById(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('id, username, name, created_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

async function getCustomerByUsername(username) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('username', username)
    .single();
  if (error || !data) return null;
  return data;
}

async function createAlbum(customerId, name, eventDate) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('albums')
    .insert({ customer_id: customerId, name: name || null, event_date: eventDate || null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getAlbumByCustomerId(customerId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data;
}

async function getAlbumById(albumId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single();
  if (error || !data) return null;
  return data;
}

async function addPhoto(albumId, path, filename, sortOrder) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('photos')
    .insert({ album_id: albumId, path, filename: filename || null, sort_order: sortOrder || 0 })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getPhotosByAlbumId(albumId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return [];
  return data || [];
}

async function setAlbumSelection(albumId, selectedPhotoIds) {
  if (!supabase) throw new Error('Supabase not configured');
  const json = JSON.stringify(selectedPhotoIds || []);
  const { error } = await supabase
    .from('albums')
    .update({ selected_photo_ids: json })
    .eq('id', albumId);
  if (error) throw error;
}

async function approveAlbum(albumId) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('albums')
    .update({ approved_at: new Date().toISOString() })
    .eq('id', albumId);
  if (error) throw error;
}

async function getAllCustomers() {
  if (!supabase) return [];
  // Get customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, username, name, created_at')
    .order('created_at', { ascending: false });
  if (customersError || !customers) return [];
  
  // Get albums for all customers
  const customerIds = customers.map(c => c.id);
  const { data: albums, error: albumsError } = await supabase
    .from('albums')
    .select('id, customer_id, name, approved_at')
    .in('customer_id', customerIds);
  
  // Create a map of customer_id -> album (most recent)
  const albumMap = new Map();
  if (albums) {
    albums.forEach(album => {
      const existing = albumMap.get(album.customer_id);
      if (!existing || !existing.approved_at || (album.approved_at && album.approved_at > existing.approved_at)) {
        albumMap.set(album.customer_id, album);
      }
    });
  }
  
  // Combine results to match SQLite format
  return customers.map(c => {
    const album = albumMap.get(c.id) || null;
    return {
      id: c.id,
      username: c.username,
      name: c.name,
      created_at: c.created_at,
      album_id: album ? album.id : null,
      album_name: album ? album.name : null,
      approved_at: album ? album.approved_at : null
    };
  });
}

async function getAlbumsByCustomerId(customerId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Gallery items (admin site gallery - stored in DB to avoid 413)
async function getGalleryItems() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('gallery_items')
    .select('item_id, image, title, subtitle, category, sort_order')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) return [];
  return (data || []).map(function (row) {
    return {
      id: row.item_id,
      image: row.image,
      title: row.title || '',
      subtitle: row.subtitle || '',
      category: row.category || 'all'
    };
  });
}

async function replaceGalleryItemsChunk(replace, items) {
  if (!supabase) throw new Error('Supabase not configured');
  if (replace) {
    // Delete all rows: id is BIGSERIAL so id >= 0 matches every row
    const { error: delErr } = await supabase.from('gallery_items').delete().gte('id', 0);
    if (delErr) throw delErr;
  }
  if (!items || items.length === 0) return;
  const rows = items.map(function (item, idx) {
    return {
      item_id: String(item.id || ''),
      image: String(item.image || ''),
      title: item.title || null,
      subtitle: item.subtitle || null,
      category: item.category || null,
      sort_order: idx
    };
  });
  const { error } = await supabase.from('gallery_items').insert(rows);
  if (error) throw error;
}

module.exports = {
  getDb,
  initSchema,
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
  getAlbumsByCustomerId,
  getGalleryItems,
  replaceGalleryItemsChunk
};
