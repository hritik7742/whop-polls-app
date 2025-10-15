# Deployment Guide

This guide will help you deploy your Whop Polls app to Vercel.

## Environment Variables Setup

### Required Environment Variables for Vercel:

Add these environment variables in your Vercel dashboard:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Whop SDK Configuration
```
WHOP_API_KEY=your_whop_api_key
```

#### Whop Payment Integration (Public - accessible in browser)
```
NEXT_PUBLIC_WHOP_ACCESS_PASS_ID=acc_your_access_pass_id_here
NEXT_PUBLIC_WHOP_PLAN_ID=plan_your_plan_id_here
```

#### Whop Webhook Secret (Private - server only)
```
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
```

#### Next.js Configuration
```
NEXTAUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Deployment Steps

### 1. GitHub Setup
1. Create a new repository on GitHub
2. Push your code to GitHub (environment files are automatically ignored)
3. Connect your GitHub repository to Vercel

### 2. Vercel Configuration
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Add all environment variables listed above
5. Deploy

### 3. Post-Deployment Setup
1. Update your Whop app Base URL to your Vercel domain
2. Set up webhook URL in Whop dashboard: `https://your-vercel-app.vercel.app/api/webhooks/whop`
3. Test the application

## Important Notes

- Environment files (`.env.local`, `.env.development`) are automatically ignored by Git
- Never commit sensitive environment variables to GitHub
- Use Vercel's environment variable settings for production secrets
- Update `NEXTAUTH_URL` to your production domain after deployment

## Webhook Permissions

Enable these webhook permissions in your Whop dashboard:
- `payment_succeeded`
- `payment_failed` 
- `membership_went_valid`
- `membership_went_invalid`
- `membership_cancel_at_period_end_changed`
