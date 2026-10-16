import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  ShieldCheck,
  BarChart2,
  AlertCircle,
  CheckCircle,
  Users,
  PenTool,
  LayoutList,
  Globe,
  Tag,
  MapPin,
  Calendar,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import realtime from '../services/realtime';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    myActive: 0,
    myResolved: 0,
    supported: 0,
    campusActive: 0,
    campusTotal: 0,
  });
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [publicRes, myRes] = await Promise.all([
        api.get('/issues'),
        api.get('/issues?my=true'),
      ]);

      const publicIssues = publicRes.data.data || [];
      const issues = myRes.data.data || [];
      setMyIssues(issues);

      setStats({
        myActive: issues.filter((i) => i.status !== 'Work Done' && i.status !== 'Resolved' && i.status !== 'Closed').length,
        myResolved: issues.filter((i) => i.status === 'Work Done' || i.status === 'Resolved' || i.status === 'Closed').length,
        supported: publicIssues.filter((i) => i.supportedBy && i.supportedBy.includes(user.id)).length,
        campusActive: publicIssues.filter((i) => i.status !== 'Work Done' && i.status !== 'Resolved' && i.status !== 'Closed').length,
        campusTotal: publicIssues.length,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates for instant synchronization
    const unsubAssigned = realtime.subscribe('issue_assigned', () => fetchStats());
    const unsubStarted = realtime.subscribe('work_started', () => fetchStats());
    const unsubCompleted = realtime.subscribe('work_completed', () => fetchStats());
    const unsubUpdated = realtime.subscribe('issue_updated', () => fetchStats());

    const interval = setInterval(fetchStats, 10000);

    return () => {
      unsubAssigned();
      unsubStarted();
      unsubCompleted();
      unsubUpdated();
      clearInterval(interval);
    };
  }, [fetchStats]);

  return (
    <>
      <div className="page-title">
        <ShieldCheck size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>{user?.role === 'staff' ? 'Staff Maintenance Portal' : 'Student Maintenance Portal'}</h2>
      </div>
      <p className="page-subtitle">Welcome back, {user?.name}. Track your reported complaints and campus facility updates in real time.</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Personal Overview KPIs */}
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Personal Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>My Active Issues</h3>
                <AlertCircle size={20} color="var(--color-warning)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats.myActive}</p>
            </div>

            <div className="surface-card" style={{ borderTop: '4px solid var(--color-success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>My Resolved Issues</h3>
                <CheckCircle size={20} color="var(--color-success)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats.myResolved}</p>
            </div>

            <div className="surface-card" style={{ borderTop: '4px solid var(--color-info)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Issues I Supported</h3>
                <Users size={20} color="var(--color-info)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats.supported}</p>
            </div>
          </div>

          {/* My Recent Complaints List */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text-primary)' }}>
                My Reported Complaints ({myIssues.length})
              </h3>
              <Link to="/report-issue" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                + Submit Complaint
              </Link>
            </div>

            {myIssues.length === 0 ? (
              <div className="surface-card text-center" style={{ padding: '2.5rem' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>You have not reported any maintenance issues yet.</p>
              </div>
            ) : (
              <div className="surface-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="app-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Assigned Worker</th>
                      <th>Status</th>
                      <th>Submitted / Done</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myIssues.slice(0, 5).map((issue) => (
                      <tr key={issue._id} style={{ cursor: 'pointer' }} onClick={() => (window.location.href = `/issues/${issue._id}`)}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          #{issue._id.toString().slice(-6).toUpperCase()}
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <Link to={`/issues/${issue._id}`} style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {issue.title}
                          </Link>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {issue.description.slice(0, 70)}...
                          </p>
                        </td>
                        <td>
                          <span className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}>
                            <Tag size={12} /> {issue.category}
                          </span>
                        </td>
                        <td>
                          {issue.assignedTechnician ? (
                            <span className="flex items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              <Wrench size={14} color="var(--color-primary)" /> {issue.assignedTechnician.name}
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                              Pending Assignment
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${issue.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {issue.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                          <div>Sub: {new Date(issue.reportedAt).toLocaleDateString()}</div>
                          {issue.completedAt && (
                            <div style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                              Done: {new Date(issue.completedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions Grid */}
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <Link to="/report-issue" style={{ textDecoration: 'none' }}>
              <div className="surface-card interactive" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', height: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <PenTool size={24} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.1rem' }}>Report an Issue</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                    Submit a complaint in natural language. Gemma 4 will automatically categorize and dispatch a technician.
                  </p>
                </div>
              </div>
            </Link>

            <Link to="/my-issues" style={{ textDecoration: 'none' }}>
              <div className="surface-card interactive" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', height: '100%' }}>
                <div style={{ background: 'color-mix(in srgb, var(--color-info) 10%, transparent)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <LayoutList size={24} color="var(--color-info)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>My Issues</h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                    View and track all maintenance complaints you have submitted with real-time status.
                  </p>
                </div>
              </div>
            </Link>

            <Link to="/public-issues" style={{ textDecoration: 'none' }}>
              <div className="surface-card interactive" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', height: '100%' }}>
                <div style={{ background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <Globe size={24} color="var(--color-success)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-text-primary)', fontSize: '1.1rem' }}>Campus Issues Feed</h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>
                    See facility repairs across campus and support existing reports.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </>
  );
};

export default StudentDashboard;
