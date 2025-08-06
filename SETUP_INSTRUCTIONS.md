# Technifold Sales Website Setup Instructions

## Step 1: Get Your Supabase Keys

1. Go to https://app.supabase.com
2. Select your project (or create a new one if you haven't already)
3. Click on **Settings** (gear icon) in the left sidebar
4. Click on **API** in the settings menu
5. Copy these values:
   - **Project URL** (starts with https://xxxxx.supabase.co)
   - **anon public** key (this is safe to expose in frontend)
   - **service_role** key (KEEP THIS SECRET - only for server-side)

## Step 2: Configure Environment Variables

1. Create a `.env.local` file in the `technifold-sales` folder
2. Add your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App URL (change this when deploying)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Create Database Tables

1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy ALL the content from `supabase/schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)

You should see "Success. No rows returned" - this means the tables were created successfully.

## Step 4: Import Your Data

Run this command in your terminal (make sure you're in the technifold-sales folder):

```bash
npm run setup-db
```

This will:
- Import all products from your CSV files
- Set up tool-manufacturer relationships
- Import tool-consumable compatibility
- Import customer data
- Set up customer-tool relationships

## Step 5: Copy Product Images

Copy your product images folder to the public directory:

```bash
cp -r ../product_images public/
```

Or manually copy the `product_images` folder into `technifold-sales/public/`

## Step 6: Run the Application

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

## Troubleshooting

### If you get "Missing Supabase credentials" error:
- Make sure you created the `.env.local` file (not `.env`)
- Check that you copied the keys correctly
- Restart the development server after adding the keys

### If the dropdowns are empty:
- Check that the database tables were created (Step 3)
- Run `npm run setup-db` to import the data (Step 4)
- Check the browser console for any errors

### If images don't show:
- Make sure you copied the product_images folder to the public directory
- Check that image filenames match product codes exactly

## Next Steps

Once everything is working locally:

1. **Deploy to Vercel:**
   - Push your code to GitHub
   - Connect to Vercel
   - Add the same environment variables in Vercel's settings

2. **Add Stripe Integration:**
   - Get your Stripe API keys from https://dashboard.stripe.com
   - Add them to `.env.local`:
     ```
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_SECRET_KEY=sk_test_...
     ```

3. **Set Up Email Reminders:**
   - Configure a cron job or use Vercel Cron Functions
   - Set up email service (SendGrid, Resend, etc.)

## Support

If you need help, check:
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- The browser console for error messages