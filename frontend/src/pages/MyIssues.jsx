import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const MyIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/issues?my=true');
        setIssues(res.data.data);
      } catch (err) {
        setError('Failed to fetch your issues');
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>My Reported Issues</h2>
        <Link to="/report-issue" className="btn-primary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem', background: '#3498db', color: 'white', borderRadius: '4px', fontWeight: 'bold' }}>Report New Issue</Link>
      </div>
      
      {loading ? <p>Loading issues...</p> : error ? <p className="error-message" style={{ color: '#e74c3c' }}>{error}</p> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {issues.length === 0 ? <div className="status-card"><p>You haven't reported any issues yet.</p></div> : 
            issues.map(issue => (
              <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="status-card" style={{ textAlign: 'left', cursor: 'pointer', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{issue.title}</h3>
                    <span style={{ fontWeight: 'bold', color: issue.status === 'Pending' ? '#e67e22' : issue.status === 'Resolved' ? '#27ae60' : '#3498db' }}>{issue.status}</span>
                  </div>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Category:</strong> {issue.category} | <strong>Location:</strong> {issue.location}</p>
                  <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Priority:</strong> {issue.priority}</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#7f8c8d' }}>Reported on: {new Date(issue.reportedAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))
          }
        </div>
      )}
    </div>
  );
};
export default MyIssues;
