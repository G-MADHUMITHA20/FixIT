import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>
          <Shield size={28} color="#2c3e50" />
          FixIt – Admin Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Admin: {user?.name}</span>
          <button onClick={logout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main>
        <div className="status-card" style={{ borderTop: '4px solid #8e44ad' }}>
          <h2>Administration Portal</h2>
          <p>You have successfully logged in as an administrator.</p>
          <p style={{ marginTop: '1rem', color: '#34495e' }}>Management functionality will be implemented in the next step.</p>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
