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
        note: `Work commenced on site.`,
      });
      await fetchIssues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start work');
    } finally {
      setActionLoading((prev) => ({ ...prev, [issueId]: null }));
    }
  };

  const handleCompleteWork = async (e, issueId) => {
    e.preventDefault();
    e.stopPropagation();
    const note = prompt('Optional: Add a brief completion note for the student/staff:', 'Issue resolved and verified.');
    if (note === null) return; // user cancelled

    setActionLoading((prev) => ({ ...prev, [issueId]: 'completing' }));
    try {
      await api.post(`/issues/${issueId}/complete-work`, { note });
      await fetchIssues();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark work as done');
    } finally {
      setActionLoading((prev) => ({ ...prev, [issueId]: null }));
    }
  };

  const assignedCount = issues.filter((i) => i.status === 'Assigned' || i.status === 'Pending').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const completedCount = issues.filter((i) => i.status === 'Work Done' || i.status === 'Resolved').length;

  const filteredIssues = issues.filter((issue) => {
    if (statusFilter === 'active') {
      return issue.status === 'Assigned' || issue.status === 'In Progress' || issue.status === 'Pending';
    }
    if (statusFilter === 'in-progress') return issue.status === 'In Progress';
    if (statusFilter === 'completed') return issue.status === 'Work Done' || issue.status === 'Resolved';
    return true;
  });

  return (
    <>
      <div className="page-title flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={28} color="var(--color-primary)" />
          <h2 style={{ margin: 0 }}>Worker Task Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
            <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Specialization: {user?.specialization || 'General Maintenance'}
          </span>
          <span className={`badge ${user?.availabilityStatus === 'Available' ? 'badge-resolved' : 'badge-pending'}`}>
            Status: {user?.availabilityStatus || 'Available'}
          </span>
        </div>
      </div>
      <p className="page-subtitle">Welcome, {user?.name}. Manage and resolve your real-time campus maintenance assignments.</p>

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
                  Work Done
                </h3>
                <CheckCircle size={20} color="var(--color-success)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{completedCount}</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Assigned Work Orders ({filteredIssues.length})
            </h3>
            <div className="flex gap-2">
              <button
                className={`btn ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('active')}
              >
                Active Tasks
              </button>
              <button
                className={`btn ${statusFilter === 'in-progress' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('in-progress')}
              >
                In Progress
              </button>
              <button
                className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('completed')}
              >
                Completed
              </button>
              <button
                className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem' }}
                onClick={() => setStatusFilter('all')}
              >
                All
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
                const isWorkDone = issue.status === 'Work Done' || issue.status === 'Resolved';
                const isInProgress = issue.status === 'In Progress';
                const isAssigned = issue.status === 'Assigned' || issue.status === 'Pending';

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
                              <CheckCircle size={14} /> Done: {new Date(issue.completedAt).toLocaleString()}
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
                          <button
                            onClick={(e) => handleCompleteWork(e, issue._id)}
                            disabled={actionLoading[issue._id] === 'completing'}
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
                            {actionLoading[issue._id] === 'completing' ? 'Saving...' : 'Mark as Work Done'}
                          </button>
                        )}

                        {isWorkDone && (
                          <div className="flex items-center gap-1" style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.9rem', padding: '0.4rem 0' }}>
                            <CheckCircle size={18} /> Completed
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
