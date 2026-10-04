import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Clock, CheckCircle, AlertCircle, Wrench, ChevronRight } from 'lucide-react';

const IssueDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Admin editable states
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const res = await api.get(`/issues/${id}`);
        setIssue(res.data.data);
        setStatus(res.data.data.status);
        setPriority(res.data.data.priority);
      } catch (err) {
        setError('Issue not found or failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    fetchIssue();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { status, priority, note });
      setIssue(res.data.data);
      setNote(''); // clear note field after successful update
      alert('Issue updated successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      try {
        await api.delete(`/issues/${id}`);
        navigate('/admin-dashboard');
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  if (loading) return <div className="dashboard"><p>Loading...</p></div>;
  if (error || !issue) return <div className="dashboard"><p className="error-message">{error}</p></div>;

  const timelineSteps = ['Reported', 'Pending', 'In Progress', 'Resolved'];
  const currentStep = issue.status === 'Resolved' ? 3 : issue.status === 'In Progress' ? 2 : 1;

  return (
    <div className="dashboard">
      <div className="status-card" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wrench size={24} color="var(--text-primary)" /> {issue.title}</h2>
          <span style={{ 
            padding: '0.4rem 0.8rem', 
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: issue.status === 'Pending' ? 'var(--bg-secondary)' : issue.status === 'Resolved' ? 'var(--bg-secondary)' : '#ebf5fb',
            color: issue.status === 'Pending' ? 'var(--warning)' : issue.status === 'Resolved' ? 'var(--success)' : '#2980b9'
          }}>{issue.status}</span>
        </div>
        
        {/* Status Timeline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
          {timelineSteps.map((step, index) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: index === timelineSteps.length - 1 ? 'none' : '1' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: index <= currentStep ? 'var(--accent-primary)' : 'var(--border-color)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: index <= currentStep ? 'var(--accent-primary)' : 'var(--border-color)', color: 'var(--bg-surface)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {index < currentStep ? <CheckCircle size={14} /> : (index + 1)}
                </div>
                <span style={{ fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: index <= currentStep ? 'bold' : 'normal' }}>{step}</span>
              </div>
              {index < timelineSteps.length - 1 && (
                <div style={{ height: '2px', background: index < currentStep ? 'var(--accent-primary)' : 'var(--border-color)', flex: 1, margin: '0 10px', transform: 'translateY(-10px)' }}></div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ lineHeight: '1.6' }}>{issue.description}</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <div><strong>Category:</strong> {issue.category}</div>
          <div><strong>Location:</strong> {issue.location}</div>
          <div><strong>Priority:</strong> {issue.priority}</div>
          <div><strong>Reported:</strong> {new Date(issue.reportedAt).toLocaleString()}</div>
          <div><strong>Last Updated:</strong> {new Date(issue.updatedAt).toLocaleString()}</div>
          <div><strong>Affected Users:</strong> {issue.affectedUsers}</div>
          {issue.resolvedAt && <div><strong>Resolved:</strong> {new Date(issue.resolvedAt).toLocaleString()}</div>}
          
          {/* Admin view for reporter type */}
          {user.role === 'admin' && (
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <strong>Reporter Type:</strong> {issue.reporterType === 'staff' ? '🧑‍🏫 Staff' : '🎓 Student'}
            </div>
          )}
        </div>

        {/* Update History */}
        {issue.updates && issue.updates.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Update History</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {issue.updates.map((upd) => (
                <li key={upd._id} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '4px', marginBottom: '0.5rem', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <span>{new Date(upd.createdAt).toLocaleString()}</span>
                    <span>By {upd.updatedBy?.name} ({upd.updatedBy?.role})</span>
                  </div>
                  {upd.previousStatus && upd.newStatus && (
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                      <strong>Status changed:</strong> {upd.previousStatus} <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /> {upd.newStatus}
                    </div>
                  )}
                  {upd.note && <div style={{ fontSize: '0.95rem', fontStyle: 'italic', background: 'var(--bg-surface)', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>"{upd.note}"</div>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {user.role === 'admin' && (
          <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h3>Admin Controls</h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Status</label>
                  <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Priority</label>
                  <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Resolution / Update Note (Optional)</label>
                <textarea 
                  className="form-input" 
                  value={note} 
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Explain what was done..." 
                  rows="3" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" disabled={updating} className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: 'var(--bg-surface)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {updating ? 'Saving...' : 'Update Issue & Add Note'}
              </button>
            </form>
            <button onClick={handleDelete} style={{ padding: '0.5rem 1.5rem', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '4px', cursor: 'pointer', marginTop: '1rem' }}>
              Delete Issue (Danger)
            </button>
          </div>
        )}
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Issues</button>
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;
