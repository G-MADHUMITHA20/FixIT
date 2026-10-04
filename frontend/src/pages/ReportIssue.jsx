import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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
        setDuplicateIssue(err.response.data.matchingIssue);
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
      await api.post(`/issues/${duplicateIssue._id}/support`);
      alert('Successfully supported the existing issue.');
      navigate('/my-issues');
    } catch (err) {
      setError(err.response?.data?.message || 'Error supporting issue');
      setDuplicateIssue(null); // Return to form
    } finally {
      setLoading(false);
    }
  };

  const handleReportDifferent = () => {
    handleSubmit(null, true); // Submit bypassing check
  };

  return (
    <div className="dashboard">
      <div className="status-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Report Maintenance Issue</h2>
        
        {error && <div className="error-message" style={{ color: '#e74c3c', background: '#fadbd8', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        
        {duplicateIssue ? (
          <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <h3 style={{ color: '#e67e22', marginTop: 0 }}>Similar issue already reported</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>We noticed an active issue that matches your description. Adding your support will help prioritize it without creating duplicates.</p>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #eee', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{duplicateIssue.title}</h4>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Category:</strong> {duplicateIssue.category}</p>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Location:</strong> {duplicateIssue.location}</p>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Status:</strong> {duplicateIssue.status}</p>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Affected Students:</strong> {duplicateIssue.affectedUsers}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={handleSupportExisting} disabled={loading} className="btn-primary" style={{ flex: 1, padding: '0.75rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Processing...' : 'Support Existing Issue'}
              </button>
              <button onClick={handleReportDifferent} disabled={loading} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#7f8c8d', border: '1px solid #7f8c8d', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Report Different Issue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              className="form-input" placeholder="Issue Title" required
              value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
              style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <textarea
              className="form-input" placeholder="Description" required rows="4"
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
              style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <select className="form-input" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              className="form-input" placeholder="Location (e.g. Block A, Room 101)" required
              value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
              style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <select className="form-input" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default ReportIssue;
