# Whop Polls App Setup Guide

## Prerequisites

1. **Whop App Setup**
   - Create a Whop app in your dashboard
   - Get your App ID, API Key, and Agent User ID
   - Set up your Company ID

2. **Supabase Setup**
   - Create a new Supabase project
   - Get your project URL, anon key, and service role key
   - Run the SQL schema from `lib/db/schema.sql` in your Supabase SQL editor

## Environment Variables

Create a `.env.local` file in the `whop-app` directory with the following variables:

```env
# Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id_here
WHOP_API_KEY=your_whop_api_key_here
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id_here
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `lib/db/schema.sql`
4. Run the SQL to create all tables, indexes, and RLS policies

## Features Implemented

### Experience View (`/experiences/[experienceId]`)
- View active and expired polls
- Vote on polls (one vote per user per poll)
- Real-time vote count updates
- Beautiful poll cards with progress bars
- Responsive design

### Dashboard View (`/dashboard/[companyId]`)
- Create new polls with full configuration
- Manage existing polls
- Search and filter polls
- View poll statistics
- Delete polls
- Admin-only access

### Poll Creation Features
- Question with 500 character limit
- 2-10 answer options (100 chars each)
- Poll expiry settings (12h, 24h, 48h, 1 week)
- Anonymous voting option
- Push notification toggle
- Character counters

### Technical Features
- Supabase real-time subscriptions
- Row Level Security (RLS)
- Optimistic UI updates
- Error handling
- Responsive design
- Dark theme with Radix colors
- shadcn/ui components

## Running the App

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The app will be available at `http://localhost:3000`

## API Endpoints

- `POST /api/polls` - Create a new poll
- `POST /api/polls/[pollId]/vote` - Vote on a poll
- `DELETE /api/polls/[pollId]` - Delete a poll

## Database Schema

The app uses three main tables:
- `polls` - Stores poll information
- `poll_options` - Stores poll answer options
- `poll_votes` - Stores user votes

All tables have Row Level Security enabled for data protection.

## Styling

The app uses:
- Tailwind CSS for styling
- Radix UI colors for semantic color tokens
- shadcn/ui components for consistent UI
- Whop's frosted theme integration
- Responsive design principles

## Security

- User authentication via Whop SDK
- Access control for experiences and companies
- Row Level Security on all database tables
- Input validation and sanitization
- CSRF protection via Next.js
