import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, DataProvider, ToastProvider, useAuth } from './context/AppContext'
import Layout from './layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import JobFit from './pages/JobFit'
import ResumeLab from './pages/ResumeLab'
import Roadmap from './pages/Roadmap'
import Applications from './pages/Applications'
import MockInterview from './pages/MockInterview'
import Market from './pages/Market'
import InnovationLab from './pages/InnovationLab'
import { CompanyOverview, TalentMatch, Postings } from './pages/Company'

function Protected({ children }) {
  const { user, authLoading } = useAuth()
  if (authLoading) return null // mid Cognito redirect exchange — avoid a login flash
  return user ? children : <Navigate to="/login" replace />
}

function Home() {
  const { user, authLoading } = useAuth()
  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'company' ? '/company' : '/dashboard'} replace />
}

function StudentOnly({ children }) {
  const { user } = useAuth()
  return user.role === 'company' ? <Navigate to="/company" replace /> : children
}

function CompanyOnly({ children }) {
  const { user } = useAuth()
  return user.role !== 'company' ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Protected><Layout /></Protected>}>
                <Route path="/dashboard" element={<StudentOnly><Dashboard /></StudentOnly>} />
                <Route path="/profile" element={<StudentOnly><Profile /></StudentOnly>} />
                <Route path="/fit" element={<StudentOnly><JobFit /></StudentOnly>} />
                <Route path="/resume" element={<StudentOnly><ResumeLab /></StudentOnly>} />
                <Route path="/roadmap" element={<StudentOnly><Roadmap /></StudentOnly>} />
                <Route path="/applications" element={<StudentOnly><Applications /></StudentOnly>} />
                <Route path="/interview" element={<StudentOnly><MockInterview /></StudentOnly>} />
                <Route path="/company" element={<CompanyOnly><CompanyOverview /></CompanyOnly>} />
                <Route path="/talent" element={<CompanyOnly><TalentMatch /></CompanyOnly>} />
                <Route path="/postings" element={<CompanyOnly><Postings /></CompanyOnly>} />
                <Route path="/market" element={<Market />} />
                <Route path="/lab" element={<InnovationLab />} />
              </Route>
              <Route path="*" element={<Home />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  )
}
