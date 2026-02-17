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
    const jsonString = JSON.stringify(data, null, 2);
    console.log(`[Storage] Preparing upload: ${filename} to bucket "${BUCKET}"`);
    console.log(`[Storage] JSON string length: ${jsonString.length} bytes`);
    console.log(`[Storage] Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
    console.log(`[Storage] Service Role Key: ${supabaseKey ? 'Set (' + supabaseKey.substring(0, 20) + '...)' : 'Missing'}`);
    
    // Try multiple approaches for Node.js compatibility
    let body;
    if (typeof Blob !== 'undefined') {
      // Node.js 18+ has global Blob
      body = new Blob([jsonString], { type: 'application/json' });
      console.log('[Storage] Using Blob for upload');
    } else {
      // Fallback to Buffer
      body = Buffer.from(jsonString, 'utf8');
      console.log('[Storage] Using Buffer for upload');
    }
    
    console.log(`[Storage] Body type: ${body.constructor.name}, size: ${body.length || body.size} bytes`);
    
    // Try upload with upsert
    let { data: uploadData, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, body, { contentType: 'application/json', upsert: true });
    
    // If upsert fails, try delete + upload
    if (error && (error.message.includes('duplicate') || error.statusCode === 409)) {
      console.log('[Storage] Upsert failed, trying delete then upload...');
      // Try to remove existing file first
      await supabase.storage.from(BUCKET).remove([filename]);
      // Retry upload
      const retryResult = await supabase.storage
        .from(BUCKET)
        .upload(filename, body, { contentType: 'application/json', upsert: true });
      uploadData = retryResult.data;
      error = retryResult.error;
    }
    
    if (error) {
      console.error('[Storage] Upload error details:', JSON.stringify(error, null, 2));
      console.error('[Storage] Error message:', error.message);
      console.error('[Storage] Error statusCode:', error.statusCode);
      console.error('[Storage] Error code:', error.code);
      console.error('[Storage] Error name:', error.name);
      
      // Check for common errors
      let errorMsg = error.message || 'Unknown storage error';
      let hint = '';
      
      if (error.message && (error.message.includes('Bucket not found') || error.message.includes('does not exist'))) {
        errorMsg = `Bucket "${BUCKET}" bulunamadı.`;
        hint = `Supabase Dashboard → Storage → "${BUCKET}" bucket'ını oluşturun.`;
      } else if (error.message && (error.message.includes('row-level security') || error.message.includes('RLS') || error.message.includes('permission'))) {
        errorMsg = `Bucket "${BUCKET}" için izin sorunu.`;
        hint = `Bucket'ı public yapın: Storage → "${BUCKET}" → Settings → Public bucket: ON. Service Role Key kullanıldığından emin olun.`;
      } else if (error.statusCode === 403 || error.statusCode === 401) {
        errorMsg = `Bucket "${BUCKET}" için yetkilendirme hatası (${error.statusCode}).`;
        hint = `SUPABASE_SERVICE_ROLE_KEY doğru mu? Bucket public mi? Service Role Key kullanıldığından emin olun (anon key değil).`;
      } else if (error.statusCode === 400) {
        errorMsg = `Geçersiz istek (400): ${error.message}`;
        hint = `Bucket adı ("${BUCKET}") ve dosya adını ("${filename}") kontrol edin.`;
      } else if (error.statusCode === 413) {
        errorMsg = `Dosya çok büyük (413).`;
        hint = `Dosya boyutu limitini kontrol edin.`;
      } else {
        errorMsg = `Storage hatası: ${error.message || 'Bilinmeyen hata'}`;
        hint = `Supabase Storage yapılandırmasını kontrol edin. Status: ${error.statusCode || 'N/A'}`;
      }
      
      return { ok: false, error: errorMsg, hint: hint, code: error.statusCode || error.code, rawError: error.message };
    }
    
    console.log('[Storage] Upload successful:', filename);
    console.log('[Storage] Upload data:', JSON.stringify(uploadData, null, 2));
    return { ok: true };
  } catch (err) {
    console.error('[Storage] Upload exception:', err);
    console.error('[Storage] Exception name:', err.name);
    console.error('[Storage] Exception message:', err.message);
    console.error('[Storage] Exception stack:', err.stack);
    return { ok: false, error: err.message || 'Unknown error', hint: 'Supabase Storage bağlantısını kontrol edin.' };
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
