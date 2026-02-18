-- Railhub Database Schema
-- PostgreSQL 15+ with PostGIS extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- Categories table (normalized)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main facilities table (unified for all types)
CREATE TABLE facilities (
    id SERIAL PRIMARY KEY,
    
    -- Basic info
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE,  -- URL-friendly name
    
    -- Categorization
    category_id INTEGER REFERENCES categories(id),
    sub_category VARCHAR(200),  -- For granular categorization within main category
    
    -- Address (structured for geocoding)
    address TEXT,
    city VARCHAR(200),
    state VARCHAR(10),  -- 2-letter state code
    zip VARCHAR(20),
    country VARCHAR(10) DEFAULT 'US',
    
    -- Geolocation (PostGIS)
    location GEOGRAPHY(POINT, 4326),  -- WGS 84 coordinate system
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geocoded_at TIMESTAMP WITH TIME ZONE,  -- When we geocoded this address
    geocoding_confidence VARCHAR(20),  -- high, medium, low
    
    -- Contact info
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    
    -- Flexible attributes (different per facility type)
    attributes JSONB DEFAULT '{}',
    -- Examples of what goes in attributes:
    -- - commodities: ["grain", "chemicals", "automotive"]
    -- - railroads: ["BNSF", "UP", "CSX"]
    -- - fleet_size: 5000
    -- - services: ["transloading", "storage", "cleaning"]
    -- - hours: "24/7"
    -- - equipment: ["tank cars", "hopper cars"]
    
    -- Full-text search
    search_vector TSVECTOR,
    
    -- Data source tracking
    source VARCHAR(100),  -- 'commtrex', 'excel_import', 'manual_entry'
    source_id VARCHAR(100),  -- Original ID from source
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for facilities with multiple categories (if needed)
CREATE TABLE facility_categories (
    facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,  -- Is this the main category?
    PRIMARY KEY (facility_id, category_id)
);

-- Commodities table (normalized for filtering)
CREATE TABLE commodities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100)  -- e.g., 'bulk', 'liquid', 'general'
);

-- Junction: facilities <-> commodities
CREATE TABLE facility_commodities (
    facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    commodity_id INTEGER REFERENCES commodities(id) ON DELETE CASCADE,
    PRIMARY KEY (facility_id, commodity_id)
);

-- Railroads table (normalized)
CREATE TABLE railroads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE,  -- e.g., 'BNSF', 'UP', 'CSXT'
    type VARCHAR(50),  -- 'Class I', 'Regional', 'Shortline'
    website VARCHAR(500)
);

-- Junction: facilities <-> railroads
CREATE TABLE facility_railroads (
    facility_id INTEGER REFERENCES facilities(id) ON DELETE CASCADE,
    railroad_id INTEGER REFERENCES railroads(id) ON DELETE CASCADE,
    PRIMARY KEY (facility_id, railroad_id)
);

