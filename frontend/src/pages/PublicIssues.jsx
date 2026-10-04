import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Search, Filter, Wrench, Users, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const categories = [
  'All Categories', 'Electrical', 'Plumbing / Water Leakage', 'Furniture', 'Classroom', 
  'Laboratory', 'Washroom', 'Network / Internet', 'Cleaning', 'Other'
];
const statuses = ['All Statuses', 'Pending', 'In Progress', 'Resolved'];
const priorities = ['All Priorities', 'Low', 'Medium', 'High', 'Critical'];
const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Highest Priority', value: 'highestPriority' },
  { label: 'Most Affected', value: 'mostAffected' }
];

const PublicIssues = () => {
  const { user } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination and metadata
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');
  const [sortParam, setSortParam] = useState('newest');

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'All Categories') params.append('category', categoryFilter);
      if (statusFilter !== 'All Statuses') params.append('status', statusFilter);
      if (priorityFilter !== 'All Priorities') params.append('priority', priorityFilter);
      if (sortParam) params.append('sort', sortParam);
      
      params.append('page', page);
      params.append('limit', limit);

      const res = await api.get(`/issues?${params.toString()}`);
      setIssues(res.data.data);
      setTotalPages(res.data.pages);
      setPage(res.data.page);
    } catch (err) {
      setError('Failed to fetch public issues');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, priorityFilter, sortParam, page]);

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchIssues();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchIssues]);

  const handleSupport = async (e, issueId) => {
    e.preventDefault(); // Prevent navigating to issue details
    try {
      await api.post(`/issues/${issueId}/support`);
      fetchIssues(); // Refresh list to update count and supported state
    } catch (err) {
      alert(err.response?.data?.message || 'Error supporting issue');
    }
  };

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Wrench size={28} color="var(--text-primary)" /> Public Campus Issues
        </h2>
        {user?.role === 'student' && (
          <Link to="/report-issue" className="btn-primary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'var(--bg-surface)', borderRadius: '4px' }}>Report Issue</Link>
        )}
      </div>
      
      <div className="status-card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'left', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search title, description, or location..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-input"
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '2 1 400px' }}>
            <select className="form-input" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', flex: 1 }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', flex: 1 }}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-input" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', flex: 1 }}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="form-input" value={sortParam} onChange={(e) => { setSortParam(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', flex: 1 }}>
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <p>Loading issues...</p> : error ? <p className="error-message" style={{ color: 'var(--danger)' }}>{error}</p> : (
        <>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {issues.length === 0 ? <div className="status-card"><p>No issues match your criteria.</p></div> : 
              issues.map(issue => {
                const hasSupported = issue.supportedBy && issue.supportedBy.includes(user?._id || user?.id);
                const isResolved = issue.status === 'Resolved';
                
                return (
                  <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="status-card" style={{ textAlign: 'left', cursor: 'pointer', padding: '1.5rem', borderLeft: `4px solid ${isResolved ? 'var(--success)' : issue.status === 'In Progress' ? 'var(--warning)' : 'var(--warning)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{issue.title}</h3>
                        <span style={{ 
                          fontWeight: 'bold', 
                          fontSize: '0.85rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: issue.status === 'Pending' ? 'var(--bg-secondary)' : isResolved ? 'var(--bg-secondary)' : 'var(--bg-secondary)',
                          color: issue.status === 'Pending' ? 'var(--warning)' : isResolved ? 'var(--success)' : 'var(--warning)'
                        }}>{issue.status}</span>
                      </div>
                      {user?.role === 'admin' && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: issue.reporterType === 'staff' ? 'var(--info)' : 'var(--accent-primary)',
                            color: 'var(--bg-surface)'
                          }}>
                            {issue.reporterType === 'staff' ? '🧑‍🏫 Reported by Staff' : '🎓 Reported by Student'}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', margin: '0.5rem 0' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}><strong>Category:</strong> {issue.category}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}><strong>Location:</strong> {issue.location}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          <strong>Priority:</strong> <span style={{ color: issue.priority === 'Critical' ? 'var(--danger)' : issue.priority === 'High' ? 'var(--danger)' : 'inherit' }}>{issue.priority} Priority</span>
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Users size={16} /> {issue.affectedUsers} students affected
                          </span>
                          
                          {/* Support Mechanism */}
                          {user?.role === 'student' && !isResolved && (
                            hasSupported ? (
                              <span style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 'bold' }}>
                                <CheckCircle size={14} /> You supported this issue
                              </span>
                            ) : (
                              <button 
                                onClick={(e) => handleSupport(e, issue._id)} 
                                style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                Support this issue
                              </button>
                            )
                          )}
                        </div>
                        
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reported: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            }
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                style={{ padding: '0.5rem', cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none' }}
              >
                <ChevronLeft size={24} color={page === 1 ? 'var(--border-color)' : 'var(--text-primary)'} />
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                style={{ padding: '0.5rem', cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none' }}
              >
                <ChevronRight size={24} color={page === totalPages ? 'var(--border-color)' : 'var(--text-primary)'} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default PublicIssues;
