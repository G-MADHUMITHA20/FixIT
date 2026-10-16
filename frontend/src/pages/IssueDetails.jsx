import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import realtime from '../services/realtime';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  ChevronRight,
  Settings,
  Users,
  ArrowLeft,
  Trash2,
  MapPin,
  Tag,
  Calendar,
  User,
  Sparkles,
  AlertTriangle,
  Play,
  CheckSquare,
  RotateCcw,
  Phone,
  Mail,
  Zap,
} from 'lucide-react';

const IssueDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const fetchIssue = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchIssue();

    const fetchTechnicians = async () => {
      if (user.role === 'admin') {
        try {
          const res = await api.get('/admin/technicians');
          setTechnicians(res.data.data || []);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchTechnicians();

    // Subscribe to realtime updates
    const unsubAssigned = realtime.subscribe('issue_assigned', (data) => {
      if (data.issueId === id) fetchIssue();
    });
    const unsubStarted = realtime.subscribe('work_started', (data) => {
      if (data.issueId === id) fetchIssue();
    });
    const unsubCompleted = realtime.subscribe('work_completed', (data) => {
      if (data.issueId === id) fetchIssue();
    });
    const unsubUpdated = realtime.subscribe('issue_updated', (data) => {
      if (data.issueId === id) fetchIssue();
    });

    return () => {
      unsubAssigned();
      unsubStarted();
      unsubCompleted();
      unsubUpdated();
    };
  }, [id, user.role, fetchIssue]);

  const handleStartWork = async () => {
    setUpdating(true);
    try {
      await api.post(`/issues/${id}/start-work`);
      await fetchIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start work');
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWork = async () => {
    const completionNote = prompt('Optional completion note:', 'Work done and verified on campus.');
    if (completionNote === null) return;

    setUpdating(true);
    try {
      await api.post(`/issues/${id}/complete-work`, { note: completionNote });
      await fetchIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark work done');
    } finally {
      setUpdating(false);
    }
  };

  const handleReopen = async () => {
    const reason = prompt('Please explain why this issue is being reopened:', 'Issue still requires maintenance attention.');
    if (reason === null) return;

    setUpdating(true);
    try {
      await api.post(`/issues/${id}/reopen`, { note: reason });
      await fetchIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reopen issue');
    } finally {
      setUpdating(false);
    }
  };

  const handleTriggerAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const res = await api.post(`/issues/${id}/auto-assign`);
      if (res.data.success) {
        alert(res.data.message || 'Worker automatically assigned!');
      } else {
        alert(`Auto-assignment warning: ${res.data.message}`);
      }
      await fetchIssue();
    } catch (err) {
      alert(err.response?.data?.message || 'Auto-assignment failed');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await api.put(`/issues/${id}`, { status, priority, note });
      setIssue(res.data.data);
      setNote('');
      setStatus(res.data.data.status);
      setPriority(res.data.data.priority);
      await fetchIssue();
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

  const handleManualAssign = async () => {
    if (!selectedTechnician) return alert('Please select a technician');
    setAssigning(true);
    try {
      await api.post(`/issues/${id}/assign`, { technicianId: selectedTechnician });
      await fetchIssue();
      alert('Technician assigned successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Loading issue details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return <div className="alert alert-danger" style={{ maxWidth: '800px', margin: '2rem auto' }}>{error}</div>;
  }

  const timelineSteps = ['Reported', 'Assigned', 'In Progress', 'Work Done'];
  let currentStep = 0;
  if (issue.status === 'Work Done' || issue.status === 'Resolved') currentStep = 3;
  else if (issue.status === 'In Progress') currentStep = 2;
  else if (issue.status === 'Assigned') currentStep = 1;

  const isAssignedWorker = issue.assignedTechnician && (
    issue.assignedTechnician._id === user.id ||
    issue.assignedTechnician.id === user.id ||
    issue.assignedTechnician === user.id
  );

  const canReopen =
    (issue.status === 'Work Done' || issue.status === 'Resolved') &&
    (user.role === 'admin' || (issue.reportedBy && (issue.reportedBy._id === user.id || issue.reportedBy === user.id)));

  return (
    <>
      <div className="mb-3">
        <button onClick={() => navigate(-1)} className="btn btn-secondary flex items-center gap-1" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="surface-card" style={{ maxWidth: '920px', margin: '0 auto', padding: '0', overflow: 'hidden' }}>
        {/* Header Section */}
        <div style={{ backgroundColor: 'var(--color-background)', padding: '2rem', borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', display: 'block', marginBottom: '0.25rem' }}>
                TICKET #{issue._id.toString().toUpperCase()}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>{issue.title}</h2>
            </div>
            <div className="flex gap-2">
              <span className={`badge badge-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>{issue.status}</span>
              <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority} Priority</span>
            </div>
          </div>

          <div className="flex gap-4 mt-3" style={{ flexWrap: 'wrap' }}>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}>
              <Tag size={16} /> {issue.category}
            </span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}>
              <MapPin size={16} /> {issue.location}
            </span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}>
              <Calendar size={16} /> Reported: {new Date(issue.reportedAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.9rem' }}>
              <Users size={16} /> {issue.affectedUsers} Affected
            </span>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Status Timeline */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', background: 'var(--color-border)', zIndex: 0 }}></div>
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '10%',
                  width: `${(currentStep / 3) * 80}%`,
                  height: '2px',
                  background: 'var(--color-primary)',
                  zIndex: 1,
                  transition: 'width 0.3s ease',
                }}
              ></div>

              {timelineSteps.map((step, index) => {
                const isPassed = index <= currentStep;
                return (
                  <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isPassed ? 'var(--color-primary)' : 'var(--color-surface)',
                        border: `2px solid ${isPassed ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        color: isPassed ? '#fff' : 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {isPassed ? '✓' : index + 1}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: isPassed ? 600 : 400, color: isPassed ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical Safety Hazard Alert */}
          {issue.isSafetyHazard && (
            <div className="alert alert-danger mb-4 flex items-center gap-2" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <AlertTriangle size={24} color="var(--color-danger)" />
              <div>
                <strong style={{ display: 'block' }}>CRITICAL SAFETY ESCALATION DETECTED</strong>
                <span style={{ fontSize: '0.9rem' }}>{issue.safetyHazardReason || 'Hazardous maintenance conditions detected. Immediate intervention mandated.'}</span>
              </div>
            </div>
          )}

          {/* Gemma 4 AI Analysis & Intelligence Card */}
          {issue.aiClassification && (
            <div
              className="surface-card mb-4"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '1.25rem',
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} color="var(--color-primary)" />
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    Gemma 4 Intelligent Classification
                  </h4>
                </div>
                <span className="badge" style={{ fontSize: '0.75rem', background: issue.aiClassification.usedFallback ? 'var(--color-warning)' : 'var(--color-primary)', color: '#fff' }}>
                  {issue.aiClassification.usedFallback ? 'Deterministic Heuristic Fallback' : 'Gemma 4 Local Inference'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>Predicted Category</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{issue.aiClassification.predictedCategory}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>Issue Summary</span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>{issue.aiClassification.issueSummary}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block' }}>AI Recommended Urgency</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, textTransform: 'capitalize' }}>{issue.aiClassification.urgency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-4">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              Complaint Description
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {issue.description}
            </p>
          </div>

          {/* Worker Actions Bar (Visible to Assigned Worker or Admin) */}
          {(isAssignedWorker || user.role === 'admin') && (
            <div className="surface-card mb-4" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)', padding: '1.25rem' }}>
              <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>Worker Task Controls</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Current Status: <strong style={{ color: 'var(--color-primary)' }}>{issue.status}</strong>
                  </p>
                </div>

                <div className="flex gap-2">
                  {issue.status === 'Assigned' && (
                    <button onClick={handleStartWork} disabled={updating} className="btn btn-primary flex items-center gap-2">
                      <Play size={16} /> {updating ? 'Starting...' : 'Start Work'}
                    </button>
                  )}

                  {(issue.status === 'In Progress' || issue.status === 'Assigned') && (
                    <button
                      onClick={handleCompleteWork}
                      disabled={updating}
                      className="btn flex items-center gap-2"
                      style={{ backgroundColor: 'var(--color-success)', color: '#fff', border: 'none' }}
                    >
                      <CheckSquare size={16} /> {updating ? 'Saving...' : 'Mark as Work Done'}
                    </button>
                  )}

                  {canReopen && (
                    <button onClick={handleReopen} disabled={updating} className="btn btn-secondary flex items-center gap-2">
                      <RotateCcw size={16} /> Reopen Issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assigned Worker Details Card */}
          <div className="surface-card mb-4" style={{ backgroundColor: 'var(--color-background)', padding: '1.25rem' }}>
            <div className="flex justify-between items-center mb-2" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Assigned Maintenance Worker
                </h4>
                {issue.assignedTechnician ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <Wrench size={18} color="var(--color-primary)" />
                      <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{issue.assignedTechnician.name}</span>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                        {issue.assignedTechnician.specialization || 'Technician'}
                      </span>
                    </div>
                    <div className="flex gap-3 text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                      <span className="flex items-center gap-1"><Mail size={12} /> {issue.assignedTechnician.email}</span>
                      {issue.assignedTechnician.phone && (
                        <span className="flex items-center gap-1"><Phone size={12} /> {issue.assignedTechnician.phone}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                    Awaiting Worker Assignment {issue.assignmentStatus === 'failed_no_worker' && '(No Available Worker with Matching Specialization)'}
                  </span>
                )}
              </div>

              {/* Admin Reassignment & Auto-Assign Controls */}
              {user.role === 'admin' && (
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <button
                    onClick={handleTriggerAutoAssign}
                    disabled={autoAssigning}
                    className="btn btn-primary flex items-center gap-1"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    title="Run Gemma 4 Auto-Assignment Algorithm"
                  >
                    <Zap size={14} />
                    {autoAssigning ? 'Auto-Assigning...' : 'Auto-Assign'}
                  </button>

                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 1.75rem 0.4rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                  >
                    <option value="">Reassign Worker ▼</option>
                    {technicians.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.specialization} - {t.activeAssignmentsCount}/{t.maxAssignments})
                      </option>
                    ))}
                  </select>
                  <button onClick={handleManualAssign} disabled={assigning || !selectedTechnician} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    {assigning ? 'Assigning...' : 'Set Worker'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Update History */}
          {issue.updates && issue.updates.length > 0 && (
            <div className="mb-4">
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                Resolution & Audit History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {issue.updates.map((upd) => (
                  <div key={upd._id} className="surface-card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
                        <User size={14} /> <span>{upd.updatedBy?.name} ({upd.updatedBy?.role || 'system'})</span>
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(upd.createdAt).toLocaleString()}</span>
                    </div>

                    {upd.previousStatus && upd.newStatus && (
                      <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.85rem' }}>
                        <span className={`badge badge-${upd.previousStatus.toLowerCase().replace(/\s+/g, '-')}`}>{upd.previousStatus}</span>
                        <ChevronRight size={14} color="var(--color-text-muted)" />
                        <span className={`badge badge-${upd.newStatus.toLowerCase().replace(/\s+/g, '-')}`}>{upd.newStatus}</span>
                      </div>
                    )}

                    {upd.note && (
                      <div style={{ background: 'var(--color-background)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        {upd.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Operations Section */}
          {user.role === 'admin' && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <div className="flex items-center gap-2 mb-3">
                <Settings size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>Admin Operations</h3>
              </div>
              {issue.technicianCompletion && issue.status !== 'Resolved' && (
                <div className="alert alert-info mb-4" style={{ backgroundColor: 'color-mix(in srgb, var(--color-info) 10%, var(--color-surface))', border: '1px solid var(--color-info)', color: 'var(--color-text-primary)' }}>
                  <strong>Technician Status:</strong> Work Completed. Please review and Confirm &amp; Resolve.
                </div>
              )}

              <div className="surface-card" style={{ backgroundColor: 'var(--color-background)', border: 'none' }}>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Update Status</label>
                      <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Work Done">Work Done</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Reopened">Reopened</option>
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
                    <label className="form-label">Admin Audit Note / Update Details (Optional)</label>
                    <textarea
                      className="form-textarea"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Explain what actions were taken or reason for modification..."
                      rows="2"
                    />
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <button type="button" onClick={handleDelete} className="btn btn-secondary flex items-center gap-1" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      <Trash2 size={16} /> Delete Issue
                    </button>

                    <button type="submit" disabled={updating} className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
                      {updating ? 'Saving...' : (status === 'Resolved' && issue.status !== 'Resolved' ? 'Confirm & Resolve' : 'Save Updates')}
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
