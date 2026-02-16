# Supabase Setup Guide for Lorenz Wedding

This guide will help you set up Supabase as the database for your Lorenz Wedding website.

## Why Supabase?

- **PostgreSQL Database**: Reliable, scalable, and works perfectly with Vercel
- **No Native Dependencies**: Unlike SQLite (`better-sqlite3`), Supabase doesn't require native compilation
- **Cloud-Hosted**: No need to manage database files or worry about ephemeral file systems
- **Free Tier**: Generous free tier for small to medium projects

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `lorenz-wedding` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Run the Database Migration

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-migration.sql` from this project
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" - this means the tables were created successfully

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API** (left sidebar)
2. You'll need two values:
   - **Project URL**: Copy the "Project URL" (looks like `https://xxxxx.supabase.co`)
   - **Service Role Key**: Copy the "service_role" key (⚠️ Keep this secret! It bypasses Row Level Security)

## Step 4: Configure Environment Variables

### For Local Development

Create a `.env` file in your project root:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_SECRET=your-admin-secret-here
SESSION_SECRET=your-session-secret-here
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `SUPABASE_URL` = Your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase Service Role Key
   - `ADMIN_SECRET` = Your admin secret (same as before)
   - `SESSION_SECRET` = Your session secret (same as before)
4. Make sure to add them for **Production**, **Preview**, and **Development** environments
5. Click **Save**

## Step 5: Update Your Code

The code has already been updated to use Supabase when `SUPABASE_URL` is set. The system will:
- Use **Supabase** (PostgreSQL) when `SUPABASE_URL` environment variable is present
- Use **SQLite** (local file) when `SUPABASE_URL` is not set (for local development without Supabase)

## Step 6: Test Locally

1. Make sure your `.env` file is set up (see Step 4)
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. You should see: `✓ Using Supabase database` in the console
5. Test the admin panel and customer login

## Step 7: Deploy to Vercel

1. Make sure environment variables are set in Vercel (Step 4)
2. Push your code to GitHub
3. Vercel will automatically redeploy
4. The build should succeed without `better-sqlite3` compilation errors!

## Migration from SQLite to Supabase (Optional)

If you have existing data in SQLite that you want to migrate:

1. Export your SQLite data (you can use a SQLite browser tool)
2. Convert the data format to match PostgreSQL (mainly: `INTEGER` → `BIGINT`, `TEXT` → `TEXT`, `datetime('now')` → `NOW()`)
3. Insert the data into Supabase using the SQL Editor or a migration script

## Troubleshooting

### "Tables not found" error
- Make sure you ran the SQL migration (`supabase-migration.sql`) in the Supabase SQL Editor

### "Invalid API key" error
- Double-check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables
- Make sure you're using the **service_role** key, not the **anon** key

### Still using SQLite locally
- Check that your `.env` file exists and has `SUPABASE_URL` set
- Restart your server after creating/updating `.env`

### Connection errors
- Verify your Supabase project is active (not paused)
- Check that your IP isn't blocked (unlikely on free tier)
- Ensure you're using the correct project URL

## Security Notes

- ⚠️ **Never commit** your `.env` file or expose your `SUPABASE_SERVICE_ROLE_KEY` publicly
- The service role key bypasses Row Level Security - keep it secret!
- Consider enabling Row Level Security (RLS) in Supabase for additional security (see commented lines in `supabase-migration.sql`)

## Next Steps

- Set up Row Level Security policies if needed
- Configure backups in Supabase dashboard
- Monitor usage in Supabase dashboard → Settings → Usage
