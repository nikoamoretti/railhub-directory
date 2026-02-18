import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { FacilityPage } from './pages/FacilityPage'
import { CategoryPage } from './pages/CategoryPage'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/facility/:id" element={<FacilityPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
      </Routes>
    </Layout>
  )
}

export default App
