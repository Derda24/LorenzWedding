# Lorenz Wedding Photo & Film

Wedding and special occasions photography website.

## Local Development

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

- `ADMIN_SECRET` - Secret key for admin API (optional, defaults to 'lorenz-admin-secret-change-me')
- `SESSION_SECRET` - Secret for session encryption (optional, defaults to 'lorenz-session-secret')

### Important Notes for Vercel

⚠️ **Limitations:**
- **SQLite Database**: The SQLite database file (`data/customers.db`) is ephemeral on Vercel serverless functions. Data will reset on each deployment or after inactivity. For production, consider migrating to:
  - Vercel Postgres
  - PlanetScale
  - Supabase
  - Or another persistent database service

- **File Uploads**: Uploaded photos in `uploads/` directory are also ephemeral. Consider using:
  - Vercel Blob Storage
  - Cloudinary
  - AWS S3
  - Or another cloud storage service

- **Sessions**: Current session storage uses file-based sessions which won't persist on Vercel. Consider:
  - Redis (via Upstash)
  - Database-backed sessions
  - JWT tokens

### Current Admin Credentials

- **Username**: İbrahim Hotface
- **Password**: LorenzWedding.%16

## Project Structure

```
├── api/              # Vercel serverless function
├── assets/           # Images and media
├── css/              # Stylesheets
├── data/             # JSON data files (gallery, videos, etc.)
├── js/               # JavaScript files
├── uploads/          # Customer photo uploads (local only)
├── admin.html        # Admin panel
├── customer-login.html
├── customer-panel.html
├── server.js         # Express server
└── vercel.json       # Vercel configuration
```
