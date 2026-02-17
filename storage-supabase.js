/**
 * Supabase Storage for site JSON files (gallery, videos, featured, services).
 * Bucket: site-data (create in Supabase Dashboard → Storage).
 */
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'site-data';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function isAvailable() {
  return !!supabase;
}

/**
 * Upload JSON to Storage (overwrites if exists).
 * @param {string} filename - e.g. 'gallery.json'
 * @param {object} data - JSON-serializable object
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function uploadJson(filename, data) {
  if (!supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  try {
    const body = JSON.stringify(data, null, 2);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, body, { contentType: 'application/json', upsert: true });
    if (error) {
      console.error('Supabase Storage upload error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('Supabase Storage upload exception:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Download JSON from Storage.
 * @param {string} filename - e.g. 'gallery.json'
 * @returns {Promise<{ data: object | null, error?: string }>}
 */
async function getJson(filename) {
  if (!supabase) {
    return { data: null, error: 'Supabase not configured' };
  }
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(filename);
    if (error) {
      if (error.message && error.message.includes('not found')) {
        return { data: null };
      }
      console.error('Supabase Storage download error:', error);
      return { data: null, error: error.message };
    }
    if (!data) return { data: null };
    const text = await data.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { data: null, error: 'Invalid JSON' };
    }
    return { data: parsed };
  } catch (err) {
    console.error('Supabase Storage getJson exception:', err);
    return { data: null, error: err.message };
  }
}

module.exports = {
  isAvailable,
  uploadJson,
  getJson,
  BUCKET
};
