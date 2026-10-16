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
  Check,
  X,
  AlertCircle,
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
  const [batchAssigning, setBatchAssigning] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [selectedTechs, setSelectedTechs] = useState({});
  const [manualAssigning, setManualAssigning] = useState({});

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
    const unsubBatch = realtime.subscribe('batch_auto_assigned', () => fetchDashboardData());

    // Periodic poll every 15s as fallback
    const interval = setInterval(fetchDashboardData, 15000);

    return () => {
      unsubCreated();
      unsubAssigned();
      unsubStarted();
      unsubCompleted();
      unsubWorkerUpdated();
      unsubSafety();
      unsubBatch();
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  // Single Auto-Assign
  const handleTriggerAutoAssign = async (issueId) => {
    setAutoAssigning((prev) => ({ ...prev, [issueId]: true }));
    try {
      const res = await api.post(`/issues/${issueId}/auto-assign`);
      if (res.data.success) {
        alert(res.data.message || 'Worker automatically assigned!');
      } else {
        alert(`Auto-assignment notice: ${res.data.message}`);
      }
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Auto-assignment failed');
    } finally {
      setAutoAssigning((prev) => ({ ...prev, [issueId]: false }));
    }
  };

  // Batch Auto-Assign All Unassigned Complaints
  const handleBatchAutoAssign = async () => {
    setBatchAssigning(true);
    try {
      const res = await api.post('/admin/auto-assign');
      if (res.data.success) {
        setBatchResult(res.data.data);
      } else {
        alert(res.data.message || 'Batch auto-assignment failed');
      }
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Batch auto-assignment failed');
    } finally {
      setBatchAssigning(false);
    }
  };

  // Manual Assignment
  const handleManualAssign = async (issueId) => {
    const techId = selectedTechs[issueId];
    if (!techId) {
      alert('Please select a technician to assign');
      return;
    }

    setManualAssigning((prev) => ({ ...prev, [issueId]: true }));
    try {
      const res = await api.post(`/issues/${issueId}/assign`, {
        technicianId: techId,
      });
      if (res.data.success) {
        alert('Technician assigned successfully');
        setSelectedTechs((prev) => ({ ...prev, [issueId]: '' }));
      }
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Manual assignment failed');
    } finally {
      setManualAssigning((prev) => ({ ...prev, [issueId]: false }));
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
  const STATUS_COLORS = {
    'Pending Assignment': 'var(--color-warning)',
    Pending: 'var(--color-warning)',
    Assigned: 'var(--color-primary)',
    'In Progress': 'var(--color-info)',
    'Work Done': 'var(--color-success)',
    Resolved: 'var(--color-success)',
    Closed: 'var(--color-text-muted)',
  };

  const activeTechnicians = workers.filter((w) => w.isActive && w.availabilityStatus === 'Available');

  return (
    <>
      <div className="page-title flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="flex items-center gap-2">
            <Shield size={28} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>FixIt Facility Administration</h2>
          </div>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
            Workload-Balancing Auto-Assignment & Campus Telemetry Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          {unassignedIssues.length > 0 && (
            <button
              onClick={handleBatchAutoAssign}
              disabled={batchAssigning}
              className="btn btn-primary flex items-center gap-2"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none' }}
              title="Automatically assign all unassigned complaints to available technicians"
            >
              <Zap size={16} />
              {batchAssigning ? 'Auto-Assigning All...' : `Auto-Assign All (${unassignedIssues.length})`}
            </button>
          )}

          <Link
            to="/admin/technicians"
            className="btn btn-secondary flex items-center gap-2"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
          >
            <Users size={16} /> Manage Technicians
          </Link>
          <button
            onClick={fetchDashboardData}
            className="btn btn-secondary flex items-center gap-2"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Batch Auto-Assign Summary Modal */}
      {batchResult && (
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Zap size={22} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Auto-Assignment Summary</h3>
              </div>
              <button
                onClick={() => setBatchResult(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--color-background)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Processed</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700 }}>{batchResult.totalProcessed}</p>
              </div>
              <div style={{ background: 'color-mix(in srgb, var(--color-success) 12%, var(--color-surface))', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-success)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-success)', fontWeight: 600 }}>Assigned</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>{batchResult.assignedCount}</p>
              </div>
              <div style={{ background: 'color-mix(in srgb, var(--color-warning) 12%, var(--color-surface))', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--color-warning)' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-warning)', fontWeight: 600 }}>Unassigned</span>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>{batchResult.unassignedCount}</p>
              </div>
            </div>

            {/* Successfully Assigned List */}
            {batchResult.assignments.length > 0 && (
              <div className="mb-4">
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={16} /> Successfully Assigned Complaints ({batchResult.assignments.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {batchResult.assignments.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.6rem 0.8rem',
                        background: 'var(--color-background)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>#{item.ticketId}</strong> &bull; {item.title} ({item.category})
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                        &rarr; {item.workerName} ({item.workerSpecialization})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned List with Reasons */}
            {batchResult.unassigned.length > 0 && (
              <div className="mb-4">
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={16} /> Unassigned Complaints & Genuine Reasons ({batchResult.unassigned.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {batchResult.unassigned.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.6rem 0.8rem',
                        background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))',
                        borderLeft: '3px solid var(--color-warning)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong>#{item.ticketId} &bull; {item.title}</strong>
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{item.category}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                        Reason: {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setBatchResult(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      )}

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
            Safety heuristics and AI classifications flagged these complaints for immediate resolution.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-text-muted)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Total Complaints
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {stats.totalIssues}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Pending Assignments
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>
            {unassignedIssues.length}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-info)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Active In Progress
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-info)' }}>
            {stats.activeIssues}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Resolved Complaints
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {stats.resolvedIssues}
          </p>
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
            Available Technicians
          </h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {activeTechnicians.length} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>/ {workers.length}</span>
          </p>
        </div>
      </div>

      {/* Unassigned Issues & Assignment Section */}
      {unassignedIssues.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="flex items-center gap-2">
              <Zap size={20} color="var(--color-warning)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-text-primary)' }}>
                Pending / Unassigned Complaints ({unassignedIssues.length})
              </h3>
            </div>
            <button
              onClick={handleBatchAutoAssign}
              disabled={batchAssigning}
              className="btn btn-primary flex items-center gap-1"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            >
              <Zap size={14} /> {batchAssigning ? 'Auto-Assigning...' : 'Auto-Assign All'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {unassignedIssues.map((issue) => (
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
                  {issue.assignmentFailureReason && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)', background: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface))', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                      <strong>Notice:</strong> {issue.assignmentFailureReason}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Quick Auto-Assign Button */}
                  <div className="flex gap-2">
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

                  {/* Manual Assignment Option */}
                  <div className="flex items-center gap-1">
                    <select
                      className="form-select"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', flex: 1 }}
                      value={selectedTechs[issue._id] || ''}
                      onChange={(e) => setSelectedTechs({ ...selectedTechs, [issue._id]: e.target.value })}
                    >
                      <option value="">Manual Assign Worker...</option>
                      {workers
                        .filter((w) => w.isActive && w.availabilityStatus === 'Available')
                        .map((w) => (
                          <option key={w._id} value={w._id}>
                            {w.name} ({w.specialization} - {w.activeAssignmentsCount}/{w.maxAssignments || 4})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleManualAssign(issue._id)}
                      disabled={!selectedTechs[issue._id] || manualAssigning[issue._id]}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                    >
                      {manualAssigning[issue._id] ? '...' : 'Assign'}
                    </button>
                  </div>
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
