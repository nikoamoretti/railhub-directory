import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { Search, MapPin, Building2, Phone, Globe, Mail, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { facilitiesApi, categoriesApi, searchApi } from '../lib/api'
import { cn, formatPhoneNumber, formatStateName } from '../lib/utils'

// Fix Leaflet default markers
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  map.setView(center, map.getZoom())
  return null
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [selectedState, setSelectedState] = useState(searchParams.get('state') || '')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showFilters, setShowFilters] = useState(false)
  
  const page = parseInt(searchParams.get('page') || '1')
  
  // Fetch facilities
  const { data: facilitiesData, isLoading } = useQuery(
    ['facilities', searchQuery, selectedCategory, selectedState, page],
    () => facilitiesApi.getAll({
      q: searchQuery || undefined,
      category: selectedCategory || undefined,
      state: selectedState || undefined,
      page,
      limit: 20
    }),
    { keepPreviousData: true }
  )
  
  // Fetch categories for filter
  const { data: categoriesData } = useQuery('categories', categoriesApi.getAll)
  
  // Fetch states for filter
  const { data: statesData } = useQuery('states', searchApi.getStates)
  
  const facilities = facilitiesData?.data || []
  const pagination = facilitiesData?.pagination
  const categories = categoriesData?.data || []
  const states = statesData?.data || []
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedState) params.set('state', selectedState)
    params.set('page', '1')
    setSearchParams(params)
  }
  
  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedState('')
    setSearchParams(new URLSearchParams())
  }
  
  // Calculate map center from facilities
  const mapCenter: [number, number] = facilities.length > 0 && facilities[0].latitude
    ? [facilities[0].latitude, facilities[0].longitude]
    : [39.8283, -98.5795] // Center of US
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Search Header */}
      <div className="border-b bg-background">
        <div className="container py-6">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search facilities, companies, locations..."
                  className="w-full rounded-md border border-input bg-background px-10 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                    showFilters ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                  )}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {(selectedCategory || selectedState) && (
                    <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                      {[selectedCategory, selectedState].filter(Boolean).length}
                    </span>
                  )}
                </button>
                
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Search
                </button>
                
                {(searchQuery || selectedCategory || selectedState) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name} ({cat.facility_count})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">State</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All States</option>
                    {states.map((s) => (
                      <option key={s.state} value={s.state}>
                        {formatStateName(s.state)} ({s.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
          
          {/* Results summary */}
          {pagination && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, pagination.total)} of {pagination.total.toLocaleString()} results
              {selectedCategory && ` in ${categories.find(c => c.slug === selectedCategory)?.name}`}
              {selectedState && ` in ${formatStateName(selectedState)}`}
            </div>
          )}
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="container py-4 border-b">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                viewMode === 'map' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              Map View
            </button>
          </div>
        </div>
      </div>
      
      {/* Results */}
      <div className="flex-1 container py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {facilities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No facilities found</p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              facilities.map((facility) => (
                <div
                  key={facility.id}
                  onClick={() => navigate(`/facility/${facility.id}`)}
                  className="group cursor-pointer rounded-lg border p-6 hover:border-primary hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {facility.name}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {facility.category_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <MapPin className="mr-1 h-4 w-4" />
                        {facility.address || facility.city || facility.state ? (
                          <>
                            {facility.address && <span>{facility.address}, </span>}
                            {facility.city && <span>{facility.city}, </span>}
                            {facility.state && <span>{facility.state}</span>}
                            {facility.zip && <span> {facility.zip}</span>}
                          </>
                        ) : (
                          'Location not available'
                        )}
                      </div>
                      
                      {/* Commodities */}
                      {facility.attributes?.commodities && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {facility.attributes.commodities.slice(0, 5).map((commodity: string) => (
                            <span key={commodity} className="text-xs px-2 py-1 rounded bg-muted">
                              {commodity}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="hidden md:flex flex-col items-end gap-2 text-sm text-muted-foreground">
                      {facility.phone && (
                        <div className="flex items-center">
                          <Phone className="mr-1 h-4 w-4" />
                          {formatPhoneNumber(facility.phone)}
                        </div>
                      )}
                      {facility.website && (
                        <div className="flex items-center">
                          <Globe className="mr-1 h-4 w-4" />
                          <span className="truncate max-w-[200px]">
                            {facility.website.replace(/^https?:\/\//, '')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="h-[600px] rounded-lg border overflow-hidden">
            <MapContainer center={mapCenter} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} />
              {facilities
                .filter(f => f.latitude && f.longitude)
                .map((facility) => (
                  <Marker
                    key={facility.id}
                    position={[facility.latitude!, facility.longitude!]}
                    eventHandlers={{
                      click: () => navigate(`/facility/${facility.id}`)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-semibold">{facility.name}</h4>
                        <p className="text-sm text-muted-foreground">{facility.category_name}</p>
                        <p className="text-sm mt-1">
                          {facility.city}, {facility.state}
                        </p>
                        <button
                          onClick={() => navigate(`/facility/${facility.id}`)}
                          className="text-primary text-sm mt-2 hover:underline"
                        >
                          View Details →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        )}
        
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(page - 1))
                setSearchParams(params)
              }}
              disabled={page <= 1}
              className="inline-flex items-center px-4 py-2 border border-input rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </button>
            
            <span className="text-sm text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </span>
            
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                params.set('page', String(page + 1))
                setSearchParams(params)
              }}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center px-4 py-2 border border-input rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
