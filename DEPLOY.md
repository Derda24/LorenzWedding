# Vercel Deployment Guide

## Quick Deploy

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy** (first time - will prompt for project setup):
   ```bash
   vercel
   ```

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Important Notes

⚠️ **Current Limitations on Vercel:**

1. **SQLite Database**: The database file resets on each deployment. For production, you'll need to migrate to a persistent database (Postgres, MySQL, etc.)

2. **File Uploads**: Uploaded photos won't persist. Use cloud storage (Vercel Blob, Cloudinary, S3, etc.)

3. **Sessions**: File-based sessions won't work. Use Redis or database sessions.

## Environment Variables (Optional)

Set in Vercel Dashboard → Settings → Environment Variables:

- `ADMIN_SECRET` - Admin API secret (defaults to 'lorenz-admin-secret-change-me')
- `SESSION_SECRET` - Session encryption secret (defaults to 'lorenz-session-secret')

## Testing After Deploy

1. Visit your Vercel URL
2. Test admin login: `/admin.html`
   - Username: İbrahim Hotface
   - Password: LorenzWedding.%16
3. Test customer portal: `/customer-login.html`

## Troubleshooting

- **API routes not working**: Check that `api/index.js` exists and exports the Express app
- **Static files not loading**: Ensure files are in the project root (not in a subdirectory)
- **Database errors**: SQLite won't persist on Vercel - migrate to a cloud database
