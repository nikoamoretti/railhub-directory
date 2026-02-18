import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Facilities API
export interface Facility {
  id: number
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
  attributes: Record<string, any>
  category_id: number
  category_name: string
  category_slug: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FacilitiesResponse {
  data: Facility[]
  pagination: PaginationInfo
}

export const facilitiesApi = {
  getAll: async (params: {
    q?: string
    category?: string
    state?: string
    city?: string
    lat?: number
    lng?: number
    radius?: number
    page?: number
    limit?: number
  } = {}): Promise<FacilitiesResponse> => {
    const response = await api.get('/facilities', { params })
    return response.data
  },

  getById: async (id: number): Promise<Facility> => {
    const response = await api.get(`/facilities/${id}`)
    return response.data
  },

  getNearby: async (lat: number, lng: number, radius = 50, limit = 20) => {
    const response = await api.get('/facilities/nearby', {
      params: { lat, lng, radius, limit },
    })
    return response.data
  },
}

// Categories API
export interface Category {
  id: number
  slug: string
  name: string
  description: string | null
  display_order: number
  facility_count: number
}

export const categoriesApi = {
  getAll: async (): Promise<{ data: Category[] }> => {
    const response = await api.get('/categories')
    return response.data
  },

  getBySlug: async (slug: string) => {
    const response = await api.get(`/categories/${slug}`)
    return response.data
  },

  getStats: async (slug: string) => {
    const response = await api.get(`/categories/${slug}/stats`)
    return response.data
  },
}

// Search API
export interface SearchSuggestion {
  name: string
  location?: string
  category?: string
  categorySlug?: string
}

export const searchApi = {
  getSuggestions: async (q: string, limit = 10): Promise<{ data: SearchSuggestion[] }> => {
    const response = await api.get('/search/suggest', { params: { q, limit } })
    return response.data
  },

  getStates: async () => {
    const response = await api.get('/search/states')
    return response.data
  },

  getCities: async (state: string, limit = 50) => {
    const response = await api.get('/search/cities', { params: { state, limit } })
    return response.data
  },

  logSearch: async (query: string, filters: Record<string, any>, resultsCount: number) => {
    await api.post('/search/log', { query, filters, resultsCount })
  },
}

export default api
