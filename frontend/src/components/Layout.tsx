import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Train, Search, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Train className="h-6 w-6" />
            <span className="font-bold">Railhub</span>
          </Link>
          
          <nav className="hidden md:flex flex-1 items-center space-x-6 text-sm font-medium">
            <Link to="/search" className="transition-colors hover:text-foreground/80">
              Search
            </Link>
            <Link to="/category/transloading" className="transition-colors hover:text-foreground/80">
              Transloading
            </Link>
            <Link to="/category/railcar-leasing" className="transition-colors hover:text-foreground/80">
              Railcar Leasing
            </Link>
            <Link to="/category/intermodal-ramps" className="transition-colors hover:text-foreground/80">
              Intermodal
            </Link>
          </nav>
          
          <div className="flex flex-1 items-center justify-end space-x-2">
            <Link 
              to="/search" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              <Search className="mr-2 h-4 w-4" />
              Find Facilities
            </Link>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col space-y-4 p-4">
              <Link to="/search" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Search
              </Link>
              <Link to="/category/transloading" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Transloading
              </Link>
              <Link to="/category/railcar-leasing" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Railcar Leasing
              </Link>
              <Link to="/category/intermodal-ramps" className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Intermodal
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Railhub. Free rail freight directory for the US.
          </p>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <Link to="/search" className="hover:text-foreground">
              Search
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
