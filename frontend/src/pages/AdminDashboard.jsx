import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Shield, AlertTriangle, CheckCircle, Clock, LayoutDashboard, MapPin, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/issues');
        setIssues(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const total = issues.length;
  const pending = issues.filter(i => i.status === 'Pending').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  const critical = issues.filter(i => i.priority === 'Critical').length;
  const highPriorityIssues = issues.filter(i => i.priority === 'High' || i.priority === 'Critical').slice(0, 5);
  const recentIssues = issues.slice(0, 5);

  const categoriesCount = issues.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});
  const mostReportedCategories = Object.entries(categoriesCount).sort((a,b) => b[1]-a[1]).slice(0, 3);

  const locationCount = issues.reduce((acc, curr) => {
    acc[curr.location] = (acc[curr.location] || 0) + 1;
    return acc;
  }, {});
  const mostAffectedLocations = Object.entries(locationCount).sort((a,b) => b[1]-a[1]).slice(0, 3);

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
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #3498db' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Total Issues</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{total}</p>
              </div>
              <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #e67e22' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Pending</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{pending}</p>
              </div>
              <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #f1c40f' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>In Progress</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{inProgress}</p>
              </div>
              <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #27ae60' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Resolved</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>{resolved}</p>
              </div>
              <div className="status-card" style={{ padding: '1.5rem', borderTop: '4px solid #e74c3c' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Critical Issues</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold', color: '#e74c3c' }}>{critical}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="status-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20} /> Recent Issues</h3>
                {recentIssues.length === 0 ? <p>No issues reported.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {recentIssues.map(issue => (
                      <li key={issue._id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
                        <Link to={`/issues/${issue._id}`} style={{ textDecoration: 'none', color: '#2c3e50', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 'bold' }}>{issue.title}</span>
                          <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', borderRadius: '12px', background: '#f8f9fa' }}>{issue.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/public-issues" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none', padding: '0.5rem 1rem', background: '#3498db', color: 'white', borderRadius: '4px' }}>View All Issues</Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="status-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={20} /> Top Categories</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {mostReportedCategories.map(([cat, count]) => (
                      <li key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <span>{cat}</span>
                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="status-card" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={20} /> Hotspots</h3>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {mostAffectedLocations.map(([loc, count]) => (
                      <li key={loc} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                        <span style={{ fontSize: '0.9rem' }}>{loc}</span>
                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="status-card" style={{ padding: '1.5rem', textAlign: 'left', borderLeft: '4px solid #e74c3c' }}>
              <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e74c3c' }}><AlertTriangle size={20} /> Needs Attention (High/Critical)</h3>
              {highPriorityIssues.length === 0 ? <p>No high priority issues at the moment.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {highPriorityIssues.map(issue => (
                    <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '4px', background: '#fff' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>{issue.title}</h4>
                        <p style={{ margin: '0', fontSize: '0.85rem' }}>{issue.location}</p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontWeight: 'bold', color: issue.priority === 'Critical' ? '#c0392b' : '#e67e22' }}>{issue.priority}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
