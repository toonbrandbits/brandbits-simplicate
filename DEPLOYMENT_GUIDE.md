# 🚀 Deployment Guide - Free Hosting

This guide will help you deploy your time tracking application for free using:
- **Backend**: Railway (FastAPI)
- **Frontend**: Vercel (React)
- **Database**: Supabase (already configured)

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Railway Account** - [railway.app](https://railway.app) (free tier)
3. **Vercel Account** - [vercel.com](https://vercel.com) (free tier)
4. **Supabase Account** - Already configured

## 🔧 Backend Deployment (Railway)

### Step 1: Prepare Your Backend
Your backend is already prepared with the necessary files:
- ✅ `requirements.txt` - Python dependencies
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process definition

### Step 2: Deploy to Railway

1. **Go to [railway.app](https://railway.app)**
2. **Sign up/Login** with your GitHub account
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repository**
5. **Add Environment Variables**:
   ```
   DATABASE_URL=your_supabase_connection_string
   STACK_AUTH_JWKS_URL=your_stackauth_jwks_url
   STACK_AUTH_PROJECT_ID=your_stackauth_project_id
   ```
6. **Deploy** - Railway will automatically detect it's a Python app

### Step 3: Get Your Backend URL
After deployment, Railway will give you a URL like:
`https://your-app-name.railway.app`

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Your Frontend
Your frontend is already prepared with:
- ✅ `vercel.json` - Vercel configuration
- ✅ `package.json` - Dependencies and build scripts

### Step 2: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** with your GitHub account
3. **New Project** → "Import Git Repository"
4. **Select your repository**
5. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Add Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   VITE_STACKAUTH_PROJECT_ID=your_stackauth_project_id
   ```
7. **Deploy**

### Step 3: Get Your Frontend URL
After deployment, Vercel will give you a URL like:
`https://your-app-name.vercel.app`

## 🔗 Connect Everything

### Update Frontend API Configuration
In your frontend, make sure the API calls point to your Railway backend URL.

### Test Your Application
1. Visit your Vercel frontend URL
2. Test the login functionality
3. Test the time tracking features
4. Verify database connections

## 📱 Custom Domain (Optional)

### Railway (Backend)
- Go to your Railway project
- Settings → Domains
- Add custom domain (requires DNS configuration)

### Vercel (Frontend)
- Go to your Vercel project
- Settings → Domains
- Add custom domain (Vercel handles DNS automatically)

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `requirements.txt` for missing dependencies
   - Verify Python version compatibility

2. **Database Connection Issues**
   - Verify `DATABASE_URL` environment variable
   - Check Supabase connection settings

3. **CORS Issues**
   - Add your Vercel domain to Supabase CORS settings
   - Update backend CORS configuration if needed

### Getting Help
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)

## 💰 Cost Breakdown

- **Railway**: Free tier (500 hours/month)
- **Vercel**: Free tier (unlimited)
- **Supabase**: Free tier (500MB database, 50MB file storage)

## 🎉 You're Live!

Once deployed, your time tracking application will be accessible worldwide at:
- Frontend: `https://your-app-name.vercel.app`
- Backend API: `https://your-app-name.railway.app`

Share these URLs with your team and start tracking time! 🕐
