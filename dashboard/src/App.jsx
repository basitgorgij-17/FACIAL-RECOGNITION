import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Signup from './pages/signup.jsx'
import Login from './pages/login.jsx'
import Watchlist  from './pages/watchlist.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/dashboard" element={<h1>Dashboard (coming in Phase 5)</h1>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App