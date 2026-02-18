import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { 
  MapPin, Phone, Mail, Globe, Building2, Train, 
  ArrowLeft, ExternalLink, Package, Clock, Users 
} from 'lucide-react'
import { facilitiesApi } from '../lib/api'
import { cn, formatPhoneNumber, formatStateName } from '../lib/utils'

import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

export function FacilityPage() {
  const { id } = useParams<{ id: string }>()
  const facilityId = parseInt(id || '0')
  
  const { data: facility, isLoading, error } = useQuery(
    ['facility', facilityId],
    () => facilitiesApi.getById(facilityId),
    { enabled: !!facilityId }
  )
  
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }
  
  if (error || !facility) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Facility not found</h2>
          <p className="text-muted-foreground mb-4">
            The facility you're looking for doesn't exist or has been removed.
          </p>
          <Link 
            to="/search" 
            className="inline-flex items-center text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to search
          </Link>
        </div>
      </div>
    )
  }
  
  const hasLocation = facility.latitude && facility.longitude
  
  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link to="/search" className="hover:text-foreground">Search</Link>
        <span>/</span>
        <Link 
          to={`/category/${facility.category_slug}`} 
          className="hover:text-foreground"
        >
          {facility.category_name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{facility.name}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {facility.category_name}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{facility.name}</h1>
            
            {/* Address */}
            <div className="flex items-start gap-3 text-muted-foreground">
              <MapPin className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                {facility.address && <p>{facility.address}</p>}
                <p>
                  {facility.city && <span>{facility.city}, </span>}
                  {facility.state && <span>{formatStateName(facility.state)} </span>}
                  {facility.zip && <span>{facility.zip}</span>}
                </p>
              </div>
            </div>
          </div>
          
          {/* Contact Info */}
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-4 flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Contact Information
            </h2>
            
            <div className="space-y-3">
              {facility.phone && (
                <a 
                  href={`tel:${facility.phone}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="h-5 w-5 shrink-0" />
                  <span>{formatPhoneNumber(facility.phone)}</span>
                </a>
              )}
              
              {facility.email && (
                <a 
                  href={`mailto:${facility.email}`}
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-5 w-5 shrink-0" />
                  <span>{facility.email}</span>
                </a>
              )}
              
              {facility.website && (
                <a 
                  href={facility.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Globe className="h-5 w-5 shrink-0" />
                  <span className="truncate">{facility.website.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              )}
              
              {!facility.phone && !facility.email && !facility.website && (
                <p className="text-muted-foreground italic">No contact information available</p>
              )}
            </div>
          </div>
          
          {/* Description */}
          {facility.attributes?.description && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-3">About</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {facility.attributes.description}
              </p>
            </div>
          )}
          
          {/* Commodities */}
          {facility.attributes?.commodities && facility.attributes.commodities.length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-4 flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Commodities Handled
              </h2>
              <div className="flex flex-wrap gap-2">
                {facility.attributes.commodities.map((commodity: string) => (
                  <span 
                    key={commodity} 
                    className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm"
                  >
                    {commodity}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Railroads */}
          {facility.attributes?.railroads && facility.attributes.railroads.length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-4 flex items-center">
                <Train className="mr-2 h-5 w-5" />
                Railroads Served
              </h2>
              <div className="flex flex-wrap gap-2">
                {facility.attributes.railroads.map((railroad: string) => (
                  <span 
                    key={railroad} 
                    className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {railroad}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Hours */}
          {facility.attributes?.hours && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-3 flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Hours
              </h2>
              <p className="text-muted-foreground">{facility.attributes.hours}</p>
            </div>
          )}
          
          {/* Additional Attributes */}
          {Object.keys(facility.attributes || {}).length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Additional Information
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(facility.attributes)
                  .filter(([key]) => !['commodities', 'railroads', 'description', 'hours'].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="mt-1 text-sm">
                        {Array.isArray(value) 
                          ? value.join(', ') 
                          : typeof value === 'object' 
                            ? JSON.stringify(value)
                            : String(value)
                        }
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Map */}
          {hasLocation ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="h-[300px]">
                <MapContainer 
                  center={[facility.latitude!, facility.longitude!]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[facility.latitude!, facility.longitude!]}>
                    <Popup>{facility.name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
              <div className="p-4">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-6 text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground text-sm">
                Location not yet mapped
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="rounded-lg border p-6 space-y-3">
            <h3 className="font-semibold mb-3">Actions</h3>
            
            {facility.phone && (
              <a 
                href={`tel:${facility.phone}`}
                className="flex items-center justify-center w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Phone className="mr-2 h-4 w-4" />
                Call Now
              </a>
            )}
            
            {facility.website && (
              <a 
                href={facility.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                <Globe className="mr-2 h-4 w-4" />
                Visit Website
              </a>
            )}
            
            {hasLocation && (
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Get Directions
              </a>
            )}
          </div>
          
          {/* Category Link */}
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Category</h3>
            <Link 
              to={`/category/${facility.category_slug}`}
              className="text-primary hover:underline"
            >
              View all {facility.category_name} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
