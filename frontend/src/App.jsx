import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ReportIssue from './pages/ReportIssue';
import MyIssues from './pages/MyIssues';
import PublicIssues from './pages/PublicIssues';
import IssueDetails from './pages/IssueDetails';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/student-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          <Route path="/report-issue" element={<ProtectedRoute allowedRoles={['student']}><ReportIssue /></ProtectedRoute>} />
          <Route path="/my-issues" element={<ProtectedRoute allowedRoles={['student']}><MyIssues /></ProtectedRoute>} />
          <Route path="/public-issues" element={<ProtectedRoute><PublicIssues /></ProtectedRoute>} />
          <Route path="/issues/:id" element={<ProtectedRoute><IssueDetails /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
