# Railhub Database

## Overview
A comprehensive rail freight directory covering 52+ categories of rail-related businesses and facilities across the US.

## Data Sources
- Commtrex Transloading: ~14,364 facilities
- Bulk Transfer Terminals: ~519
- Intermodal Ramps/Terminals: ~321
- Railcar Leasing Companies: ~47
- And 48+ additional categories

**Estimated Total: 15,000-20,000 records**

## Tech Stack
- **Database**: PostgreSQL 15+ with PostGIS for spatial queries
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS
- **Search**: PostgreSQL full-text + (future: Elasticsearch)
- **Maps**: Leaflet / Mapbox
- **Hosting**: Railway/Render (PostgreSQL) + Vercel (frontend)

## Database Design Principles
1. **Single table with category tagging** - All facilities in one table for unified search
2. **JSONB for flexible attributes** - Different facility types have different fields
3. **PostGIS for geospatial** - Store lat/lng, enable radius searches
4. **Full-text search** - PostgreSQL tsvector for fast text search
5. **Normalized categories** - Separate category table for filtering

## Project Structure
```
railhub/
├── database/
│   ├── schema.sql           # Database schema
│   ├── migrations/          # Versioned migrations
│   └── seed/                # Seed data
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── models/          # Database models
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers
│   └── tests/
├── importer/
│   ├── src/
│   │   ├── parsers/         # Excel parsers per category
│   │   └── geocoder/        # Address to lat/lng
│   └── data/                # Excel files
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── public/
└── docker-compose.yml
```

## Categories (52 total)

### Physical Infrastructure
- US_Bulk_Transfer_Terminals_Database.xlsx
- US_Intermodal_Ramps_Terminals_Database.xlsx
- team_tracks_database.xlsx
- private_sidings_for_lease.xlsx
- private_sidings_for_lease_EXPANDED.xlsx
- rail_served_warehousing.xlsx
- rail_served_warehousing_EXPANDED.xlsx

### Equipment & Assets
- US_Railcar_Manufacturing_Rebuilding_Database.xlsx
- US_Railcar_Repair_Shops_Database.xlsx
- US_Railcar_Tank_Wash_Cleaning_Stations_Database.xlsx
- railcar_leasing_companies.xlsx
- railcar_leasing_companies_EXPANDED.xlsx
- specialty_car_builders.xlsx
- specialty_car_builders_EXPANDED.xlsx
- railcar_lining_coating.xlsx
- railcar_lining_coating_EXPANDED.xlsx
- railcar_inspection_services.xlsx
- railcar_brokers.xlsx
- railcar_management_companies.xlsx
- railcar_tracking_platforms.xlsx

### Services
- transloading_operators.xlsx
- rail_brokers_intermediaries.xlsx
- freight_forwarders_rail.xlsx
- customs_brokers.xlsx
- customs_brokers_EXPANDED.xlsx
- drayage_providers.xlsx
- chassis_providers.xlsx
- fumigation_facilities.xlsx
- scale_weigh_stations.xlsx
- scale_weigh_stations_EXPANDED.xlsx

### Technology
- tms_platforms_rail.xlsx
- tms_platforms_rail_EXPANDED.xlsx
- yard_management_systems.xlsx
- fleet_management_tools.xlsx
- load_planning_software.xlsx
- demurrage_management_software.xlsx
- edi_providers_rail.xlsx
- car_hire_per_diem_management.xlsx
- aei_tag_readers_hardware.xlsx

### Maintenance & Operations
- locomotive_leasing.xlsx
- locomotive_leasing_EXPANDED.xlsx
- locomotive_shops.xlsx
- mobile_repair_services.xlsx
- parts_component_suppliers.xlsx
- rail_engineering_track_construction.xlsx
- signal_communications_contractors.xlsx
- demurrage_consulting.xlsx

### Railroads
- shortline_regional_railroads.xlsx
- switching_terminal_railroads.xlsx

### Other
- freight_railcar_sales_companies.md
- rail_industry_database_summary.xlsx

## Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Database schema design & setup
- [ ] Data importer for Excel files
- [ ] Geocoding pipeline (address → lat/lng)
- [ ] Basic API endpoints (list, search, get by ID)

### Phase 2: Backend (Week 2)
- [ ] Full-text search implementation
- [ ] Geospatial queries (radius, bounding box)
- [ ] Category filtering
- [ ] API pagination & rate limiting
- [ ] Data validation & sanitization

### Phase 3: Frontend (Week 3)
- [ ] Search interface with filters
- [ ] Results list with pagination
- [ ] Facility detail pages
- [ ] Map view with clustering
- [ ] Mobile responsive design

### Phase 4: Polish & Deploy (Week 4)
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Deployment automation
- [ ] Monitoring & logging
- [ ] Documentation

## API Endpoints

### Facilities
```
GET /api/facilities?q={search}&category={cat}&state={st}&lat={lat}&lng={lng}&radius={miles}&page={n}&limit={n}
GET /api/facilities/{id}
GET /api/facilities/nearby?lat={lat}&lng={lng}&radius={miles}&limit={n}
```

### Categories
```
GET /api/categories
GET /api/categories/{slug}/facilities
```

### Search
```
GET /api/search/suggest?q={partial}
GET /api/search/autocomplete?q={partial}
```

## Notes
- All data should be publicly accessible (no auth required for viewing)
- Consider adding edit/claim functionality in future
- Keep attribution to original data sources
- Ensure addresses are geocoded for map display
