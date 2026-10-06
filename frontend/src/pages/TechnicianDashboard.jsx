import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, Clock, CheckCircle, LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const TechnicianDashboard = () => {
  const { user } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/issues');
        // Since getIssues for technician returns assigned issues
        setIssues(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  const pending = issues.filter(i => i.status === 'Pending').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;

  return (
    <>
      <div className="page-title">
        <ShieldCheck size={28} color="var(--color-primary)" />
        <h2 style={{ margin: 0 }}>Technician Dashboard</h2>
      </div>
      <p className="page-subtitle">Welcome, {user?.name}. Here are your assigned tasks.</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Your Performance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            
            <div className="surface-card" style={{ borderTop: '4px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Pending Work</h3>
                <AlertCircle size={20} color="var(--color-warning)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{pending}</p>
            </div>
            
            <div className="surface-card" style={{ borderTop: '4px solid var(--color-info)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>In Progress</h3>
                <Clock size={20} color="var(--color-info)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{inProgress}</p>
            </div>

            <div className="surface-card" style={{ borderTop: '4px solid var(--color-success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Resolved</h3>
                <CheckCircle size={20} color="var(--color-success)" />
              </div>
              <p style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{resolved}</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-text-primary)' }}>My Assigned Issues</h3>
          </div>
          
          {issues.length === 0 ? (
            <div className="surface-card text-center" style={{ padding: '3rem' }}>
              <LayoutList size={48} color="var(--color-border)" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>No Assigned Tasks</h3>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>You have no issues assigned to you at this time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {issues.map(issue => (
                <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="surface-card interactive flex items-center justify-between" style={{ padding: '1.25rem' }}>
                    <div className="flex flex-col gap-2">
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{issue.title}</h4>
                      <div className="flex gap-3 text-muted" style={{ fontSize: '0.85rem' }}>
                        <span>{issue.category}</span>
                        <span>•</span>
                        <span>{issue.location}</span>
                        <span>•</span>
                        <span>Assigned: {new Date(issue.assignedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`badge badge-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
                      <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority} Priority</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default TechnicianDashboard;
