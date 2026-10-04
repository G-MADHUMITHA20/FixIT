import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Wrench, BarChart2, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState({
    myActive: 0,
    myResolved: 0,
    supported: 0,
    campusActive: 0,
    campusTotal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [publicRes, myRes] = await Promise.all([
          api.get('/issues'),
          api.get('/issues?my=true')
        ]);
        
        const publicIssues = publicRes.data.data;
        const myIssues = myRes.data.data;

        setStats({
          myActive: myIssues.filter(i => i.status !== 'Resolved').length,
          myResolved: myIssues.filter(i => i.status === 'Resolved').length,
          supported: publicIssues.filter(i => i.supportedBy.includes(user.id)).length,
          campusActive: publicIssues.filter(i => i.status !== 'Resolved').length,
          campusTotal: publicIssues.length
        });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user.id]);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>
          <Wrench size={28} color="#2c3e50" />
          FixIt – Student Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user?.name}</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid #3498db' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>My Active Issues</h3>
                  <AlertCircle size={20} color="#3498db" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{stats.myActive}</p>
              </div>
              
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid #27ae60' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>My Resolved Issues</h3>
                  <CheckCircle size={20} color="#27ae60" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{stats.myResolved}</p>
              </div>

              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid #f39c12' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Issues I Supported</h3>
                  <Users size={20} color="#f39c12" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{stats.supported}</p>
              </div>

              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid #e74c3c' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Campus Active Issues</h3>
                  <BarChart2 size={20} color="#e74c3c" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{stats.campusActive}</p>
              </div>
              
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid #9b59b6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#7f8c8d' }}>Total Campus Issues</h3>
                  <BarChart2 size={20} color="#9b59b6" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>{stats.campusTotal}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Link to="/report-issue" style={{ textDecoration: 'none' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center', background: '#3498db', color: 'white' }}>
                  <Wrench size={32} style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: 0 }}>Report an Issue</h3>
                  <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>Submit a new campus maintenance request.</p>
                </div>
              </Link>
              <Link to="/my-issues" style={{ textDecoration: 'none' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>My Issues</h3>
                  <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '0.5rem' }}>View and track issues you have reported.</p>
                </div>
              </Link>
              <Link to="/public-issues" style={{ textDecoration: 'none', gridColumn: '1 / -1' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>Public Campus Issues Feed</h3>
                  <p style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '0.5rem' }}>See what's being fixed around the campus.</p>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
