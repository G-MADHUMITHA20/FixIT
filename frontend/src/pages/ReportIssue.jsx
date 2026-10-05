import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { PenTool, AlertTriangle, MapPin, Tag, Flag } from 'lucide-react';

const categories = [
  'Electrical', 'Plumbing / Water Leakage', 'Furniture', 'Classroom', 
  'Laboratory', 'Washroom', 'Network / Internet', 'Cleaning', 'Other'
];

const ReportIssue = () => {
  const [formData, setFormData] = useState({
    title: '', description: '', category: categories[0], location: '', priority: 'Medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateIssue, setDuplicateIssue] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e, bypass = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/issues', { ...formData, bypassDuplicateCheck: bypass });
      navigate('/my-issues');
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.isDuplicate) {
        setDuplicateIssue(err.response.data.existingIssue);
      } else {
        setError(err.response?.data?.message || 'Error reporting issue');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSupportExisting = async () => {
    setLoading(true);
    try {
      await api.post(`/issues/${duplicateIssue.id}/support`);
      navigate('/my-issues');
    } catch (err) {
      setError(err.response?.data?.message || 'Error supporting issue');
      setDuplicateIssue(null); // Return to form
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDuplicateIssue(null);
  };

  return (
    <>
      <div className="page-title">
        <PenTool size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>Report an Issue</h2>
      </div>
      <p className="page-subtitle">Help us keep the campus safe, functional and comfortable.</p>

      <div className="surface-card" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
        {error && <div className="alert alert-danger mb-3">{error}</div>}
        
        {duplicateIssue ? (
          <div style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 10%, var(--color-surface))', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)' }}>
            <h3 className="flex items-center gap-1 text-warning mt-0" style={{ fontSize: '1.1rem' }}>
              <AlertTriangle size={20} /> Similar Issue Already Reported
            </h3>
            <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>A similar maintenance issue has already been reported in this location.</p>
            
            <div className="surface-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>{duplicateIssue.title}</h4>
              <div className="flex items-center gap-1 mb-2">
                <MapPin size={14} color="var(--color-text-secondary)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{duplicateIssue.location}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Status</span>
                  <span className={`badge badge-${duplicateIssue.status.toLowerCase().replace(' ', '-')}`}>{duplicateIssue.status}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Affected</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{duplicateIssue.affectedUsers} Users</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={handleSupportExisting} disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                {loading ? 'Processing...' : 'Support Existing Issue'}
              </button>
              <button onClick={handleCancel} disabled={loading} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => handleSubmit(e, false)}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>Issue Details</h3>
            
            <div className="form-group">
              <label className="form-label">Issue Title</label>
              <input
                type="text"
                className="form-input" 
                placeholder="e.g., Broken projector in Room 301" 
                required
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea" 
                placeholder="Please describe the issue in detail..." 
                required 
                rows="5"
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', marginTop: '2rem', color: 'var(--color-text-primary)' }}>Classification & Location</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Tag size={16}/> Category</label>
                <select className="form-select" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label flex items-center gap-1"><Flag size={16}/> Priority</label>
                <select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical Priority</option>
                </select>
              </div>
            </div>

            <div className="form-group mb-4">
              <label className="form-label flex items-center gap-1"><MapPin size={16}/> Location</label>
              <input
                type="text"
                className="form-input" 
                placeholder="e.g., Block A, Room 101" 
                required
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            
            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                {loading ? 'Submitting...' : 'Submit Issue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};
export default ReportIssue;
