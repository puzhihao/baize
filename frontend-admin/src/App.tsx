import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Resumes from './pages/Resumes'
import Analyses from './pages/Analyses'
import Prompt from './pages/Prompt'
import AdminLayout from './components/AdminLayout'
import RequireAuth from './components/RequireAuth'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="analyses" element={<Analyses />} />
          <Route path="prompt" element={<Prompt />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
