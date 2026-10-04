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
        // Error is intentionally caught to not crash dashboard
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user.id]);

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Wrench size={28} color="var(--accent-primary)" />
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
          {user?.role === 'staff' ? 'Staff Portal' : 'Student Portal'}
        </h2>
      </div>

      <main>
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>My Active Issues</h3>
                  <AlertCircle size={20} color="var(--accent-primary)" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.myActive}</p>
              </div>
              
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>My Resolved Issues</h3>
                  <CheckCircle size={20} color="var(--success)" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.myResolved}</p>
              </div>

              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Issues I Supported</h3>
                  <Users size={20} color="var(--warning)" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.supported}</p>
              </div>

              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Campus Active Issues</h3>
                  <BarChart2 size={20} color="var(--danger)" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.campusActive}</p>
              </div>
              
              <div className="status-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--info)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Campus Issues</h3>
                  <BarChart2 size={20} color="var(--info)" />
                </div>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.campusTotal}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <Link to="/report-issue" style={{ textDecoration: 'none' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center', background: 'var(--accent-primary)', color: 'var(--bg-surface)' }}>
                  <Wrench size={32} style={{ marginBottom: '1rem' }} />
                  <h3 style={{ margin: 0 }}>Report an Issue</h3>
                  <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.5rem' }}>Submit a new campus maintenance request.</p>
                </div>
              </Link>
              <Link to="/my-issues" style={{ textDecoration: 'none' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>My Issues</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>View and track issues you have reported.</p>
                </div>
              </Link>
              <Link to="/public-issues" style={{ textDecoration: 'none', gridColumn: '1 / -1' }}>
                <div className="status-card" style={{ padding: '2rem', cursor: 'pointer', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Public Campus Issues Feed</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>See what's being fixed around the campus.</p>
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
