# AI Store Builder - Setup Guide

This guide walks you through setting up all the required services and environment variables for the AI Store Builder.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A web browser for accessing service dashboards

---

## Step 1: Supabase Setup (Required)

Supabase provides the database, authentication, and file storage.

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Choose your organization
4. Enter project details:
   - **Name**: `ai-store-builder` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"** and wait ~2 minutes

### 1.2 Get Your API Keys

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Copy these values to your `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG... (under "anon public")
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (under "service_role" - keep secret!)
   ```

### 1.3 Run Database Migrations

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New Query"**
3. Copy the entire contents of `supabase/setup.sql` and paste it
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. Create another query with `supabase/fix-policies.sql` and run it

### 1.4 Create Storage Buckets

1. Go to **Storage** in the sidebar
2. Click **"New bucket"**
3. Create these buckets:

   **Bucket 1: logos**
   - Name: `logos`
   - Public bucket: ✅ Yes
   - Click "Create bucket"

   **Bucket 2: product-images**
   - Name: `product-images`
   - Public bucket: ✅ Yes
   - Click "Create bucket"

### 1.5 Configure Storage Policies

The `setup.sql` script creates the policies automatically. If images don't upload, manually add these policies:

For **logos** bucket:
1. Click on the `logos` bucket
2. Go to **Policies** tab
3. Add policy: "Allow authenticated uploads"
   - Operation: INSERT
   - Policy: `(auth.role() = 'authenticated')`

For **product-images** bucket (same process):
- Allow authenticated users to INSERT, UPDATE, DELETE
- Allow public SELECT (for viewing images)

---

## Step 2: Google Gemini AI Setup (Required)

Powers the AI features for store creation and product analysis.

### 2.1 Get an API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key to your `.env.local`:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```

### 2.2 Usage Limits

- Free tier: 60 requests/minute, 1,500 requests/day
- This is sufficient for development and small stores
- For production, consider upgrading or implementing caching

---

## Step 3: Razorpay Setup (Required for Payments)

Handles payment processing for Indian stores.

### 3.1 Create a Razorpay Account

1. Go to [razorpay.com](https://razorpay.com) and sign up
2. Complete the basic verification (email, phone)
3. For testing, you don't need full KYC

### 3.2 Get API Keys

1. Go to **Settings** → **API Keys**
2. Click **"Generate Key"** (use Test Mode for development)
3. Copy both keys to your `.env.local`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   ```

> **Note**: `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID` should be the same value. The `NEXT_PUBLIC_` version is exposed to the browser for the checkout.

### 3.3 Configure Webhooks (Optional for development)

Webhooks notify your app when payments complete. For local development, you can skip this or use a tunnel like ngrok.

1. Go to **Settings** → **Webhooks**
2. Click **"+ Add New Webhook"**
3. Configure:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/razorpay`
   - **Secret**: Generate and copy to `RAZORPAY_WEBHOOK_SECRET`
   - **Active Events**:
     - ✅ payment.captured
     - ✅ payment.failed
     - ✅ refund.created
     - ✅ refund.processed

### 3.4 Test Cards

Use these test cards in Test Mode:
- **Success**: 4111 1111 1111 1111 (any future expiry, any CVV)
- **Failure**: 4000 0000 0000 0002

---

## Step 4: Site URLs

Set your site's URL for SEO and search features:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production, replace with your actual domain:
```
NEXT_PUBLIC_SITE_URL=https://mystore.in
NEXT_PUBLIC_BASE_URL=https://mystore.in
```

---

## Step 5: Google Cloud Vision (Optional)

Enables advanced image features like OCR and background removal.

### 5.1 Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your Project ID

### 5.2 Enable the Vision API

1. Go to **APIs & Services** → **Library**
2. Search for "Cloud Vision API"
3. Click **Enable**

### 5.3 Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **Service Account**
3. Name it (e.g., "ai-store-vision")
4. Grant role: **Cloud Vision API User**
5. Click **Done**
6. Click on the service account you created
7. Go to **Keys** tab → **Add Key** → **Create new key**
8. Choose JSON and download

### 5.4 Configure Environment

Option A - File path:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Option B - Inline JSON (for serverless):
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"..."}
```

---

## Step 6: Google Custom Search (Optional)

Enables advanced product search functionality.

### 6.1 Create Custom Search Engine

1. Go to [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
2. Click **"Add"**
3. Configure:
   - Sites to search: Your store domain (e.g., `mystore.in/*`)
   - Name: "AI Store Search"
4. Click **Create**
5. Copy the **Search Engine ID**

### 6.2 Get API Key

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"+ Create Credentials"** → **API Key**
3. Copy the key
4. (Recommended) Restrict the key to "Custom Search API"

### 6.3 Configure Environment

```
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSy...
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=01234567890abcdef:xyz
```

---

## Complete .env.local Template

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Your `.env.local` should look like:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
GEMINI_API_KEY=AIzaSy...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=xxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional
# GOOGLE_CLOUD_PROJECT_ID=...
# GOOGLE_APPLICATION_CREDENTIALS=...
# GOOGLE_CUSTOM_SEARCH_API_KEY=...
# GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...
```

---

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Troubleshooting

### "Razorpay API keys not configured"
- Ensure both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
- Restart the dev server after changing `.env.local`

### "Database error" or "RLS policy violation"
- Run `supabase/fix-policies.sql` in the SQL Editor
- Ensure you're logged in when accessing protected pages

### Images not uploading
- Check storage bucket policies in Supabase
- Ensure buckets are set to Public
- Check browser console for specific errors

### AI features not working
- Verify `GEMINI_API_KEY` is correct
- Check API quota at [Google AI Studio](https://aistudio.google.com)

### Payments failing
- Use Test Mode keys for development
- Check Razorpay dashboard for error details
- Ensure webhook URL is accessible (for production)

---

## Production Checklist

Before going live:

- [ ] Switch Razorpay to Live Mode keys
- [ ] Complete Razorpay KYC verification
- [ ] Set production URLs in environment variables
- [ ] Configure webhook with production URL
- [ ] Set up custom domain in Supabase (optional)
- [ ] Enable email confirmations in Supabase Auth
- [ ] Review and tighten RLS policies
- [ ] Set up monitoring and error tracking

---

## Need Help?

- Check `CLAUDE.md` for detailed project documentation
- Review API routes in `src/app/api/` for implementation details
- Supabase docs: [supabase.com/docs](https://supabase.com/docs)
- Razorpay docs: [razorpay.com/docs](https://razorpay.com/docs)