-- Search logs (for analytics)
CREATE TABLE search_logs (
    id SERIAL PRIMARY KEY,
    query TEXT,
    filters JSONB,
    results_count INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance

-- Primary lookups
CREATE INDEX idx_facilities_category ON facilities(category_id);
CREATE INDEX idx_facilities_state ON facilities(state);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_active ON facilities(is_active);
CREATE INDEX idx_facilities_source ON facilities(source);

-- Geospatial index
CREATE INDEX idx_facilities_location ON facilities USING GIST(location);

-- Full-text search index
CREATE INDEX idx_facilities_search ON facilities USING GIN(search_vector);

-- For autocomplete/suggestions
CREATE INDEX idx_facilities_name_trgm ON facilities USING GIN(name gin_trgm_ops);
CREATE INDEX idx_facilities_city_trgm ON facilities USING GIN(city gin_trgm_ops);

-- JSONB indexes for common attribute queries
CREATE INDEX idx_facilities_attributes ON facilities USING GIN(attributes);
CREATE INDEX idx_facilities_attributes_railroads ON facilities USING GIN((attributes->'railroads'));
CREATE INDEX idx_facilities_attributes_commodities ON facilities USING GIN((attributes->'commodities'));

-- Composite indexes for common query patterns
CREATE INDEX idx_facilities_category_state ON facilities(category_id, state) WHERE is_active = true;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_facility_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.attributes->>'commodities', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.attributes->>'railroads', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector
CREATE TRIGGER trigger_update_facility_search_vector
    BEFORE INSERT OR UPDATE ON facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_facility_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_facilities_updated_at
    BEFORE UPDATE ON facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Active facilities with category info
CREATE VIEW v_facilities AS
SELECT 
    f.*,
    c.name as category_name,
    c.slug as category_slug
FROM facilities f
JOIN categories c ON f.category_id = c.id
WHERE f.is_active = true;

-- Facilities with distance calculation (example: from a point)
-- Usage: SELECT * FROM v_facilities_nearby(-74.006, 40.7128, 50); -- 50 miles from NYC
CREATE OR REPLACE FUNCTION v_facilities_nearby(lat DECIMAL, lng DECIMAL, radius_miles INTEGER)
RETURNS TABLE (
    id INTEGER,
    name VARCHAR(500),
    category_name VARCHAR(200),
    city VARCHAR(200),
    state VARCHAR(10),
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.name,
        c.name as category_name,
        f.city,
        f.state,
        (ST_Distance(f.location::geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry) / 1609.344)::DECIMAL as distance_miles
    FROM facilities f
    JOIN categories c ON f.category_id = c.id
    WHERE f.is_active = true
      AND f.location IS NOT NULL
      AND ST_DWithin(
          f.location::geometry,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry,
          radius_miles * 1609.344  -- Convert miles to meters
      )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- Insert initial categories based on your Excel files
INSERT INTO categories (slug, name, description, display_order) VALUES
-- Physical Infrastructure
('bulk-transfer-terminals', 'Bulk Transfer Terminals', 'Terminals for transferring bulk commodities between rail and other modes', 10),
('intermodal-ramps', 'Intermodal Ramps/Terminals', 'Intermodal facilities for container and trailer transfers', 11),
('team-tracks', 'Team Tracks', 'Rail sidings available for use by multiple shippers', 12),
('private-sidings', 'Private Sidings for Lease', 'Privately-owned rail sidings available for lease', 13),
('rail-served-warehousing', 'Rail-Served Warehousing', 'Warehouses with direct rail access', 14),

-- Equipment & Assets
('railcar-manufacturing', 'Railcar Manufacturing/Rebuilding', 'Companies that build or rebuild railcars', 20),
('railcar-repair-shops', 'Railcar Repair Shops', 'Repair and maintenance facilities for railcars', 21),
('tank-wash-stations', 'Tank Wash/Cleaning Stations', 'Railcar cleaning and washing facilities', 22),
('railcar-leasing', 'Railcar Leasing Companies', 'Companies that lease railcars to shippers', 23),
('specialty-car-builders', 'Specialty Car Builders', 'Custom railcar manufacturers', 24),
('railcar-lining-coating', 'Railcar Lining & Coating', 'Railcar interior lining and coating services', 25),
('railcar-inspection', 'Railcar Inspection Services', 'Railcar inspection and certification services', 26),
('railcar-brokers', 'Railcar Brokers', 'Brokers for buying and selling railcars', 27),
('railcar-management', 'Railcar Management Companies', 'Third-party railcar management services', 28),
('railcar-tracking', 'Railcar Tracking Platforms', 'Software platforms for tracking railcar locations', 29),

-- Services
('transloading', 'Transloading Operators', 'Facilities that transfer goods between rail and truck', 30),
('rail-brokers', 'Rail Brokers/Intermediaries', 'Brokers for rail freight services', 31),
('freight-forwarders', 'Freight Forwarders (Rail)', 'Freight forwarders specializing in rail', 32),
('customs-brokers', 'Customs Brokers', 'Customs clearance services for rail shipments', 33),
('drayage-providers', 'Drayage Providers', 'Trucking services for intermodal container moves', 34),
('chassis-providers', 'Chassis Providers', 'Intermodal chassis rental and leasing', 35),
('fumigation-facilities', 'Fumigation Facilities', 'Railcar fumigation services', 36),
('scale-weigh-stations', 'Scale/Weigh Stations', 'Railcar weighing and scale services', 37),

-- Technology
('tms-platforms', 'TMS Platforms (Rail)', 'Transportation management systems for rail', 40),
('yard-management', 'Yard Management Systems', 'Software for managing rail yards', 41),
('fleet-management', 'Fleet Management Tools', 'Tools for managing railcar fleets', 42),
('load-planning', 'Load Planning Software', 'Software for planning railcar loads', 43),
('demurrage-software', 'Demurrage Management Software', 'Software for managing demurrage charges', 44),
('edi-providers', 'EDI Providers (Rail)', 'EDI integration services for rail', 45),
('car-hire-management', 'Car Hire/Per Diem Management', 'Tools for managing railcar hire/per diem', 46),
('aei-tag-readers', 'AEI Tag Readers/Hardware', 'Automatic equipment identification hardware', 47),

-- Maintenance & Operations
('locomotive-leasing', 'Locomotive Leasing', 'Companies that lease locomotives', 50),
('locomotive-shops', 'Locomotive Shops', 'Locomotive repair and maintenance', 51),
('mobile-repair', 'Mobile Repair Services', 'Mobile railcar and locomotive repair', 52),
('parts-suppliers', 'Parts/Component Suppliers', 'Suppliers of railcar and locomotive parts', 53),
('track-construction', 'Rail Engineering/Track Construction', 'Railroad track construction and maintenance', 54),
('signal-contractors', 'Signal & Communications Contractors', 'Railroad signal and communications services', 55),
('demurrage-consulting', 'Demurrage Consulting', 'Consulting services for demurrage management', 56),

-- Railroads
('shortline-railroads', 'Shortline/Regional Railroads', 'Shortline and regional railroad companies', 60),
('switching-railroads', 'Switching/Terminal Railroads', 'Switching and terminal railroad companies', 61);

-- Insert common commodities
INSERT INTO commodities (name, slug, category) VALUES
('Grain', 'grain', 'bulk'),
('Coal', 'coal', 'bulk'),
('Ores/Minerals', 'ores-minerals', 'bulk'),
('Aggregates', 'aggregates', 'bulk'),
('Chemicals', 'chemicals', 'liquid'),
('Petroleum Products', 'petroleum', 'liquid'),
('Food Products', 'food', 'general'),
('Automotive', 'automotive', 'general'),
('Forest Products', 'forest', 'general'),
('Intermodal Containers', 'intermodal', 'general'),
('Steel/Metals', 'steel-metals', 'general'),
('Plastics', 'plastics', 'general'),
('Fertilizer', 'fertilizer', 'bulk'),
('Cement', 'cement', 'bulk'),
('Animal Feed', 'animal-feed', 'bulk');

-- Insert major railroads
INSERT INTO railroads (name, code, type) VALUES
('BNSF Railway', 'BNSF', 'Class I'),
('Union Pacific', 'UP', 'Class I'),
('CSX Transportation', 'CSXT', 'Class I'),
('Norfolk Southern', 'NS', 'Class I'),
('Canadian National', 'CN', 'Class I'),
('Canadian Pacific Kansas City', 'CPKC', 'Class I'),
('Amtrak', 'AMTK', 'Passenger');
