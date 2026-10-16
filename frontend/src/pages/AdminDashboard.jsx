import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Tag,
  Users,
  Wrench,
  Sparkles,
  Zap,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import realtime from '../services/realtime';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [unassignedIssues, setUnassignedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState({});

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, workersRes, issuesRes] = await Promise.all([
        api.get('/issues/stats'),
        api.get('/admin/technicians'),
        api.get('/issues?unassigned=true'),
      ]);
      setStats(statsRes.data.data);
      setWorkers(workersRes.data.data || []);
      setUnassignedIssues(issuesRes.data.data || []);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime updates for instant synchronization
    const unsubCreated = realtime.subscribe('issue_created', () => fetchDashboardData());
    const unsubAssigned = realtime.subscribe('issue_assigned', () => fetchDashboardData());
    const unsubStarted = realtime.subscribe('work_started', () => fetchDashboardData());
    const unsubCompleted = realtime.subscribe('work_completed', () => fetchDashboardData());
    const unsubWorkerUpdated = realtime.subscribe('worker_updated', () => fetchDashboardData());
    const unsubSafety = realtime.subscribe('safety_alert', () => fetchDashboardData());

    // Periodic poll every 15s as fallback
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      unsubCreated();
      unsubAssigned();
      unsubStarted();
      unsubCompleted();
      unsubWorkerUpdated();
      unsubSafety();
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  const handleTriggerAutoAssign = async (issueId) => {
    setAutoAssigning((prev) => ({ ...prev, [issueId]: true }));
    try {
      const res = await api.post(`/issues/${issueId}/auto-assign`);
      if (res.data.success) {
        alert(res.data.message || 'Worker automatically assigned!');
      } else {
        alert(`Auto-assignment warning: ${res.data.message}`);
      }
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Auto-assignment failed');
    } finally {
      setAutoAssigning((prev) => ({ ...prev, [issueId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Loading administration metrics and worker status...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        <p>Error loading administration statistics. Check backend connection.</p>
      </div>
    );
  }

  const COLORS = [
    'var(--color-primary)',
    'var(--color-success)',
    'var(--color-warning)',
    'var(--color-danger)',
    'var(--color-info)',
  ];
  const PRIORITY_COLORS = {
    Critical: 'var(--color-danger)',
    High: 'var(--color-warning)',
    Medium: 'var(--color-info)',
    Low: 'var(--color-text-muted)',
  };
  const STATUS_COLORS = {
    Pending: 'var(--color-warning)',
    Assigned: 'var(--color-primary)',
    'In Progress': 'var(--color-info)',
    'Work Done': 'var(--color-success)',
  };

  return (
    <>
      <div className="page-title flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={28} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>FixIt AI Maintenance Administration</h2>
          </div>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
            Powered by Gemma 4 Intelligent Worker Assignment & Real-Time Telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/technicians"
            className="btn btn-primary flex items-center gap-2"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
          >
            <Users size={16} /> Manage Maintenance Workers
          </Link>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary flex items-center gap-2"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
          >
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Critical Safety & SLA Alerts */}
      {stats.criticalUnresolved && stats.criticalUnresolved.length > 0 && (
        <div
          className="surface-card mb-4"
          style={{
            borderLeft: '4px solid var(--color-danger)',
            backgroundColor: 'color-mix(in srgb, var(--color-danger) 6%, var(--color-surface))',
          }}
        >
          <h3 className="flex items-center gap-2 text-danger" style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
            <AlertTriangle size={22} /> Urgent Safety & Critical Complaints ({stats.criticalUnresolved.length})
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Gemma 4 and safety heuristics flagged these complaints for immediate resolution.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {stats.criticalUnresolved.map((issue) => (
              <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-danger)',
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 style={{ margin: 0, color: 'var(--color-danger)', fontSize: '0.95rem' }}>{issue.title}</h4>
                    <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>CRITICAL</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    📍 {issue.location}
                  </p>
                  {issue.safetyHazardReason && (
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-danger)', fontStyle: 'italic' }}>
                      ⚠️ {issue.safetyHazardReason}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Key Operational Metrics
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-text-muted)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Complaints
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {stats.total}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Pending Assignment
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>
            {stats.pending}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Worker Assigned
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {stats.assigned || 0}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-info)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            In Progress
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-info)' }}>
            {stats.inProgress}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Work Done
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {stats.workDone || stats.resolved}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Resolution Rate
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {stats.resolutionPercentage}%
          </p>
        </div>
      </div>

      {/* Manage Maintenance Workers & Live Capacity Section */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Users size={22} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-text-primary)' }}>
              Manage Maintenance Workers & Live Capacity ({workers.length} Workers)
            </h3>
          </div>
          <Link to="/admin/technicians" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
            Manage Maintenance Workers
          </Link>
        </div>

        <div className="surface-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table className="app-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Specialization</th>
                <th>Availability</th>
                <th>Current Active Load</th>
                <th>Max Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {workers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No technicians found. Use "Manage Workers" to add maintenance staff.
                  </td>
                </tr>
              ) : (
                workers.map((worker) => {
                  const active = worker.activeAssignmentsCount || 0;
                  const max = worker.maxAssignments || 3;
                  const isOverloaded = active >= max;
                  const percent = Math.min(100, Math.round((active / max) * 100));

                  return (
                    <tr key={worker._id}>
                      <td style={{ fontWeight: 600 }}>{worker.name}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                          {worker.specialization || 'General Maintenance'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            worker.availabilityStatus === 'Available'
                              ? 'badge-resolved'
                              : worker.availabilityStatus === 'On Leave'
                              ? 'badge-pending'
                              : 'badge-danger'
                          }`}
                        >
                          {worker.availabilityStatus || 'Available'}
                        </span>
                      </td>
                      <td style={{ minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px' }}>
                            {active} / {max}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              backgroundColor: 'var(--color-background)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                backgroundColor: isOverloaded
                                  ? 'var(--color-danger)'
                                  : percent > 60
                                  ? 'var(--color-warning)'
                                  : 'var(--color-success)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        {max} tasks max
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: worker.isActive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {worker.isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unassigned Issues & Assignment Failures Section */}
      {unassignedIssues.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Zap size={20} color="var(--color-warning)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text-primary)' }}>
                Pending / Unassigned Complaints ({unassignedIssues.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Requires worker assignment or capacity adjustment
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {unassignedIssues.slice(0, 6).map((issue) => (
              <div
                key={issue._id}
                className="surface-card"
                style={{
                  borderLeft: '4px solid var(--color-warning)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      #{issue._id.toString().slice(-6).toUpperCase()}
                    </span>
                    <span className="badge badge-pending">Pending Assignment</span>
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                    {issue.title}
                  </h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {issue.category} &bull; {issue.location}
                  </p>
                </div>

                <div className="flex gap-2 mt-2" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                  <button
                    onClick={() => handleTriggerAutoAssign(issue._id)}
                    disabled={autoAssigning[issue._id]}
                    className="btn btn-primary flex items-center gap-1"
                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.6rem', justifyContent: 'center' }}
                  >
                    <Sparkles size={14} />
                    {autoAssigning[issue._id] ? 'Assigning...' : 'Auto-Assign'}
                  </button>
                  <Link
                    to={`/issues/${issue._id}`}
                    className="btn btn-secondary flex items-center gap-1"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  >
                    <ExternalLink size={14} /> View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        Complaint Analytics & Distribution
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="surface-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
            Complaints by Lifecycle Status
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.issuesByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={5} dataKey="value">
                  {stats.issuesByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
            Complaints by Category (AI Classified)
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.issuesByCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} interval={0} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)' }} />
                <Tooltip cursor={{ fill: 'var(--color-background)' }} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
