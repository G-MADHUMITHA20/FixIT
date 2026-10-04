import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Shield, AlertTriangle, CheckCircle, Clock, LayoutDashboard, MapPin, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
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

  if (loading) return <div className="dashboard"><p>Loading dashboard...</p></div>;
  if (!stats) return <div className="dashboard"><p>Error loading stats.</p></div>;

  const COLORS = ['var(--accent-primary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--info)'];
  const PRIORITY_COLORS = { 'Critical': 'var(--danger)', 'High': 'var(--warning)', 'Medium': 'var(--info)', 'Low': 'var(--text-muted)' };
  const STATUS_COLORS = { 'Pending': 'var(--warning)', 'In Progress': 'var(--info)', 'Resolved': 'var(--success)' };

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Shield size={28} color="var(--accent-primary)" />
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Admin Dashboard</h2>
      </div>

      <main>
        {/* Active SLA Breaches */}
        {stats.activeBreaches.length > 0 && (
          <div className="status-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
              <AlertTriangle size={24} /> ⚠️ SLA Breached Issues ({stats.activeBreaches.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {stats.activeBreaches.map(issue => (
                <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '1rem', background: '#fff', borderRadius: '4px', border: '1px solid var(--danger)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger)' }}>{issue.title}</h4>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: issue.reporterType === 'staff' ? 'var(--info)' : 'var(--accent-primary)', color: 'var(--bg-surface)' }}>
                        {issue.reporterType === 'staff' ? 'Staff' : 'Student'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{issue.category} &mdash; {issue.location}</p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      <span style={{ color: PRIORITY_COLORS[issue.priority] }}>{issue.priority} Priority</span> | SLA breached by {issue.breachHours} hours
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent-primary)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Issues</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Pending</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.pending}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>In Progress</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.inProgress}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--success)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Resolved</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.resolved}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--info)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Resolution Rate</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.resolutionPercentage}%</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--accent-primary)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Student Reports</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.reportsByUserType?.student || 0}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Staff Reports</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.reportsByUserType?.staff || 0}</p>
          </div>
        </div>

        {/* Analytics Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          
          <div className="status-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Issues by Status</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.issuesByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {stats.issuesByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="status-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Resolution Statistics</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name: 'Resolved', value: stats.resolved}, {name: 'Unresolved', value: stats.total - stats.resolved}]} cx="50%" cy="50%" outerRadius={100} dataKey="value">
                    <Cell fill="var(--success)" />
                    <Cell fill="var(--danger)" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="status-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Issues by Category</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.issuesByCategory}>
                  <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--accent-primary)">
                    {stats.issuesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="status-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Issues by Priority</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.issuesByPriority}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {stats.issuesByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || 'var(--border-color)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Lists */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--danger)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}><AlertTriangle size={20} /> Critical Unresolved Issues</h3>
            {stats.criticalUnresolved.length === 0 ? <p>No critical unresolved issues.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {stats.criticalUnresolved.map(issue => (
                  <li key={issue._id} style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0' }}>
                    <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{issue.title}</span>
                        <span style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: issue.reporterType === 'staff' ? 'var(--info)' : 'var(--accent-primary)', color: 'var(--bg-surface)' }}>
                          {issue.reporterType === 'staff' ? '🧑‍🏫 Staff' : '🎓 Student'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{issue.location}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}><Clock size={20} /> Oldest Unresolved Issues</h3>
            {stats.oldestUnresolved.length === 0 ? <p>No unresolved issues.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {stats.oldestUnresolved.map(issue => (
                  <li key={issue._id} style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0' }}>
                    <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{issue.title}</span>
                        <span style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: issue.reporterType === 'staff' ? 'var(--info)' : 'var(--accent-primary)', color: 'var(--bg-surface)' }}>
                          {issue.reporterType === 'staff' ? '🧑‍🏫 Staff' : '🎓 Student'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/public-issues" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 1.5rem', background: 'var(--text-primary)', color: 'var(--bg-surface)', borderRadius: '4px' }}>
            Open Issue Manager
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
