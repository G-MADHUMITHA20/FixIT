import { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Plus, UserCheck } from 'lucide-react';

const ManageTechnicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTechnicians = async () => {
    try {
      const res = await api.get('/admin/technicians');
      setTechnicians(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/admin/technician', { name, email, password });
      setSuccess('Technician created successfully');
      setName('');
      setEmail('');
      setPassword('');
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-title">
        <Shield size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>Manage Technicians</h2>
      </div>

      <div className="surface-card mb-4">
        <h3>Create New Technician</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Name</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Plus size={16} /> {loading ? 'Creating...' : 'Create Technician'}
          </button>
        </form>
      </div>

      <div className="surface-card">
        <h3>Current Technicians</h3>
        {technicians.length === 0 ? (
          <p className="text-muted">No technicians found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {technicians.map(tech => (
              <div key={tech._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                <UserCheck size={24} color="var(--color-primary)" />
                <div>
                  <h4 style={{ margin: 0 }}>{tech.name}</h4>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>{tech.email}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTechnicians;
