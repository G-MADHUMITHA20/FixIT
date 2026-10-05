import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, BarChart2, AlertCircle, CheckCircle, Users, PenTool, LayoutList, Globe } from 'lucide-react';
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
    <>
      <div className="page-title">
        <ShieldCheck size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>{user?.role === 'staff' ? 'Staff Portal' : 'Student Portal'}</h2>
      </div>
      <p className="page-subtitle">Welcome back, {user?.name}. Here is an overview of campus maintenance.</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
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

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Campus Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <div className="surface-card" style={{ borderTop: '4px solid var(--color-danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Campus Active Issues</h3>
                <BarChart2 size={20} color="var(--color-danger)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats.campusActive}</p>
            </div>
            
            <div className="surface-card" style={{ borderTop: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Campus Issues</h3>
                <BarChart2 size={20} color="var(--color-primary)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{stats.campusTotal}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <Link to="/report-issue" style={{ textDecoration: 'none' }}>
              <div className="surface-card interactive" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', height: '100%', background: 'var(--color-primary)', color: '#fff', border: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <PenTool size={24} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', color: '#fff', fontSize: '1.1rem' }}>Report an Issue</h3>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.4 }}>Submit a new campus maintenance request for a broken facility or service.</p>
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
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>View and track the status of maintenance issues you have reported.</p>
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
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.4 }}>See what's being fixed around the campus and support existing issues.</p>
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
