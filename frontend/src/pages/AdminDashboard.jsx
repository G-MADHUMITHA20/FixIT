import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, AlertTriangle, CheckCircle, Clock, LayoutDashboard, MapPin, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/issues/stats');
        setStats(res.data.data);
      } catch (err) {
        // Suppress initial errors on stats fetch
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}><p>Loading dashboard...</p></div>;
  if (!stats) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-danger)' }}><p>Error loading statistics.</p></div>;

  const COLORS = ['var(--color-primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-danger)', 'var(--color-info)'];
  const PRIORITY_COLORS = { 'Critical': 'var(--color-danger)', 'High': 'var(--color-warning)', 'Medium': 'var(--color-info)', 'Low': 'var(--color-text-muted)' };
  const STATUS_COLORS = { 'Pending': 'var(--color-warning)', 'In Progress': 'var(--color-info)', 'Resolved': 'var(--color-success)' };

  return (
    <>
      <div className="page-title">
        <Shield size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>Maintenance Administration</h2>
      </div>
      <p className="page-subtitle">Campus overview and maintenance operations metrics.</p>

      {/* Active SLA Breaches */}
      {stats.activeBreaches.length > 0 && (
        <div className="surface-card mb-4" style={{ borderLeft: '4px solid var(--color-danger)', backgroundColor: 'color-mix(in srgb, var(--color-danger) 5%, var(--color-surface))' }}>
          <h3 className="flex items-center gap-1 text-danger" style={{ margin: '0 0 1rem 0' }}>
            <AlertTriangle size={24} /> ⚠️ SLA Breached Issues ({stats.activeBreaches.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {stats.activeBreaches.map(issue => (
              <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
                  <div className="flex justify-between" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-danger)', fontSize: '1rem' }}>{issue.title}</h4>
                    <span className="badge" style={{ backgroundColor: issue.reporterType === 'staff' ? 'var(--color-info)' : 'var(--color-primary)', color: '#fff' }}>
                      {issue.reporterType === 'staff' ? 'Staff' : 'Student'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{issue.category} &mdash; {issue.location}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <span style={{ color: PRIORITY_COLORS[issue.priority] }}>{issue.priority} Priority</span> | SLA breached by {issue.breachHours} hours
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top KPIs */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Key Performance Indicators</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-text-muted)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Issues</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stats.total}</p>
        </div>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stats.pending}</p>
        </div>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-info)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Progress</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stats.inProgress}</p>
        </div>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-success)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stats.resolved}</p>
        </div>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution Rate</h3>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{stats.resolutionPercentage}%</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Issue Analytics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="surface-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Issues by Status</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.issuesByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
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
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Resolution Statistics</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name: 'Resolved', value: stats.resolved}, {name: 'Unresolved', value: stats.total - stats.resolved}]} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                  <Cell fill="var(--color-success)" />
                  <Cell fill="var(--color-danger)" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Issues by Category</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.issuesByCategory}>
                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--color-text-secondary)'}} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{fill: 'var(--color-text-secondary)'}} />
                <Tooltip cursor={{fill: 'var(--color-background)'}} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.issuesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: 'var(--color-text-primary)' }}>Issues by Priority</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.issuesByPriority}>
                <XAxis dataKey="name" tick={{fill: 'var(--color-text-secondary)'}} />
                <YAxis tick={{fill: 'var(--color-text-secondary)'}} />
                <Tooltip cursor={{fill: 'var(--color-background)'}} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.issuesByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || 'var(--color-border)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Lists */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Priority Reports</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="surface-card" style={{ borderTop: '4px solid var(--color-danger)' }}>
          <h3 className="flex items-center gap-1 text-danger" style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>
            <AlertTriangle size={18} /> Critical Unresolved Issues
          </h3>
          {stats.criticalUnresolved.length === 0 ? <p className="text-muted">No critical unresolved issues.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {stats.criticalUnresolved.map(issue => (
                <li key={issue._id} style={{ borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
                  <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: 'var(--color-text-primary)' }} className="flex justify-between items-center">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{issue.title}</span>
                      <span className="badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', backgroundColor: issue.reporterType === 'staff' ? 'var(--color-info)' : 'var(--color-primary)', color: '#fff' }}>
                        {issue.reporterType === 'staff' ? '🧑‍🏫 Staff' : '🎓 Student'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{issue.location}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
          <h3 className="flex items-center gap-1 text-warning" style={{ margin: '0 0 1.5rem 0', fontSize: '1rem' }}>
            <Clock size={18} /> Oldest Unresolved Issues
          </h3>
          {stats.oldestUnresolved.length === 0 ? <p className="text-muted">No unresolved issues.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {stats.oldestUnresolved.map(issue => (
                <li key={issue._id} style={{ borderBottom: '1px solid var(--color-border)', padding: '0.75rem 0' }}>
                  <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: 'var(--color-text-primary)' }} className="flex justify-between items-center">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{issue.title}</span>
                      <span className="badge" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', backgroundColor: issue.reporterType === 'staff' ? 'var(--color-info)' : 'var(--color-primary)', color: '#fff' }}>
                        {issue.reporterType === 'staff' ? '🧑‍🏫 Staff' : '🎓 Student'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="text-center mt-4">
        <Link to="/public-issues" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
          Open Issue Manager
        </Link>
      </div>
    </>
  );
};

export default AdminDashboard;
