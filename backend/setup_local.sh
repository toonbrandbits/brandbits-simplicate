#!/bin/bash

# TimeFlow Local Database Setup Script
# This script automates the setup of a local PostgreSQL database

set -e

echo "🚀 Setting up local database for TimeFlow..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "📦 Docker detected - using Docker for PostgreSQL"
    USE_DOCKER=true
else
    echo "📦 Docker not found - using local PostgreSQL"
    USE_DOCKER=false
fi

# Function to check if PostgreSQL is running
check_postgres() {
    if [ "$USE_DOCKER" = true ]; then
        docker ps | grep -q timeflow-db
    else
        pg_isready -h localhost -p 5432 &> /dev/null
    fi
}

# Function to start PostgreSQL
start_postgres() {
    if [ "$USE_DOCKER" = true ]; then
        echo "🐳 Starting PostgreSQL container..."
        if ! docker ps -a | grep -q timeflow-db; then
            docker run --name timeflow-db \
                -e POSTGRES_DB=timeflow \
                -e POSTGRES_USER=timeflow \
                -e POSTGRES_PASSWORD=timeflow123 \
                -p 5432:5432 \
                -d postgres:15
        else
            docker start timeflow-db
        fi
        
        # Wait for PostgreSQL to be ready
        echo "⏳ Waiting for PostgreSQL to be ready..."
        while ! docker exec timeflow-db pg_isready -U timeflow; do
            sleep 1
        done
    else
        echo "⚠️  Please ensure PostgreSQL is running locally on port 5432"
        echo "   You can start it with: brew services start postgresql (macOS)"
        echo "   or: sudo systemctl start postgresql (Linux)"
    fi
}

# Function to create database and user (for local PostgreSQL)
setup_local_postgres() {
    if [ "$USE_DOCKER" = false ]; then
        echo "🔧 Setting up local PostgreSQL database and user..."
        
        # Check if database exists
        if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw timeflow; then
            echo "📝 Creating database 'timeflow'..."
            sudo -u postgres psql -c "CREATE DATABASE timeflow;"
        fi
        
        # Check if user exists
        if ! psql -h localhost -U postgres -t -c "SELECT 1 FROM pg_roles WHERE rolname='timeflow'" | grep -q 1; then
            echo "👤 Creating user 'timeflow'..."
            sudo -u postgres psql -c "CREATE USER timeflow WITH PASSWORD 'timeflow123';"
        fi
        
        # Grant privileges
        echo "🔑 Granting privileges..."
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE timeflow TO timeflow;"
        sudo -u postgres psql -d timeflow -c "GRANT ALL PRIVILEGES ON SCHEMA public TO timeflow;"
    fi
}

# Function to update environment file
update_env() {
    echo "⚙️  Updating environment configuration..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env 2>/dev/null || touch .env
    fi
    
    # Update DATABASE_URL_DEV
    if grep -q "DATABASE_URL_DEV" .env; then
        # Update existing line
        sed -i.bak 's|DATABASE_URL_DEV=.*|DATABASE_URL_DEV=postgresql://timeflow:timeflow123@localhost:5432/timeflow|' .env
    else
        # Add new line
        echo "DATABASE_URL_DEV=postgresql://timeflow:timeflow123@localhost:5432/timeflow" >> .env
    fi
    
    echo "✅ Environment file updated"
}

# Function to run database initialization
init_database() {
    echo "🗄️  Initializing database schema and sample data..."
    
    # Check if Python script exists
    if [ ! -f setup_database_local.py ]; then
        echo "❌ Error: setup_database_local.py not found"
        exit 1
    fi
    
    # Run the setup script
    python setup_database_local.py
    
    echo "✅ Database initialization completed"
}

# Function to verify setup
verify_setup() {
    echo "🔍 Verifying database setup..."
    
    # Test connection
    if [ "$USE_DOCKER" = true ]; then
        docker exec timeflow-db psql -U timeflow -d timeflow -c "SELECT COUNT(*) FROM companies;" > /dev/null 2>&1
    else
        psql -h localhost -U timeflow -d timeflow -c "SELECT COUNT(*) FROM companies;" > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ Database connection verified"
    else
        echo "❌ Database connection failed"
        exit 1
    fi
}

# Main setup process
main() {
    echo "=========================================="
    echo "TimeFlow Local Database Setup"
    echo "=========================================="
    
    # Start PostgreSQL
    start_postgres
    
    # Wait a moment for PostgreSQL to be fully ready
    sleep 2
    
    # Setup local PostgreSQL if needed
    if [ "$USE_DOCKER" = false ]; then
        setup_local_postgres
    fi
    
    # Update environment
    update_env
    
    # Initialize database
    init_database
    
    # Verify setup
    verify_setup
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: cd backend && python main.py"
    echo "2. Start the frontend: cd frontend && npm run dev"
    echo "3. Visit http://localhost:5173"
    echo ""
    
    if [ "$USE_DOCKER" = true ]; then
        echo "Docker commands:"
        echo "  Start database: docker start timeflow-db"
        echo "  Stop database:  docker stop timeflow-db"
        echo "  View logs:      docker logs timeflow-db"
    fi
}

# Run main function
main "$@" 