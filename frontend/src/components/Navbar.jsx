import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Sun, Moon, LogOut, ShieldCheck, User, Bell } from 'lucide-react';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user && user.role === 'technician') {
      const fetchNotifications = async () => {
        try {
          const res = await api.get('/notifications');
          setNotifications(res.data.data.filter(n => !n.isRead));
        } catch (err) {
          console.error(err);
        }
      };
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAsRead = async (id, issueId) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n._id !== id));
      setShowNotifications(false);
      navigate(`/issues/${issueId}`);
    } catch (err) {
      console.error(err);
    }
  };

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
                <Link to="/admin/technicians" className={`app-nav-link ${isActive('/admin/technicians')}`}>Technicians</Link>
              </>
            ) : user.role === 'technician' ? (
              <>
                <Link to="/technician-dashboard" className={`app-nav-link ${isActive('/technician-dashboard')}`}>Dashboard</Link>
                <Link to="/public-issues" className={`app-nav-link ${isActive('/public-issues')}`}>Campus Issues</Link>
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

        {user && user.role === 'technician' && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="theme-toggle-btn"
              style={{ position: 'relative', marginLeft: '0.5rem' }}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-2px', background: 'var(--color-danger)', color: 'white',
                  borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="surface-card" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '300px',
                zIndex: 100, padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ margin: '0 0 1rem 0' }}>Notifications</h4>
                {notifications.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>No new notifications.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.map(n => (
                      <div key={n._id} onClick={() => handleMarkAsRead(n._id, n.issue)} style={{
                        padding: '0.75rem', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer', borderLeft: '3px solid var(--color-primary)'
                      }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', fontSize: '0.9rem' }}>{n.title}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
