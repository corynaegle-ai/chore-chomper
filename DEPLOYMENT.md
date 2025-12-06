# ChoreChomper - Digital Ocean Deployment Guide

## Prerequisites

- A Digital Ocean account
- A domain name pointed to your droplet's IP
- GitHub repository with this code

## Quick Start (5 minutes)

### 1. Create a Droplet

1. Log into [Digital Ocean](https://cloud.digitalocean.com)
2. Create Droplet → **Ubuntu 24.04 LTS**
3. Choose **$6/mo Basic** (1 GB RAM, 1 vCPU, 25 GB SSD)
4. Choose a datacenter region close to your users
5. Add your SSH key
6. Create Droplet

### 2. Point Your Domain

Add these DNS records pointing to your droplet's IP:

| Type | Host | Value |
|------|------|-------|
| A | @ | `your-droplet-ip` |
| A | www | `your-droplet-ip` |

### 3. Deploy

SSH into your droplet and run:

```bash
# Connect to your droplet
ssh root@your-droplet-ip

# Download and run the deployment script
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/chore-chomper/main/scripts/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Install Docker and Docker Compose
- Clone your repository
- Generate secure passwords
- Set up SSL certificates (Let's Encrypt)
- Run database migrations
- Start all services

### 4. Configure External Services (Optional)

Edit `/opt/chorechomper/.env` to add:

```bash
# For SMS notifications (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# For Email notifications (SendGrid)
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# For Push notifications (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

Then restart: `docker-compose -f /opt/chorechomper/docker-compose.prod.yml restart backend`

---

## Management Commands

```bash
# View logs
docker-compose -f /opt/chorechomper/docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f /opt/chorechomper/docker-compose.prod.yml logs -f backend

# Restart all services
docker-compose -f /opt/chorechomper/docker-compose.prod.yml restart

# Stop all services
docker-compose -f /opt/chorechomper/docker-compose.prod.yml down

# Start all services
docker-compose -f /opt/chorechomper/docker-compose.prod.yml up -d

# Update to latest code
cd /opt/chorechomper
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f /opt/chorechomper/docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Open database shell
docker exec -it chorechomper-db psql -U chorechomper -d chorechomper
```

---

## Backup & Restore

### Automatic Backups

Set up daily backups at 2 AM:

```bash
chmod +x /opt/chorechomper/scripts/backup.sh
echo "0 2 * * * root /opt/chorechomper/scripts/backup.sh" > /etc/cron.d/chorechomper-backup
```

### Manual Backup

```bash
/opt/chorechomper/scripts/backup.sh
```

### Restore from Backup

```bash
/opt/chorechomper/scripts/restore.sh
```

---

## Monitoring

### Check Service Status

```bash
docker-compose -f /opt/chorechomper/docker-compose.prod.yml ps
```

### Health Check

```bash
curl https://yourdomain.com/api/health
```

### Resource Usage

```bash
docker stats
```

---

## Troubleshooting

### Services won't start

```bash
# Check logs for errors
docker-compose -f /opt/chorechomper/docker-compose.prod.yml logs

# Ensure .env file exists and has all required variables
cat /opt/chorechomper/.env
```

### SSL certificate issues

```bash
# Renew certificates manually
certbot renew

# Copy to nginx
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/chorechomper/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/chorechomper/nginx/ssl/

# Restart nginx
docker-compose -f /opt/chorechomper/docker-compose.prod.yml restart nginx
```

### Database connection issues

```bash
# Check if postgres is running
docker-compose -f /opt/chorechomper/docker-compose.prod.yml ps postgres

# Check postgres logs
docker-compose -f /opt/chorechomper/docker-compose.prod.yml logs postgres
```

### Out of memory

Consider upgrading to a larger droplet, or add swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Security Checklist

- [ ] SSH key authentication only (disable password auth)
- [ ] UFW firewall enabled (ports 22, 80, 443 only)
- [ ] Strong database password (auto-generated)
- [ ] SSL/TLS enabled
- [ ] Regular backups configured
- [ ] Fail2ban installed (optional but recommended)

---

## Costs

| Service | Cost |
|---------|------|
| Digital Ocean Droplet | $6/mo |
| Domain (optional if you have one) | ~$12/year |
| Twilio SMS (optional) | ~$0.0075/message |
| SendGrid (optional) | Free tier: 100 emails/day |
| **Total** | **~$6-10/mo** |

---

## Need Help?

- Check the [main README](./README.md)
- Review logs: `docker-compose logs -f`
- Open an issue on GitHub
