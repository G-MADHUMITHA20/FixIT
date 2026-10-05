import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Search, Filter, Globe, Users, CheckCircle, ChevronLeft, ChevronRight, Tag, MapPin, Flag } from 'lucide-react';

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
    const timer = setTimeout(() => {
      fetchIssues();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchIssues]);

  const handleSupport = async (e, issueId) => {
    e.preventDefault(); 
    try {
      await api.post(`/issues/${issueId}/support`);
      fetchIssues(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Error supporting issue');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="page-title">
            <Globe size={28} color="var(--color-primary)" />
            <h2 style={{ margin: 0 }}>Campus Issues</h2>
          </div>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>Directory of all reported maintenance issues across the campus.</p>
        </div>
        {user?.role === 'student' && (
          <Link to="/report-issue" className="btn btn-primary">Report Issue</Link>
        )}
      </div>
      
      {/* Filters */}
      <div className="surface-card mb-4" style={{ padding: '1rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', top: '10px', left: '12px', color: 'var(--color-input-placeholder)' }} />
          <input 
            type="text" 
            placeholder="Search issues..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: '2 1 400px' }}>
          <select className="form-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '130px' }}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '130px' }}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: '130px' }}>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '130px' }}>
            <Filter size={16} color="var(--color-text-secondary)" />
            <select className="form-select" value={sortParam} onChange={(e) => { setSortParam(e.target.value); setPage(1); }} style={{ width: '100%' }}>
              {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <p>Loading issues...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {issues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }} className="surface-card">
                <Search size={32} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No issues found</h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>Try adjusting your filters or search term.</p>
              </div>
            ) : 
              issues.map(issue => {
                const hasSupported = issue.supportedBy && issue.supportedBy.includes(user?._id || user?.id);
                const isResolved = issue.status === 'Resolved';
                
                return (
                  <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="surface-card interactive" style={{ padding: '1.25rem 1.5rem', borderLeft: `4px solid ${isResolved ? 'var(--color-success)' : issue.status === 'In Progress' ? 'var(--color-info)' : 'var(--color-warning)'}` }}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>{issue.title}</h3>
                          {user?.role === 'admin' && (
                            <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: issue.reporterType === 'staff' ? 'var(--color-info)' : 'var(--color-primary)', color: '#fff' }}>
                              {issue.reporterType === 'staff' ? 'Staff' : 'Student'}
                            </span>
                          )}
                        </div>
                        <span className={`badge badge-${issue.status.toLowerCase().replace(' ', '-')}`}>{issue.status}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', margin: '0.75rem 0', flexWrap: 'wrap' }}>
                        <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.85rem' }}><Tag size={14}/> {issue.category}</span>
                        <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.85rem' }}><MapPin size={14}/> {issue.location}</span>
                        <span className="flex items-center gap-1 text-muted" style={{ fontSize: '0.85rem' }}>
                          <Flag size={14}/> Priority: <strong style={{ color: issue.priority === 'Critical' ? 'var(--color-danger)' : issue.priority === 'High' ? 'var(--color-warning)' : 'inherit' }}>{issue.priority}</strong>
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '1rem' }}>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            <Users size={16} color="var(--color-text-secondary)" /> {issue.affectedUsers} affected
                          </span>
                          
                          {/* Support Mechanism */}
                          {user?.role === 'student' && !isResolved && (
                            hasSupported ? (
                              <span className="flex items-center gap-1 text-success" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                <CheckCircle size={16} /> Supported
                              </span>
                            ) : (
                              <button 
                                onClick={(e) => handleSupport(e, issue._id)} 
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', height: 'auto' }}
                              >
                                Support Issue
                              </button>
                            )
                          )}
                        </div>
                        
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Reported {new Date(issue.reportedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            }
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '0.5rem' }}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.5rem' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};
export default PublicIssues;
