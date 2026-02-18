import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { ArrowLeft, Building2, MapPin } from 'lucide-react'
import { categoriesApi } from '../lib/api'
import { formatStateName } from '../lib/utils'

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  
  const { data: categoryData, isLoading: isLoadingCategory } = useQuery(
    ['category', slug],
    () => categoriesApi.getBySlug(slug || ''),
    { enabled: !!slug }
  )
  
  const { data: statsData, isLoading: isLoadingStats } = useQuery(
    ['category-stats', slug],
    () => categoriesApi.getStats(slug || ''),
    { enabled: !!slug }
  )
  
  const isLoading = isLoadingCategory || isLoadingStats
  const category = categoryData?.category
  const facilities = categoryData?.facilities || []
  const pagination = categoryData?.pagination
  const stats = statsData
  
  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }
  
  if (!category) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Category not found</h2>
          <Link to="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground text-lg max-w-3xl">
            {category.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Building2 className="mr-1 h-4 w-4" />
            {stats?.total?.toLocaleString() || pagination?.total?.toLocaleString() || 0} facilities
          </span>
          {stats?.byState && (
            <span className="flex items-center">
              <MapPin className="mr-1 h-4 w-4" />
              {stats.byState.length} states
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Facilities List */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-xl mb-4">Facilities</h2>
          
          <div className="space-y-4">
            {facilities.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground">No facilities in this category yet</p>
              </div>
            ) : (
              facilities.map((facility: any) => (
                <Link
                  key={facility.id}
                  to={`/facility/${facility.id}`}
                  className="block rounded-lg border p-6 hover:border-primary hover:shadow-sm transition-all"
                >
                  <h3 className="font-semibold text-lg mb-2 hover:text-primary transition-colors">
                    {facility.name}
                  </h3>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-1 h-4 w-4" />
                    {facility.city && facility.state ? (
                      <span>{facility.city}, {facility.state}</span>
                    ) : facility.state ? (
                      <span>{formatStateName(facility.state)}</span>
                    ) : (
                      'Location not available'
                    )}
                  </div>
                  
                  {facility.attributes?.commodities && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {facility.attributes.commodities.slice(0, 3).map((commodity: string) => (
                        <span key={commodity} className="text-xs px-2 py-1 rounded bg-muted">
                          {commodity}
                        </span>
                      ))}
                      {facility.attributes.commodities.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded bg-muted">
                          +{facility.attributes.commodities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
            </div>
          )}
          
          {facilities.length > 0 && facilities.length < (pagination?.total || 0) && (
            <div className="text-center mt-6">
              <Link 
                to={`/search?category=${category.slug}`}
                className="inline-flex items-center px-6 py-2 border border-input rounded-md text-sm font-medium hover:bg-accent transition-colors"
              >
                View all {pagination?.total?.toLocaleString()} facilities →
              </Link>
            </div>
          )}
        </div>
        
        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* By State */}
          {stats?.byState && stats.byState.length > 0 && (
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-4">By State</h3>
              <div className="space-y-2">
                {stats.byState.slice(0, 10).map((state: any) => (
                  <Link
                    key={state.state}
                    to={`/search?category=${category.slug}&state=${state.state}`}
                    className="flex items-center justify-between py-2 hover:bg-accent rounded px-2 -mx-2 transition-colors"
                  >
                    <span>{formatStateName(state.state)}</span>
                    <span className="text-muted-foreground">{state.count}</span>
                  </Link>
                ))}
              </div>
              {stats.byState.length > 10 && (
                <Link 
                  to={`/search?category=${category.slug}`}
                  className="text-primary text-sm mt-4 inline-block hover:underline"
                >
                  View all {stats.byState.length} states →
                </Link>
              )}
            </div>
          )}
          
          {/* Top Cities */}
          {stats?.topCities && stats.topCities.length > 0 && (
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Top Cities</h3>
              <div className="space-y-2">
                {stats.topCities.slice(0, 10).map((city: any) => (
                  <div
                    key={`${city.city}-${city.state}`}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">
                      {city.city}, {city.state}
                    </span>
                    <span className="text-muted-foreground text-sm">{city.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
