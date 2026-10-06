import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (user.role === 'technician') {
        navigate('/technician-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      if (!err.response) {
        setError('Network Error: Unable to connect to the backend server');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="surface-card" style={{ display: 'flex', overflow: 'hidden', padding: 0, maxWidth: '900px', width: '100%', minHeight: '500px' }}>
        
        {/* Left Side: Branding */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-primary)', color: '#fff', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <ShieldCheck size={48} color="#fff" />
              <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#fff', letterSpacing: '-0.025em' }}>FIXIT</h1>
            </div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, margin: '0 0 1rem 0', color: '#e2e8f0', lineHeight: 1.4 }}>
              Campus Maintenance<br/>Management System
            </h2>
            
            <div style={{ width: '40px', height: '4px', backgroundColor: '#60a5fa', marginBottom: '1.5rem' }}></div>
            
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', margin: 0, fontWeight: 400 }}>
              Report. Track. Resolve.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div style={{ flex: 1, padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'var(--color-surface)' }}>
          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>Welcome Back</h2>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Sign in to access the campus portal.</p>
            
            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="email">Institutional Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="student@saveetha.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
            
            <div style={{ marginTop: '2rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                Don't have an account? <Link to="/register" style={{ fontWeight: 500 }}>Register here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
