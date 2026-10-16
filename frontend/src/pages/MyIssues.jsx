import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import realtime from '../services/realtime';
import { LayoutList, Search, Plus, MapPin, Tag, Wrench, Calendar, CheckCircle } from 'lucide-react';

const MyIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIssues = useCallback(async () => {
    try {
      const res = await api.get('/issues?my=true');
      setIssues(res.data.data || []);
    } catch (err) {
      setError('Failed to fetch your reported issues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues();

    // Subscribe to realtime updates
    const unsubAssigned = realtime.subscribe('issue_assigned', () => fetchIssues());
    const unsubStarted = realtime.subscribe('work_started', () => fetchIssues());
    const unsubCompleted = realtime.subscribe('work_completed', () => fetchIssues());
    const unsubUpdated = realtime.subscribe('issue_updated', () => fetchIssues());

    const interval = setInterval(fetchIssues, 10000);

    return () => {
      unsubAssigned();
      unsubStarted();
      unsubCompleted();
      unsubUpdated();
      clearInterval(interval);
    };
  }, [fetchIssues]);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="page-title">
            <LayoutList size={28} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>My Reported Complaints</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Track worker assignment, progress, and completion timestamps in real time.
          </p>
        </div>
        <Link to="/report-issue" className="btn btn-primary flex items-center gap-1">
          <Plus size={18} /> Report New Issue
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading your reported issues...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="table-container">
          {issues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div
                style={{
                  background: 'var(--color-background)',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem auto',
                }}
              >
                <Search size={32} color="var(--color-text-muted)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
                No Maintenance Requests Found
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                You haven't reported any maintenance issues yet.
              </p>
              <Link to="/report-issue" className="btn btn-secondary">
                Report an Issue
              </Link>
            </div>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Complaint Description</th>
                  <th>Category</th>
                  <th>Assigned Worker</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr
                    key={issue._id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => (window.location.href = `/issues/${issue._id}`)}
                  >
                    <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      #{issue._id.toString().slice(-6).toUpperCase()}
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <Link to={`/issues/${issue._id}`} style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {issue.title}
                      </Link>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                        {issue.description.slice(0, 80)}...
                      </p>
                      <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                        <MapPin size={12} /> {issue.location}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
                        <Tag size={14} /> {issue.category}
                      </span>
                    </td>
                    <td>
                      {issue.assignedTechnician ? (
                        <div>
                          <span className="flex items-center gap-1" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                            <Wrench size={14} color="var(--color-primary)" /> {issue.assignedTechnician.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                            {issue.assignedTechnician.specialization || 'Technician'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 500 }}>
                          Awaiting Worker
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} /> Sub: {new Date(issue.reportedAt).toLocaleDateString()}
                      </div>
                      {issue.completedAt && (
                        <div className="flex items-center gap-1" style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: '2px' }}>
                          <CheckCircle size={12} /> Done: {new Date(issue.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
};

export default MyIssues;
