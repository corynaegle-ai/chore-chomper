#!/bin/bash

# ChoreChomper Deployment Script for Digital Ocean
# Run this on a fresh Ubuntu 24.04 droplet

set -e

echo "🦷 ChoreChomper Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (use sudo)${NC}"
  exit 1
fi

# Get domain name
read -p "Enter your domain name (e.g., chore-chomper.com): " DOMAIN
read -p "Enter your email for SSL certificates: " EMAIL

echo -e "${YELLOW}Installing dependencies...${NC}"

# Update system
apt update && apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  systemctl enable docker
  systemctl start docker
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  apt install -y docker-compose-plugin
fi

# Install Certbot for SSL
apt install -y certbot

echo -e "${GREEN}Docker installed successfully!${NC}"

# Create app directory
APP_DIR="/opt/chorechomper"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
  echo "Updating existing repository..."
  git pull
else
  read -p "Enter your GitHub repository URL: " REPO_URL
  git clone $REPO_URL .
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Creating .env file...${NC}"
  
  # Generate random passwords
  DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
  JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
  JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
  
  cat > .env << EOF
# Database
DB_USER=chorechomper
DB_PASSWORD=$DB_PASSWORD
DB_NAME=chorechomper
DATABASE_URL=postgresql://chorechomper:$DB_PASSWORD@postgres:5432/chorechomper?schema=public

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://$DOMAIN

# Redis
REDIS_URL=redis://redis:6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# External Services (add your own keys)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@$DOMAIN

# VAPID keys for Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@$DOMAIN
EOF

  echo -e "${GREEN}.env file created with secure random passwords${NC}"
  echo -e "${YELLOW}NOTE: You still need to add Twilio, SendGrid, and VAPID keys!${NC}"
fi

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

# Get SSL certificates
echo -e "${YELLOW}Setting up SSL certificates...${NC}"

# Stop any existing services using port 80
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Get certificates
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Copy certificates to nginx ssl directory
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/

# Update nginx config with actual domain
sed -i "s/chore-chomper.com/$DOMAIN/g" nginx/nginx.conf

echo -e "${GREEN}SSL certificates installed!${NC}"

# Run database migrations
echo -e "${YELLOW}Starting services and running migrations...${NC}"

# Start just postgres first
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Optionally seed the database
read -p "Do you want to seed the database with demo data? (y/n): " SEED_DB
if [ "$SEED_DB" = "y" ]; then
  docker-compose -f docker-compose.prod.yml run --rm backend npx prisma db seed
fi

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Set up automatic SSL renewal
echo -e "${YELLOW}Setting up SSL auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renewal << EOF
0 0 1 * * root certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/nginx/ssl/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/nginx/ssl/ && docker-compose -f $APP_DIR/docker-compose.prod.yml restart nginx
EOF

# Set up firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 ChoreChomper deployed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your app is now running at: https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose -f $APP_DIR/docker-compose.prod.yml logs -f"
echo "  Restart:       docker-compose -f $APP_DIR/docker-compose.prod.yml restart"
echo "  Stop:          docker-compose -f $APP_DIR/docker-compose.prod.yml down"
echo "  Update:        cd $APP_DIR && git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "  1. Add your Twilio credentials to .env for SMS"
echo "  2. Add your SendGrid API key to .env for email"
echo "  3. Generate and add VAPID keys for push notifications"
echo "  4. Point your domain's DNS to this server's IP address"
echo ""
