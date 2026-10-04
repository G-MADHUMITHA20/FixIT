import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon, LogOut, Wrench } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', margin: 0, padding: '1rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Wrench size={24} color="var(--accent-primary)" />
          <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>FixIt</h1>
        </Link>
        
        {user && (
          <nav style={{ display: 'flex', gap: '1.5rem', fontWeight: 500 }}>
            {user.role === 'admin' ? (
              <>
                <Link to="/admin-dashboard" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
                <Link to="/public-issues" style={{ color: 'var(--text-secondary)' }}>All Issues</Link>
              </>
            ) : (
              <>
                <Link to="/student-dashboard" style={{ color: 'var(--text-secondary)' }}>Dashboard</Link>
                <Link to="/my-issues" style={{ color: 'var(--text-secondary)' }}>My Issues</Link>
                <Link to="/public-issues" style={{ color: 'var(--text-secondary)' }}>Campus Feed</Link>
                <Link to="/report-issue" style={{ color: 'var(--text-secondary)' }}>Report Issue</Link>
              </>
            )}
          </nav>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{user.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{user.role === 'admin' ? 'Administrator' : 'Student'}</span>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
