# LORENZWED Photo & Film

Wedding and special occasions photography website.

## Local Development

### Option 1: Using SQLite (Default, No Setup Required)

```bash
npm install
npm start
```

The app will use SQLite (`data/customers.db`) automatically when `SUPABASE_URL` is not set.

### Option 2: Using Supabase (Recommended for Production)

1. Set up Supabase (see `SUPABASE_SETUP.md`)
2. Create a `.env` file:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Run:
   ```bash
   npm install
   npm start
   ```

Visit:
- Home: http://localhost:3000
- Admin: http://localhost:3000/admin.html
- Customer Login: http://localhost:3000/customer-login.html

## Vercel Deployment

### Prerequisites
- Vercel account
- Vercel CLI installed (`npm i -g vercel`)

### Deploy

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   For production:
   ```bash
   vercel --prod
   ```

### Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

**Required for Supabase:**
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Supabase dashboard → Settings → API)

**Optional:**
- `ADMIN_SECRET` - Secret key for admin API (optional, defaults to 'lorenz-admin-secret-change-me')
- `SESSION_SECRET` - Secret for session encryption (optional, defaults to 'lorenz-session-secret')

### Database Setup

**For Production (Vercel):** Use Supabase (PostgreSQL). See `SUPABASE_SETUP.md` for detailed setup instructions.

The app automatically uses:
- **Supabase** when `SUPABASE_URL` is set (production/Vercel)
- **SQLite** when `SUPABASE_URL` is not set (local development)

### Important Notes for Vercel

⚠️ **File Uploads**: Uploaded photos in `uploads/` directory are ephemeral on Vercel. Consider using:
- Vercel Blob Storage
- Cloudinary
- AWS S3
- Supabase Storage
- Or another cloud storage service

⚠️ **Sessions**: Current session storage uses file-based sessions which won't persist on Vercel. Consider:
- Redis (via Upstash)
- Database-backed sessions
- JWT tokens

### Current Admin Credentials

- **Username**: İbrahim Hotface
- **Password**: LORENZWED.%16

## Project Structure

```
├── api/                  # Vercel serverless function
├── assets/               # Images and media
├── css/                  # Stylesheets
├── data/                 # JSON data files (gallery, videos, etc.)
├── js/                   # JavaScript files
├── uploads/              # Customer photo uploads (local only)
├── admin.html            # Admin panel
├── customer-login.html
├── customer-panel.html
├── db.js                 # Database adapter (auto-selects SQLite or Supabase)
├── db-sqlite.js          # SQLite implementation (local dev)
├── db-supabase.js        # Supabase implementation (production)
├── supabase-migration.sql # Database schema for Supabase
├── server.js             # Express server
├── SUPABASE_SETUP.md     # Supabase setup guide
└── vercel.json           # Vercel configuration
```
