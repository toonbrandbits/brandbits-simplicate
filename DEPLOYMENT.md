# 🚀 Deployment Guide - TimeFlow Application

This guide covers multiple ways to deploy your time tracking application online.

## 📋 Prerequisites

- Your application code (already done ✅)
- A GitHub repository (recommended)
- Basic understanding of environment variables

## 🎯 Quick Start Options

### Option 1: Railway (Recommended - Easiest)

Railway is perfect for full-stack applications and handles everything automatically.

#### Steps:
1. **Sign up at [railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Add services:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will detect your apps automatically

4. **Configure services:**
   - **Database:** Add PostgreSQL service
   - **Backend:** Railway will detect your Python app
   - **Frontend:** Railway will detect your React app

5. **Set environment variables:**
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   VITE_API_URL=https://your-backend-url.railway.app
   ```

6. **Deploy:** Railway handles the rest automatically!

**Cost:** Free tier available, then $5/month per service

---

### Option 2: Render

Similar to Railway with a generous free tier.

#### Steps:
1. **Sign up at [render.com](https://render.com)**
2. **Create three services:**

   **PostgreSQL Database:**
   - New → PostgreSQL
   - Name: `timeflow-db`
   - Save the connection string

   **Backend (Web Service):**
   - New → Web Service
   - Connect GitHub repo
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     ```
     DATABASE_URL=your_postgres_connection_string
     ```

   **Frontend (Static Site):**
   - New → Static Site
   - Connect GitHub repo
   - Build Command: `cd frontend && yarn install && yarn build`
   - Publish Directory: `frontend/dist`
   - Environment Variables:
     ```
     VITE_API_URL=https://your-backend-url.onrender.com
     ```

**Cost:** Free tier available

---

### Option 3: Vercel + Supabase

Best for React apps with separate backend.

#### Steps:
1. **Frontend on Vercel:**
   - Sign up at [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect React app
   - Set environment variable: `VITE_API_URL=https://your-backend-url`

2. **Database on Supabase:**
   - Sign up at [supabase.com](https://supabase.com)
   - Create new project
   - Get connection string from Settings → Database
   - Run your database migrations

3. **Backend on Railway/Render:**
   - Deploy backend using Option 1 or 2
   - Use Supabase connection string

**Cost:** Free tiers available

---

## 🐳 Docker Deployment (Advanced)

If you want full control over your deployment:

### Local Testing with Docker

```bash
# Clone your repository
git clone <your-repo-url>
cd <your-repo-name>

# Copy environment file
cp env.example .env

# Start all services
docker-compose up -d

# Your app will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Database: localhost:5432
```

### Deploy to VPS/Cloud Server

1. **Get a VPS** (DigitalOcean, Linode, AWS EC2, etc.)
2. **Install Docker and Docker Compose**
3. **Clone your repository**
4. **Configure environment variables**
5. **Run:** `docker-compose up -d`

---

## ⚙️ Environment Configuration

### Required Environment Variables

**Backend (.env or platform environment):**
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_URL_DEV=postgresql://username:password@host:port/database
DATABASE_URL_PROD=postgresql://username:password@host:port/database

# Authentication (if using StackAuth)
STACK_AUTH_JWKS_URL=your_jwks_url
STACK_AUTH_PROJECT_ID=your_project_id
```

**Frontend (build-time environment):**
```bash
# API URL
VITE_API_URL=https://your-backend-url.com
```

### Database Setup

After deploying, you need to initialize your database:

```bash
# If using Railway/Render, connect to your backend service terminal
cd backend
python setup_database.py
```

Or run the SQL migrations manually in your database admin panel.

---

## 🔧 Platform-Specific Instructions

### Railway Deployment

1. **Connect Repository:**
   - Go to Railway dashboard
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Add PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will provide connection details

3. **Deploy Backend:**
   - Railway auto-detects your Python app
   - Set environment variables in the service settings
   - Use the PostgreSQL connection string

4. **Deploy Frontend:**
   - Add another service for your React app
   - Set `VITE_API_URL` to your backend URL

### Render Deployment

1. **Database:**
   - New → PostgreSQL
   - Save the connection string

2. **Backend:**
   - New → Web Service
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Frontend:**
   - New → Static Site
   - Build Command: `cd frontend && yarn install && yarn build`
   - Publish Directory: `frontend/dist`

### Vercel Deployment

1. **Frontend:**
   - Import GitHub repository
   - Vercel auto-detects React
   - Set environment variables in project settings

2. **Build Settings:**
   - Build Command: `cd frontend && yarn build`
   - Output Directory: `frontend/dist`

---

## 🚨 Common Issues & Solutions

### Database Connection Issues
- **Problem:** "Database connection failed"
- **Solution:** Check your `DATABASE_URL` environment variable
- **Debug:** Test connection with `python test_connection.py`

### Frontend Can't Reach Backend
- **Problem:** CORS errors or 404s
- **Solution:** Set `VITE_API_URL` correctly
- **Debug:** Check browser network tab

### Build Failures
- **Problem:** Build commands failing
- **Solution:** Check your `package.json` and `requirements.txt`
- **Debug:** Test builds locally first

### Authentication Issues
- **Problem:** StackAuth not working
- **Solution:** Verify `STACK_AUTH_JWKS_URL` and `STACK_AUTH_PROJECT_ID`
- **Debug:** Check backend logs

---

## 📊 Monitoring & Maintenance

### Health Checks
- **Backend:** `GET /health` (you may need to add this endpoint)
- **Database:** Monitor connection pool
- **Frontend:** Check for JavaScript errors

### Logs
- **Railway:** Built-in logging dashboard
- **Render:** Service logs in dashboard
- **Vercel:** Function logs in dashboard

### Updates
- **Code changes:** Push to GitHub, platform auto-deploys
- **Database migrations:** Run manually or add to deployment script
- **Dependencies:** Update `requirements.txt` and `package.json`

---

## 💰 Cost Comparison

| Platform | Free Tier | Paid Plans | Best For |
|----------|-----------|------------|----------|
| Railway | Limited | $5/service/month | Full-stack apps |
| Render | Generous | $7/month | Multiple services |
| Vercel | Generous | $20/month | Frontend focus |
| Supabase | 500MB DB | $25/month | Database focus |

---

## 🎉 Next Steps

1. **Choose your deployment platform**
2. **Set up your database**
3. **Configure environment variables**
4. **Deploy and test**
5. **Set up monitoring**
6. **Configure custom domain (optional)**

## 📞 Need Help?

- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Render:** [render.com/docs](https://render.com/docs)
- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)

---

**Recommended for beginners:** Start with Railway - it's the easiest and handles everything automatically!
