import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle,
  LayoutList,
  Play,
  CheckSquare,
  MapPin,
  Calendar,
  Tag,
  Briefcase,
  AlertTriangle,
  MessageSquare,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import realtime from '../services/realtime';

const TechnicianDashboard = () => {
  const { user } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'all', 'in-progress', 'completed'

  // Modal states for progress note and resolve details
  const [activeModal, setActiveModal] = useState(null); // { type: 'note' | 'resolve', issueId: string, title: string }
  const [modalText, setModalText] = useState('');

  const fetchIssues = useCallback(async () => {
    try {
      const res = await api.get('/issues');
      setIssues(res.data.data || []);
    } catch (err) {
      console.error('Failed to load technician tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();

    // Subscribe to real-time events for instant update
    const unsubAssign = realtime.subscribe('issue_assigned', (data) => {
      if (data.workerId === user?.id || data.workerId === user?._id) {
        fetchIssues();
      }
    });
    const unsubStarted = realtime.subscribe('work_started', () => fetchIssues());
    const unsubCompleted = realtime.subscribe('work_completed', () => fetchIssues());
    const unsubUpdated = realtime.subscribe('issue_updated', () => fetchIssues());

    // Fallback periodic poll every 10s
    const pollInterval = setInterval(fetchIssues, 10000);

    return () => {
      unsubAssign();
      unsubStarted();
      unsubCompleted();
      unsubUpdated();
      clearInterval(pollInterval);
    };
  }, [fetchIssues, user?.id, user?._id]);

  const handleStartWork = async (e, issueId) => {
    e.preventDefault();
    e.stopPropagation();
    setActionLoading((prev) => ({ ...prev, [issueId]: 'starting' }));
    try {
      await api.post(`/issues/${issueId}/start-work`, {
        note: `Work commenced on site by ${user?.name}.`,
      });
      await fetchIssues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start work');
    } finally {
      setActionLoading((prev) => ({ ...prev, [issueId]: null }));
    }
  };

  const openResolveModal = (e, issue) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveModal({
      type: 'resolve',
      issueId: issue._id,
      title: issue.title,
    });
    setModalText('Maintenance completed, tested, and confirmed functional.');
  };

  const openNoteModal = (e, issue) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveModal({
      type: 'note',
      issueId: issue._id,
      title: issue.title,
    });
    setModalText('');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!activeModal) return;

    const { type, issueId } = activeModal;
    setActionLoading((prev) => ({ ...prev, [issueId]: type }));

    try {
      if (type === 'resolve') {
        await api.post(`/issues/${issueId}/complete-work`, {
          note: modalText || 'Work completed and verified.',
        });
      } else if (type === 'note') {
        await api.put(`/issues/${issueId}`, {
          note: modalText || 'Work progress recorded by technician.',
        });
      }
      setActiveModal(null);
      await fetchIssues();
    } catch (err) {
      alert(err.response?.data?.message || 'Operation failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [issueId]: null }));
    }
  };

  const assignedCount = issues.filter((i) => i.status === 'Assigned' || i.status === 'Pending' || i.status === 'Pending Assignment').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const completedCount = issues.filter((i) => i.status === 'Work Done' || i.status === 'Resolved' || i.status === 'Closed').length;

  const filteredIssues = issues.filter((issue) => {
    if (statusFilter === 'active') {
      return issue.status === 'Assigned' || issue.status === 'In Progress' || issue.status === 'Pending' || issue.status === 'Pending Assignment';
    }
    if (statusFilter === 'in-progress') return issue.status === 'In Progress';
    if (statusFilter === 'completed') return issue.status === 'Work Done' || issue.status === 'Resolved' || issue.status === 'Closed';
    return true;
  });

  return (
    <>
      <div className="page-title flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={28} color="var(--color-primary)" />
          <div>
            <h2 style={{ margin: 0 }}>Technician Work Order Portal</h2>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Welcome back, {user?.name}. Manage your assigned work orders and report resolution progress.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Specialization: {user?.specialization || 'General Maintenance'}
          </span>
          <span className={`badge ${user?.availabilityStatus === 'Available' ? 'badge-resolved' : 'badge-pending'}`}>
            Status: {user?.availabilityStatus || 'Available'}
          </span>
        </div>
      </div>

      {/* Progress & Resolve Modal Dialog */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="surface-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {activeModal.type === 'resolve' ? 'Mark Complaint as Resolved' : 'Add Progress / Site Note'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
              Ticket: <strong>{activeModal.title}</strong>
            </p>

            <form onSubmit={handleModalSubmit}>
              <div className="form-group mb-3">
                <label className="form-label">
                  {activeModal.type === 'resolve' ? 'Resolution & Completion Details *' : 'Progress Note Details *'}
                </label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  required
                  placeholder={activeModal.type === 'resolve' ? 'Describe the corrective action taken, parts replaced, and verification...' : 'Log parts on order, inspection results, or scheduled work times...'}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading[activeModal.issueId]}
                  className={`btn ${activeModal.type === 'resolve' ? 'btn-success' : 'btn-primary'}`}
                  style={activeModal.type === 'resolve' ? { backgroundColor: 'var(--color-success)', color: '#fff' } : {}}
                >
                  {actionLoading[activeModal.issueId] ? 'Saving...' : activeModal.type === 'resolve' ? 'Submit Resolution' : 'Save Progress Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading your assigned tasks...</p>
        </div>
      ) : (
        <>
          {/* Workload Status KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div
              className="surface-card interactive"
              onClick={() => setStatusFilter('active')}
              style={{
                borderTop: '4px solid var(--color-warning)',
                cursor: 'pointer',
                opacity: statusFilter === 'active' ? 1 : 0.8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Assigned / To Do
                </h3>
                <AlertCircle size={20} color="var(--color-warning)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{assignedCount}</p>
            </div>

            <div
              className="surface-card interactive"
              onClick={() => setStatusFilter('in-progress')}
              style={{
                borderTop: '4px solid var(--color-info)',
                cursor: 'pointer',
                opacity: statusFilter === 'in-progress' ? 1 : 0.8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Currently In Progress
                </h3>
                <Clock size={20} color="var(--color-info)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{inProgressCount}</p>
            </div>

            <div
              className="surface-card interactive"
              onClick={() => setStatusFilter('completed')}
              style={{
                borderTop: '4px solid var(--color-success)',
                cursor: 'pointer',
                opacity: statusFilter === 'completed' ? 1 : 0.8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Completed History
                </h3>
                <CheckCircle size={20} color="var(--color-success)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{completedCount}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Assigned Work Orders ({filteredIssues.length})
            </h3>
            <div className="flex gap-2">
              <button
                className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('active')}
              >
                Active Tasks ({assignedCount + inProgressCount})
              </button>
              <button
                className={`btn ${statusFilter === 'in-progress' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('in-progress')}
              >
                In Progress ({inProgressCount})
              </button>
              <button
                className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('completed')}
              >
                Completed ({completedCount})
              </button>
              <button
                className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('all')}
              >
                All ({issues.length})
              </button>
            </div>
          </div>

          {/* Issues List with Quick Action Buttons */}
          {filteredIssues.length === 0 ? (
            <div className="surface-card text-center" style={{ padding: '3.5rem 2rem' }}>
              <LayoutList size={48} color="var(--color-border)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>No Tasks in this View</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                {statusFilter === 'active'
                  ? 'Great job! You have no pending tasks waiting to be started or finished.'
                  : 'No tasks matching the selected filter.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredIssues.map((issue) => {
                const isSafety = issue.isSafetyHazard || issue.priority === 'Critical';
                const isWorkDone = issue.status === 'Work Done' || issue.status === 'Resolved' || issue.status === 'Closed';
                const isInProgress = issue.status === 'In Progress';
                const isAssigned = issue.status === 'Assigned' || issue.status === 'Pending' || issue.status === 'Pending Assignment';

                return (
                  <div
                    key={issue._id}
                    className="surface-card"
                    style={{
                      padding: '1.5rem',
                      borderLeft: `5px solid ${
                        isSafety
                          ? 'var(--color-danger)'
                          : isWorkDone
                          ? 'var(--color-success)'
                          : isInProgress
                          ? 'var(--color-info)'
                          : 'var(--color-warning)'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        {/* Ticket ID & Badges */}
                        <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', background: 'rgba(59,130,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            Ticket #{issue._id.toString().slice(-6).toUpperCase()}
                          </span>
                          <span className={`badge badge-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {issue.status}
                          </span>
                          <span className={`badge badge-${issue.priority.toLowerCase()}`}>
                            {issue.priority} Priority
                          </span>
                          {issue.isSafetyHazard && (
                            <span className="badge badge-danger flex items-center gap-1">
                              <AlertTriangle size={12} /> Safety Hazard
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                            {issue.title}
                          </h4>
                        </Link>
                        <p style={{ margin: '0 0 1rem 0', color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                          {issue.description}
                        </p>

                        {/* Complaint Details */}
                        <div className="flex gap-4 text-muted" style={{ fontSize: '0.85rem', flexWrap: 'wrap' }}>
                          <span className="flex items-center gap-1">
                            <Tag size={14} color="var(--color-primary)" /> {issue.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} color="var(--color-danger)" /> {issue.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> Assigned: {issue.assignedAt ? new Date(issue.assignedAt).toLocaleString() : 'Recently'}
                          </span>
                          {issue.completedAt && (
                            <span className="flex items-center gap-1" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                              <CheckCircle size={14} /> Resolved: {new Date(issue.completedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Worker Action Buttons */}
                      <div className="flex flex-col gap-2" style={{ minWidth: '180px', alignItems: 'flex-end' }}>
                        {isAssigned && (
                          <button
                            onClick={(e) => handleStartWork(e, issue._id)}
                            disabled={actionLoading[issue._id] === 'starting'}
                            className="btn btn-primary flex items-center gap-2"
                            style={{ width: '100%', justifyContent: 'center', padding: '0.6rem 1.25rem' }}
                          >
                            <Play size={16} />
                            {actionLoading[issue._id] === 'starting' ? 'Starting...' : 'Start Work'}
                          </button>
                        )}

                        {isInProgress && (
                          <>
                            <button
                              onClick={(e) => openResolveModal(e, issue)}
                              disabled={actionLoading[issue._id] === 'resolve'}
                              className="btn flex items-center gap-2"
                              style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '0.6rem 1.25rem',
                                backgroundColor: 'var(--color-success)',
                                color: '#ffffff',
                                border: 'none',
                              }}
                            >
                              <CheckSquare size={16} />
                              {actionLoading[issue._id] === 'resolve' ? 'Saving...' : 'Mark as Resolved'}
                            </button>

                            <button
                              onClick={(e) => openNoteModal(e, issue)}
                              className="btn btn-secondary flex items-center gap-1"
                              style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                            >
                              <MessageSquare size={14} /> Add Progress Note
                            </button>
                          </>
                        )}

                        {isWorkDone && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem', padding: '0.4rem 0' }}>
                            <CheckCircle size={18} /> Completed &amp; Verified
                          </div>
                        )}

                        <Link
                          to={`/issues/${issue._id}`}
                          className="btn btn-secondary"
                          style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                        >
                          View Full Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default TechnicianDashboard;
