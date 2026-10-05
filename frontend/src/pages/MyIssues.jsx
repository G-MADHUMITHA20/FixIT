import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { LayoutList, Search, Plus, MapPin, Tag } from 'lucide-react';

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
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="page-title">
            <LayoutList size={28} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>My Reported Issues</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Track the status of the maintenance requests you have submitted.</p>
        </div>
        <Link to="/report-issue" className="btn btn-primary">
          <Plus size={18} /> Report New Issue
        </Link>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading issues...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="table-container">
          {issues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ background: 'var(--color-background)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Search size={32} color="var(--color-text-muted)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No Issues Found</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>You haven't reported any maintenance issues yet.</p>
              <Link to="/report-issue" className="btn btn-secondary">Report an Issue</Link>
            </div>
          ) : (
            <table className="app-table">
              <thead>
                <tr>
                  <th>Issue Details</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue._id} style={{ cursor: 'pointer' }} onClick={() => window.location.href=`/issues/${issue._id}`}>
                    <td style={{ maxWidth: '300px' }}>
                      <Link to={`/issues/${issue._id}`} style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{issue.title}</Link>
                    </td>
                    <td>
                      <span className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}><Tag size={14}/> {issue.category}</span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1" style={{ fontSize: '0.85rem' }}><MapPin size={14}/> {issue.location}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${issue.priority.toLowerCase()}`}>{issue.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(issue.reportedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
};
export default MyIssues;
