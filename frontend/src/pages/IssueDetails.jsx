import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Clock, CheckCircle, AlertCircle, Wrench, ChevronRight, Settings, Users, ArrowLeft, Trash2, MapPin, Tag, Calendar, User } from 'lucide-react';

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
      // Re-initialize dropdown states to match the new issue data if we rely on it
      setStatus(res.data.data.status);
      setPriority(res.data.data.priority);
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
      try {
        await api.delete(`/issues/${id}`);
        navigate('/admin-dashboard');
      } catch (err) {
        alert(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}><p>Loading issue details...</p></div>;
  if (error || !issue) return <div className="alert alert-danger" style={{ maxWidth: '800px', margin: '2rem auto' }}>{error}</div>;

  const timelineSteps = ['Reported', 'Pending', 'In Progress', 'Resolved'];
  const currentStep = issue.status === 'Resolved' ? 3 : issue.status === 'In Progress' ? 2 : 1;

  return (
    <>
      <div className="mb-3">
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Issues
        </button>
      </div>
      
      <div className="surface-card" style={{ maxWidth: '900px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ backgroundColor: 'var(--color-background)', padding: '2rem', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-start mb-2">
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>{issue.title}</h2>
            <div className="flex gap-2">
              <span className={`badge badge-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
              <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority} Priority</span>
            </div>
          </div>
          
          <div className="flex gap-4 mt-3" style={{ flexWrap: 'wrap' }}>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}><Tag size={16}/> {issue.category}</span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}><MapPin size={16}/> {issue.location}</span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}><Calendar size={16}/> {new Date(issue.reportedAt).toLocaleDateString()}</span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}><Users size={16}/> {issue.affectedUsers} Affected</span>
          </div>
        </div>
        
        <div style={{ padding: '2rem' }}>
          
          {/* Status Timeline */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Background Line */}
              <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', background: 'var(--color-border)', zIndex: 0 }}></div>
              
              {/* Active Line */}
              <div style={{ position: 'absolute', top: '14px', left: '10%', width: `${(currentStep / 3) * 80}%`, height: '2px', background: 'var(--color-primary)', zIndex: 1, transition: 'width 0.3s ease' }}></div>
              
              {timelineSteps.map((step, index) => {
                const isCompleted = index <= currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: '25%' }}>
                    <div style={{ 
                      width: '30px', height: '30px', borderRadius: '50%', 
                      background: isCompleted ? 'var(--color-primary)' : 'var(--color-surface)', 
                      border: `2px solid ${isCompleted ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      color: isCompleted ? '#fff' : 'var(--color-text-muted)', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center', 
                      fontSize: '0.85rem', fontWeight: 'bold',
                      boxShadow: isCurrent ? '0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent)' : 'none'
                    }}>
                      {index < currentStep ? <CheckCircle size={16} /> : (index + 1)}
                    </div>
                    <span style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: isCurrent ? 600 : 400, color: isCompleted ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Description</h3>
            <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{issue.description}</p>
          </div>
          
          <div className="surface-card mb-4" style={{ backgroundColor: 'var(--color-background)', border: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Reported At</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{new Date(issue.reportedAt).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Last Updated</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{new Date(issue.updatedAt).toLocaleString()}</span>
              </div>
              {issue.resolvedAt && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Resolved At</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-success)' }}>{new Date(issue.resolvedAt).toLocaleString()}</span>
                </div>
              )}
              {user.role === 'admin' && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Reporter Type</span>
                  <span className="badge" style={{ backgroundColor: issue.reporterType === 'staff' ? 'var(--color-info)' : 'var(--color-primary)', color: '#fff' }}>
                    {issue.reporterType === 'staff' ? 'Staff Member' : 'Student'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Update History */}
          {issue.updates && issue.updates.length > 0 && (
            <div className="mb-4">
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Resolution & Update History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {issue.updates.map((upd) => (
                  <div key={upd._id} className="surface-card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                        <User size={14} /> <span>{upd.updatedBy?.name} <span style={{ textTransform: 'capitalize' }}>({upd.updatedBy?.role})</span></span>
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>{new Date(upd.createdAt).toLocaleString()}</span>
                    </div>
                    
                    {upd.previousStatus && upd.newStatus && (
                      <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.9rem' }}>
                        <span className={`badge badge-${upd.previousStatus.toLowerCase().replace(' ', '-')}`}>{upd.previousStatus}</span>
                        <ChevronRight size={14} color="var(--color-text-muted)" />
                        <span className={`badge badge-${upd.newStatus.toLowerCase().replace(' ', '-')}`}>{upd.newStatus}</span>
                      </div>
                    )}
                    
                    {upd.note && (
                      <div style={{ background: 'var(--color-background)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', color: 'var(--color-text-primary)', borderLeft: '2px solid var(--color-border)' }}>
                        {upd.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.role === 'admin' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginTop: '1rem' }}>
              <div className="flex items-center gap-2 mb-3">
                <Settings size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>Admin Operations</h3>
              </div>
              
              <div className="surface-card" style={{ backgroundColor: 'var(--color-background)', border: 'none' }}>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Update Status</label>
                      <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Update Priority</label>
                      <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Resolution Note / Update Details (Optional)</label>
                    <textarea 
                      className="form-textarea" 
                      value={note} 
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Explain what actions were taken or why the status changed..." 
                      rows="3" 
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <button type="button" onClick={handleDelete} className="btn btn-secondary" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      <Trash2 size={16} /> Delete Issue
                    </button>
                    
                    <button type="submit" disabled={updating} className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
                      {updating ? 'Saving Changes...' : 'Save Updates'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
};

export default IssueDetails;
