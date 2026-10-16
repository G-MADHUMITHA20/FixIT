import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import realtime from '../services/realtime';
import {
  Shield,
  Plus,
  UserCheck,
  Briefcase,
  Phone,
  Mail,
  ToggleLeft,
  ToggleRight,
  Layers,
  Activity,
} from 'lucide-react';

const SPECIALIZATIONS = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'IT Technician',
  'Laboratory Technician',
  'Housekeeping / Cleaner',
  'Civil Maintenance Worker',
  'HVAC / AC Technician',
  'General Maintenance',
  'All',
];

const ManageTechnicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    workerId: '',
    name: '',
    email: '',
    password: '',
    specialization: 'Electrician',
    maxAssignments: 4,
    phone: '',
    availabilityStatus: 'Available',
    isDemo: false,
  });
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filterSpec, setFilterSpec] = useState('All');
  const [filterDemoOnly, setFilterDemoOnly] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get('/admin/technicians');
      setTechnicians(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTechnicians();

    const unsubWorkerUpdated = realtime.subscribe('worker_updated', () => fetchTechnicians());
    const unsubWorkerCreated = realtime.subscribe('worker_created', () => fetchTechnicians());
    const unsubAssigned = realtime.subscribe('issue_assigned', () => fetchTechnicians());
    const unsubCompleted = realtime.subscribe('work_completed', () => fetchTechnicians());

    return () => {
      unsubWorkerUpdated();
      unsubWorkerCreated();
      unsubAssigned();
      unsubCompleted();
    };
  }, [fetchTechnicians]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/admin/workers', formData);
      setSuccess(`Worker ${formData.name} added successfully.`);
      setFormData({
        workerId: '',
        name: '',
        email: '',
        password: '',
        specialization: 'Electrician',
        maxAssignments: 4,
        phone: '',
        availabilityStatus: 'Available',
        isDemo: false,
      });
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create worker');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!window.confirm('Initialize or sync the 32 demo workers (4 for each of the 8 specializations) in MongoDB Atlas?')) return;
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/admin/workers/seed-demo');
      setSuccess(res.data.message || 'Successfully initialized 32 demo workers.');
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to seed demo workers');
    } finally {
      setSeeding(false);
    }
  };

  const handleUpdateAvailability = async (workerId, newStatus) => {
    try {
      await api.put(`/admin/workers/${workerId}`, {
        availabilityStatus: newStatus,
      });
      fetchTechnicians();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update availability');
    }
  };

  const handleToggleActive = async (workerId, currentActive) => {
    try {
      await api.put(`/admin/workers/${workerId}`, {
        isActive: !currentActive,
      });
      fetchTechnicians();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredTechnicians = technicians.filter((tech) => {
    if (filterSpec !== 'All' && tech.specialization !== filterSpec) return false;
    if (filterDemoOnly && !tech.isDemo) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      <div className="page-title flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Shield size={28} color="var(--color-primary)" />
          <h2 style={{ margin: 0 }}>Campus Maintenance Worker Management</h2>
        </div>
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="btn btn-primary flex items-center gap-2"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <Briefcase size={16} />
          {seeding ? 'Syncing Workers...' : 'Sync 32 Demo Workers (4 Per Role)'}
        </button>
      </div>
      <p className="page-subtitle">
        Manage maintenance workers across all 8 specializations. Workers automatically receive task assignments via Gemma 4 intelligent triage.
      </p>

      {/* Create New Worker Form */}
      <div className="surface-card mb-4" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
          Register New Maintenance Worker
        </h3>

        {error && <div className="alert alert-danger mb-3">{error}</div>}
        {success && <div className="alert alert-success mb-3">{success}</div>}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Worker ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., WK-ELEC-05"
                value={formData.workerId}
                onChange={(e) => setFormData({ ...formData, workerId: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Arun Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g., arun.kumar@fixit-demo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Specialization</label>
              <select
                className="form-select"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              >
                {SPECIALIZATIONS.filter(s => s !== 'All').map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Max Active Assignments</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={formData.maxAssignments}
                onChange={(e) => setFormData({ ...formData, maxAssignments: parseInt(e.target.value, 10) || 4 })}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone Contact</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g., +91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={loading} style={{ padding: '0.6rem 1.5rem' }}>
              <Plus size={16} /> {loading ? 'Registering Worker...' : 'Register Worker'}
            </button>
          </div>
        </form>
      </div>

      {/* Workers List Header & Filters */}
      <div className="surface-card">
        <div className="flex justify-between items-center mb-3" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-primary)' }}>
              Maintenance Staff ({filteredTechnicians.length} of {technicians.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Showing {filteredTechnicians.filter(w => w.isDemo).length} demo workers and {filteredTechnicians.filter(w => !w.isDemo).length} staff workers
            </span>
          </div>

          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ fontSize: '0.8rem', padding: '0.35rem 1.8rem 0.35rem 0.6rem' }}
              value={filterSpec}
              onChange={(e) => setFilterSpec(e.target.value)}
            >
              <option value="All">All Specializations</option>
              {SPECIALIZATIONS.filter(s => s !== 'All').map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>

            <button
              onClick={() => setFilterDemoOnly(!filterDemoOnly)}
              className={`btn ${filterDemoOnly ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {filterDemoOnly ? 'Demo Workers Only' : 'All Workers'}
            </button>
          </div>
        </div>

        {filteredTechnicians.length === 0 ? (
          <p className="text-muted" style={{ padding: '2rem 0', textAlign: 'center' }}>
            No maintenance workers matching the filter criteria.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredTechnicians.map((tech) => {
              const active = tech.activeAssignmentsCount || 0;
              const max = tech.maxAssignments || 4;
              const isOverloaded = active >= max;

              return (
                <div
                  key={tech._id}
                  style={{
                    padding: '1.25rem',
                    background: 'var(--color-background)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <UserCheck size={20} color="var(--color-primary)" />
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{tech.name}</h4>
                          {tech.workerId && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                              ID: {tech.workerId}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                          {tech.specialization || 'General'}
                        </span>
                        {tech.isDemo && (
                          <span style={{ fontSize: '0.65rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '1px 5px', color: 'var(--color-text-muted)' }}>
                            DEMO WORKER
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 mb-3" style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      <span className="flex items-center gap-1">
                        <Mail size={13} /> {tech.email}
                      </span>
                      {tech.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={13} /> {tech.phone}
                        </span>
                      )}
                    </div>

                    {/* Workload Progress */}
                    <div style={{ margin: '0.75rem 0' }}>
                      <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Active Workload:</span>
                        <span style={{ fontWeight: 700, color: isOverloaded ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                          {active} / {max} assigned
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: 'var(--color-surface)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, (active / max) * 100)}%`,
                            height: '100%',
                            backgroundColor: isOverloaded
                              ? 'var(--color-danger)'
                              : active > 0
                              ? 'var(--color-warning)'
                              : 'var(--color-success)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Availability Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--color-border)',
                      marginTop: '0.5rem',
                    }}
                  >
                    <select
                      className="form-select"
                      style={{ padding: '0.25rem 1.75rem 0.25rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
                      value={tech.availabilityStatus || 'Available'}
                      onChange={(e) => handleUpdateAvailability(tech._id, e.target.value)}
                    >
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                      <option value="On Leave">On Leave</option>
                    </select>

                    <button
                      onClick={() => handleToggleActive(tech._id, tech.isActive)}
                      className="btn btn-secondary flex items-center gap-1"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      title={tech.isActive ? 'Deactivate Worker' : 'Activate Worker'}
                    >
                      {tech.isActive ? (
                        <>
                          <ToggleRight size={14} color="var(--color-success)" /> Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={14} color="var(--color-danger)" /> Inactive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTechnicians;
