import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/Upload'
import AnalysisPage from './pages/Analysis'
import GeneratePage from './pages/Generate'
import Upgrade from './pages/Upgrade'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminResumes from './pages/admin/Resumes'
import AdminAnalyses from './pages/admin/Analyses'
import AdminPrompt from './pages/admin/Prompt'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
        <Route path="/resume/:id" element={<RequireAuth><AnalysisPage /></RequireAuth>} />
        <Route path="/generate" element={<RequireAuth><GeneratePage /></RequireAuth>} />
        <Route path="/upgrade" element={<RequireAuth><Upgrade /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="resumes" element={<AdminResumes />} />
          <Route path="analyses" element={<AdminAnalyses />} />
          <Route path="prompt" element={<AdminPrompt />} />
        </Route>
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
