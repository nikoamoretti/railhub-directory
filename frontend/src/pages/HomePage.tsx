import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Building2, Train } from 'lucide-react'
import { useQuery } from 'react-query'
import { categoriesApi } from '../lib/api'

export function HomePage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: categoriesData } = useQuery('categories', categoriesApi.getAll)
  const categories = categoriesData?.data || []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        <div className="relative container py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Find Rail Freight Facilities
              <span className="text-primary"> Across the US</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              The most comprehensive directory of rail-related businesses and facilities. 
              Search transloading terminals, railcar leasing companies, repair shops, and more.
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mt-10">
              <div className="flex max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search facilities, companies, or locations..."
                    className="w-full rounded-l-md border border-r-0 border-input bg-background px-10 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-r-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold">15K+</div>
              <div className="text-sm text-muted-foreground">Facilities</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">52</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50</div>
              <div className="text-sm text-muted-foreground">States</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Free</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Browse by Category</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 12).map((category) => (
            <a
              key={category.slug}
              href={`/category/${category.slug}`}
              className="group relative rounded-lg border p-6 hover:border-primary hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-md bg-primary/10 p-3">
                  {category.slug.includes('intermodal') ? (
                    <MapPin className="h-6 w-6 text-primary" />
                  ) : category.slug.includes('leasing') || category.slug.includes('warehouse') ? (
                    <Building2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Train className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.facility_count.toLocaleString()} facilities
                  </p>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
        
        {categories.length > 12 && (
          <div className="text-center mt-8">
            <a
              href="/search"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View All {categories.length} Categories
            </a>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30">
        <div className="container py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Powerful Search</h3>
              <p className="text-sm text-muted-foreground">
                Find facilities by name, location, commodity, or service type with our advanced search.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Interactive Maps</h3>
              <p className="text-sm text-muted-foreground">
                View facilities on an interactive map and find locations near you.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Train className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Comprehensive Data</h3>
              <p className="text-sm text-muted-foreground">
                Access detailed information on over 15,000 rail facilities across 52 categories.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
