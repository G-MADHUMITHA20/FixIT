import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Wrench } from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>
          <Wrench size={28} color="#2c3e50" />
          FixIt – Student Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main>
        <div className="status-card success">
          <h2>Student Portal Access</h2>
          <p>You have successfully logged in as a student.</p>
          <p style={{ marginTop: '1rem', color: '#34495e' }}>Complaints functionality will be implemented in the next step.</p>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
