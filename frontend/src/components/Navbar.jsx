import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon, LogOut, ShieldCheck, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Link to="/" className="app-brand">
          <ShieldCheck size={28} color="var(--color-primary)" />
          <h1>FIXIT</h1>
        </Link>
        
        {user && (
          <nav className="app-nav">
            {user.role === 'admin' ? (
              <>
                <Link to="/admin-dashboard" className={`app-nav-link ${isActive('/admin-dashboard')}`}>Dashboard</Link>
                <Link to="/public-issues" className={`app-nav-link ${isActive('/public-issues')}`}>All Issues</Link>
              </>
            ) : (
              <>
                <Link to="/student-dashboard" className={`app-nav-link ${isActive('/student-dashboard')}`}>Dashboard</Link>
                <Link to="/report-issue" className={`app-nav-link ${isActive('/report-issue')}`}>Report Issue</Link>
                <Link to="/my-issues" className={`app-nav-link ${isActive('/my-issues')}`}>My Issues</Link>
                <Link to="/public-issues" className={`app-nav-link ${isActive('/public-issues')}`}>Campus Issues</Link>
              </>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {user && (
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-2 mr-2" style={{ textAlign: 'right' }}>
              <div className="flex flex-col" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {user.role === 'admin' ? 'Administrator' : user.role}
                </span>
              </div>
              <div style={{ background: 'var(--color-background)', padding: '0.5rem', borderRadius: '50%', border: '1px solid var(--color-border)' }}>
                <User size={18} color="var(--color-text-secondary)" />
              </div>
            </div>
            
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
              <LogOut size={16} /> <span style={{ fontSize: '0.85rem' }}>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
