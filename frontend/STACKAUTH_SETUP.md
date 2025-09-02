# StackAuth Setup Guide

## How to Use Your Own StackAuth Account

This guide will help you switch from Databutton's StackAuth to your own StackAuth account.

### Step 1: Get Your StackAuth Credentials

1. Go to your StackAuth dashboard
2. Navigate to your project settings
3. Copy the following values:
   - **Project ID**
   - **JWKS URL** (usually `https://your-project.stack-auth.com/jwks`)
   - **Publishable Client Key**

### Step 2: Create Environment Files

#### Frontend Environment File
Create a `.env` file in the `frontend` directory with your StackAuth credentials:

```bash
# Custom StackAuth Configuration
STACK_AUTH_PROJECT_ID=your_project_id_here
STACK_AUTH_JWKS_URL=https://your-project.stack-auth.com/jwks
STACK_AUTH_PUBLISHABLE_CLIENT_KEY=your_publishable_client_key_here
STACK_AUTH_HANDLER_URL=auth

# Backend API URL (if different from default)
API_URL=http://localhost:8000
```

#### Backend Environment File
Create a `.env` file in the `backend` directory with your StackAuth credentials:

```bash
# Custom StackAuth Configuration for Backend
STACK_AUTH_PROJECT_ID=your_project_id_here
STACK_AUTH_JWKS_URL=https://your-project.stack-auth.com/jwks
```

### Step 3: Test the Configuration

1. Start your backend application:
   ```bash
   cd backend
   python3 main.py
   ```
   Look for: "Using custom StackAuth configuration from environment variables"

2. Start your frontend application:
   ```bash
   cd frontend
   npm run dev
   ```
   Check the console logs to see which configuration is being used:
   - "Using custom StackAuth configuration" = Your own StackAuth
   - "Using Databutton StackAuth configuration" = Databutton's StackAuth

### Step 4: Verify Authentication

1. Try logging in with your StackAuth account
2. Check that authentication works properly
3. Verify that user data is being retrieved correctly

### Fallback Behavior

The application will:
1. **First try** to use your custom StackAuth configuration (if environment variables are set)
2. **Fall back** to Databutton's StackAuth configuration (if custom config is not provided)
3. **Show warning** if no StackAuth configuration is found

### Example .env File

```bash
# Replace with your actual StackAuth values
STACK_AUTH_PROJECT_ID=my-project-123
STACK_AUTH_JWKS_URL=https://my-project.stack-auth.com/jwks
STACK_AUTH_PUBLISHABLE_CLIENT_KEY=pk_live_abc123def456
STACK_AUTH_HANDLER_URL=auth
```

### Troubleshooting

- **"No StackAuth configuration found"**: Make sure your `.env` file is in the correct location and has the right variable names
- **Authentication not working**: Verify your StackAuth credentials are correct
- **Still using Databutton's auth**: Check that your environment variables are properly set and the frontend is restarted
