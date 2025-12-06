# 🦷 ChoreChomper

A family-oriented chore management platform where parents create and assign chores to children, who earn points for completed tasks and redeem them for rewards.

## Features

- **Multi-tenant**: Unlimited families, each with complete data isolation
- **Parent Dashboard**: Manage children, create chores, verify completions, manage rewards
- **Child Interface**: Fun, easy-to-use interface for viewing and completing chores
- **Recurring Chores**: Daily, weekly, or monthly chore schedules
- **Points & Rewards**: Earn points for completed chores, redeem for rewards
- **Photo Verification**: Children can attach proof photos when completing chores
- **Notifications**: SMS, email, and push notifications for reminders and updates

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Queue**: Bull + Redis
- **Notifications**: Twilio (SMS), SendGrid (Email), Web Push

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/corynaegle-ai/chore-chomper.git
cd chore-chomper

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend npx prisma migrate deploy

# Access the app
open http://localhost:3000
```

### Local Development

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Start PostgreSQL and Redis (requires Docker)
docker compose up -d postgres redis

# Run database migrations
cd ../backend
npx prisma migrate dev

# Start backend (in one terminal)
npm run dev

# Start frontend (in another terminal)
cd ../frontend
npm run dev
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing
- `TWILIO_*`: Twilio credentials for SMS
- `SENDGRID_*`: SendGrid credentials for email
- `DO_SPACES_*`: Digital Ocean Spaces for file uploads

## Project Structure

```
chore-chomper/
├── backend/           # Express API server
│   ├── prisma/        # Database schema and migrations
│   └── src/
│       ├── config/    # Configuration files
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── jobs/      # Background jobs (Bull queues)
│       └── types/
├── frontend/          # React application
│   ├── public/
│   └── src/
│       ├── api/       # API client
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       └── utils/
├── nginx/             # Nginx configuration
└── scripts/           # Deployment and utility scripts
```

## API Documentation

See [API Endpoints](docs/api.md) for full API documentation.

## Deployment

See [Deployment Guide](docs/deployment.md) for production deployment instructions.

## License

MIT
