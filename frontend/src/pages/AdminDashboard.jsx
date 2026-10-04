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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a29bfe', '#ffeaa7', '#81ecec', '#fab1a0'];
  const PRIORITY_COLORS = { 'Critical': '#c0392b', 'High': '#e74c3c', 'Medium': '#f39c12', 'Low': '#3498db' };
  const STATUS_COLORS = { 'Pending': '#e67e22', 'In Progress': '#f1c40f', 'Resolved': '#27ae60' };

  return (
    <div className="dashboard">
      <header className="header">
        <h1>
          <Shield size={28} color="#2c3e50" />
          FixIt – Admin Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Admin: {user?.name}</span>
          <button onClick={logout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ecf0f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main>
        {/* Active SLA Breaches */}
        {stats.activeBreaches.length > 0 && (
          <div className="status-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #c0392b', background: '#fadbd8' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c0392b' }}>
              <AlertTriangle size={24} /> ⚠️ SLA Breached Issues ({stats.activeBreaches.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {stats.activeBreaches.map(issue => (
                <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '1rem', background: '#fff', borderRadius: '4px', border: '1px solid #e74c3c' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#c0392b' }}>{issue.title}</h4>
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
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #3498db' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Total Issues</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #e67e22' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Pending</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.pending}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #f1c40f' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>In Progress</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.inProgress}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #27ae60' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Resolved</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.resolved}</p>
          </div>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #9b59b6' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Resolution Rate</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{stats.resolutionPercentage}%</p>
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
                    <Cell fill="#27ae60" />
                    <Cell fill="#e74c3c" />
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
                  <Bar dataKey="value" fill="#3498db">
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
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#ccc'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Lists */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #e74c3c' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e74c3c' }}><AlertTriangle size={20} /> Critical Unresolved Issues</h3>
            {stats.criticalUnresolved.length === 0 ? <p>No critical unresolved issues.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {stats.criticalUnresolved.map(issue => (
                  <li key={issue._id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
                    <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: '#2c3e50', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}>{issue.title}</span>
                      <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>{issue.location}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #f39c12' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f39c12' }}><Clock size={20} /> Oldest Unresolved Issues</h3>
            {stats.oldestUnresolved.length === 0 ? <p>No unresolved issues.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {stats.oldestUnresolved.map(issue => (
                  <li key={issue._id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
                    <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: '#2c3e50', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}>{issue.title}</span>
                      <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/public-issues" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.75rem 1.5rem', background: '#2c3e50', color: 'white', borderRadius: '4px' }}>
            Open Issue Manager
          </Link>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
