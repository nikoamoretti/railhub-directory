# Railhub - US Rail Freight Directory

A comprehensive directory of rail freight facilities across the United States.

**Live Demo:** [railhub.onrender.com](https://railhub.onrender.com) (deploying...)

## 📊 Stats

- **7,706 facilities** across 52 categories
- **All 50 states** covered
- **100% free** - no registration required

## 🚀 One-Click Deploy

### Deploy to Render (Recommended - Free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/nikoamoretti/railhub-directory)

This will automatically:
1. Create a PostgreSQL database
2. Deploy the backend API
3. Deploy the frontend
4. Connect everything together

### Manual Deploy

**Backend (Railway or Render):**
```bash
cd backend
npm install
npm run build
npm start
```

**Frontend (Vercel or Netlify):**
```bash
cd frontend
npm install
npm run build
# Deploy dist/ folder
```

## 🏗️ Tech Stack

- **Database:** PostgreSQL 15 + PostGIS
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + Vite + Tailwind CSS + Leaflet
- **Search:** PostgreSQL full-text + trigram
- **Maps:** Leaflet + OpenStreetMap

## 📁 Data Sources

- **Commtrex Transloading:** ~2,746 facilities
- **Excel Import:** ~4,444 facilities across 52 categories
  - Bulk transfer terminals
  - Intermodal ramps
  - Railcar leasing companies
  - Repair shops
  - And 48 more...

## 🛠️ Local Development

```bash
# 1. Clone
git clone https://github.com/nikoamoretti/railhub-directory.git
cd railhub-directory

# 2. Set up database
psql -c "CREATE DATABASE railhub;"
psql -d railhub -f database/schema-nopostgis.sql

# 3. Import data
cd importer
npm install
npm run import excel -- --data-dir "/path/to/your/data"

# 4. Start backend
cd ../backend
npm install
cp .env.example .env
npm run dev

# 5. Start frontend (new terminal)
cd ../frontend
npm install
npm run dev
```

Visit http://localhost:3000

## 🔍 Features

- **Search:** Full-text search across facility names, locations, commodities
- **Filters:** By category, state, city
- **Map View:** Interactive map showing facility locations
- **Facility Details:** Complete information with contact details
- **Mobile Responsive:** Works on all devices

## 📄 API

- `GET /api/facilities?q=search&category=slug&state=CA` - Search facilities
- `GET /api/facilities/:id` - Get facility details
- `GET /api/categories` - List categories
- `GET /api/search/suggest?q=query` - Autocomplete

## 📝 License

MIT - Free for personal and commercial use.

Data attribution to original sources (Commtrex, etc.)
