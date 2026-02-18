# Railhub - Quick Start Guide

## Project Structure

```
railhub/
├── database/           # PostgreSQL schema and migrations
│   └── schema.sql
├── importer/          # Data import scripts
│   ├── src/
│   │   ├── index.js           # Main importer CLI
│   │   ├── parsers/           # Excel/CSV parsers
│   │   │   ├── excelParser.js
│   │   │   └── commtrexParser.js
│   │   └── geocoder/          # Address geocoding
│   │       └── queue.js
│   ├── package.json
│   └── .env.example
├── backend/           # Express API
│   ├── src/
│   │   ├── index.ts           # Entry point
│   │   ├── db.ts              # Database connection
│   │   └── routes/
│   │       ├── facilities.ts
│   │       ├── categories.ts
│   │       └── search.ts
│   ├── package.json
│   └── Dockerfile
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── FacilityPage.tsx
│   │   │   └── CategoryPage.tsx
│   │   ├── components/
│   │   │   └── Layout.tsx
│   │   └── lib/
│   │       ├── api.ts
│   │       └── utils.ts
│   └── package.json
└── docker-compose.yml
```

## Prerequisites

- PostgreSQL 15+ with PostGIS extension
- Node.js 20+
- npm or pnpm

## Setup Steps

### 1. Database Setup

```bash
# Install PostgreSQL and PostGIS (on macOS with Homebrew)
brew install postgresql@15
brew install postgis

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb railhub

# Enable PostGIS and run schema
psql -d railhub -c "CREATE EXTENSION postgis;"
psql -d railhub -f database/schema.sql
```

### 2. Import Data

```bash
cd importer
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Import Excel files
npm run import excel

# Import Commtrex data (optional, if you have the CSVs)
npm run import commtrex

# Geocode addresses (uses Nominatim by default, rate limited)
npm run geocode -- --limit 1000
```

### 3. Start Backend

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials

# Development mode with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

API will be available at `http://localhost:3001`

### 4. Start Frontend

```bash
cd frontend
npm install

# Development server
npm run dev

# Build for production
npm run build
```

Frontend will be available at `http://localhost:3000`

## Docker Deployment (Alternative)

```bash
# Start all services
docker-compose up -d

# Database will be initialized automatically
# Import data:
docker-compose exec backend npm run import --prefix /importer
```

## Environment Variables

### Backend (.env)
```
PORT=3001
FRONTEND_URL=http://localhost:3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=railhub
DB_USER=postgres
DB_PASSWORD=your_password
```

### Importer (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=railhub
DB_USER=postgres
DB_PASSWORD=your_password

# Geocoding (optional)
GEOCODER_PROVIDER=nominatim  # or 'google', 'mapbox'
GEOCODER_API_KEY=your_key    # required for google/mapbox
```

## Features

- **Search**: Full-text search with category and state filters
- **Map View**: Interactive Leaflet map showing facility locations
- **Categories**: 52 rail-related categories
- **Facilities**: 15,000+ records from Commtrex + Excel imports
- **Geocoding**: Automatic address-to-coordinates conversion

## API Endpoints

- `GET /api/facilities` - List/search facilities
- `GET /api/facilities/:id` - Get facility details
- `GET /api/facilities/nearby?lat=X&lng=Y` - Nearby facilities
- `GET /api/categories` - List categories
- `GET /api/categories/:slug` - Category with facilities
- `GET /api/search/suggest?q=query` - Autocomplete

## Production Deployment

1. **Database**: Use a managed PostgreSQL service (Railway, Supabase, AWS RDS)
2. **Backend**: Deploy to Railway, Render, or Fly.io
3. **Frontend**: Deploy to Vercel or Netlify
4. **Update API URLs** in frontend environment variables

## Data Sources

- Commtrex Transloading Facilities (~14,364)
- Excel files covering 52 categories:
  - Bulk transfer terminals
  - Intermodal ramps
  - Railcar leasing companies
  - Repair shops
  - And more...

## Next Steps

- [ ] Load actual data into database
- [ ] Run geocoding on addresses
- [ ] Deploy to production
- [ ] Add user accounts for claiming/updating listings
- [ ] Add API rate limiting for public access
