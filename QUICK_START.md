# Quick Start Guide

## 🚀 Get the App Running (Without Supabase)

The app is now configured to run without Supabase for initial testing. You can see the UI and test the basic functionality.

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Access the App
- Open your browser to `http://localhost:3000`
- Navigate to `/experiences/[any-id]` to see the Experience View
- Navigate to `/dashboard/[any-id]` to see the Dashboard View

## 🔧 Full Setup (With Supabase)

To enable full functionality with database and real-time features:

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys

### 2. Set Up Database
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `lib/db/schema.sql`
4. Run the SQL to create tables and policies

### 3. Configure Environment Variables
Update your `.env.local` file with real values:

```env
# Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_actual_whop_app_id
WHOP_API_KEY=your_actual_whop_api_key
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_actual_agent_user_id
NEXT_PUBLIC_WHOP_COMPANY_ID=your_actual_company_id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
```

### 4. Restart the Server
```bash
npm run dev
```

## 🎨 What You'll See

### Experience View (`/experiences/[experienceId]`)
- Beautiful poll cards with voting interface
- Active/Expired tabs
- Real-time vote updates (when Supabase is configured)
- Responsive design

### Dashboard View (`/dashboard/[companyId]`)
- Poll management table
- Create Poll dialog with all features
- Search and filtering
- Statistics dashboard

## 🛠️ Current Status

✅ **Working Without Supabase:**
- UI components and styling
- Navigation and routing
- Form validation
- Basic app structure

⏳ **Requires Supabase:**
- Database operations
- Real-time updates
- User authentication
- Poll creation and voting

The app gracefully handles missing Supabase configuration and will show appropriate warnings in the console.
