import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, Filter, Wrench } from 'lucide-react';

const categories = [
  'All Categories', 'Electrical', 'Plumbing / Water Leakage', 'Furniture', 'Classroom', 
  'Laboratory', 'Washroom', 'Network / Internet', 'Cleaning', 'Other'
];
const statuses = ['All Statuses', 'Pending', 'In Progress', 'Resolved'];
const priorities = ['All Priorities', 'Low', 'Medium', 'High', 'Critical'];

const PublicIssues = () => {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/issues');
        setIssues(res.data.data);
        setFilteredIssues(res.data.data);
      } catch (err) {
        setError('Failed to fetch public issues');
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  useEffect(() => {
    let result = issues;

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(lowerSearch) || 
        i.location.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (categoryFilter !== 'All Categories') {
      result = result.filter(i => i.category === categoryFilter);
    }
    
    if (statusFilter !== 'All Statuses') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    if (priorityFilter !== 'All Priorities') {
      result = result.filter(i => i.priority === priorityFilter);
    }

    setFilteredIssues(result);
  }, [search, categoryFilter, statusFilter, priorityFilter, issues]);

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Wrench size={28} color="#2c3e50" /> Public Campus Issues
        </h2>
        <Link to="/report-issue" className="btn-primary" style={{ textDecoration: 'none', padding: '0.5rem 1rem', background: '#3498db', color: 'white', borderRadius: '4px' }}>Report Issue</Link>
      </div>
      
      <div className="status-card" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'left', background: '#f8f9fa' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '10px', left: '10px', color: '#7f8c8d' }} />
            <input 
              type="text" 
              placeholder="Search by title or location..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '2 1 400px' }}>
            <select className="form-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-input" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}>
              {priorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <p>Loading issues...</p> : error ? <p className="error-message" style={{ color: '#e74c3c' }}>{error}</p> : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredIssues.length === 0 ? <div className="status-card"><p>No issues match your filters.</p></div> : 
            filteredIssues.map(issue => (
              <Link to={`/issues/${issue._id}`} key={issue._id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="status-card" style={{ textAlign: 'left', cursor: 'pointer', padding: '1.5rem', borderLeft: `4px solid ${issue.status === 'Resolved' ? '#27ae60' : issue.status === 'In Progress' ? '#f1c40f' : '#e67e22'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50', fontSize: '1.2rem' }}>{issue.title}</h3>
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '0.85rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      background: issue.status === 'Pending' ? '#fdf2e9' : issue.status === 'Resolved' ? '#e9f7ef' : '#fef9e7',
                      color: issue.status === 'Pending' ? '#e67e22' : issue.status === 'Resolved' ? '#27ae60' : '#f39c12'
                    }}>{issue.status}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#34495e' }}><strong>Category:</strong> {issue.category}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#34495e' }}><strong>Location:</strong> {issue.location}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#34495e' }}>
                      <strong>Priority:</strong> <span style={{ color: issue.priority === 'Critical' ? '#c0392b' : issue.priority === 'High' ? '#e74c3c' : 'inherit' }}>{issue.priority} Priority</span>
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.8rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#7f8c8d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={14} /> {issue.affectedUsers} students affected
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Reported Date: {new Date(issue.reportedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))
          }
        </div>
      )}
    </div>
  );
};
export default PublicIssues;
