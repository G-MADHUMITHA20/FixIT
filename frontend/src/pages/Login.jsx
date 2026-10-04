import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Wrench } from 'lucide-react';

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
    <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="status-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Wrench size={40} color="var(--text-primary)" />
        </div>
        <h2>Sign In to FixIt</h2>
        {error && <div className="error-message" style={{ color: 'var(--danger)', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem', background: 'var(--accent-primary)', color: 'var(--bg-surface)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
