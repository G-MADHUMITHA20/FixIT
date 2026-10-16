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
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  MapPin,
  Award,
} from 'lucide-react';

const SPECIALIZATIONS = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Civil/Masonry',
  'HVAC/AC Technician',
  'Painter',
  'IT Technician',
  'Laboratory Technician',
  'Housekeeping / Cleaner',
  'General Maintenance',
];

const ManageTechnicians = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [filterSpec, setFilterSpec] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    technicianId: '',
    phone: '',
    specialization: 'Electrician',
    designation: 'Facilities Specialist',
    experienceYears: 3,
    department: 'Campus Facilities & Infrastructure',
    availabilityStatus: 'Available',
    maxAssignments: 4,
    isActive: true,
    isDemo: false,
  });

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

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      technicianId: `TECH-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: '',
      specialization: 'Electrician',
      designation: 'Facilities Specialist',
      experienceYears: 3,
      department: 'Campus Facilities & Infrastructure',
      availabilityStatus: 'Available',
      maxAssignments: 4,
      isActive: true,
      isDemo: false,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tech) => {
    setEditingId(tech._id || tech.id);
    setFormData({
      name: tech.name || '',
      email: tech.email || '',
      password: '',
      technicianId: tech.technicianId || tech.workerId || '',
      phone: tech.phone || '',
      specialization: tech.specialization || 'Electrician',
      designation: tech.designation || 'Facilities Specialist',
      experienceYears: tech.experienceYears !== undefined ? tech.experienceYears : 3,
      department: tech.department || 'Campus Facilities & Infrastructure',
      availabilityStatus: tech.availabilityStatus || 'Available',
      maxAssignments: tech.maxAssignments || 4,
      isActive: tech.isActive !== undefined ? tech.isActive : true,
      isDemo: Boolean(tech.isDemo),
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validations
    if (!formData.name.trim()) {
      setError('Please provide the technician full name');
      setLoading(false);
      return;
    }
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setError('Please provide a valid professional email address');
      setLoading(false);
      return;
    }
    if (!formData.technicianId.trim()) {
      setError('Please provide a unique Technician ID');
      setLoading(false);
      return;
    }

    try {
      if (editingId) {
        await api.put(`/admin/technicians/${editingId}`, formData);
        setSuccess(`Technician ${formData.name} updated successfully.`);
      } else {
        await api.post('/admin/technicians', formData);
        setSuccess(`Technician ${formData.name} created successfully.`);
      }
      setIsModalOpen(false);
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!window.confirm('Initialize or sync the 32 demo technicians across all campus specializations in MongoDB Atlas?')) return;
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/admin/workers/seed-demo');
      setSuccess(res.data.message || 'Successfully initialized 32 demo technicians.');
      fetchTechnicians();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to seed demo technicians');
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
      await api.patch(`/admin/technicians/${workerId}/status`, {
        isActive: !currentActive,
      });
      fetchTechnicians();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (workerId, name) => {
    if (!window.confirm(`Are you sure you want to remove technician ${name}?`)) return;
    try {
      await api.delete(`/admin/technicians/${workerId}`);
      setSuccess(`Technician ${name} deleted successfully.`);
      fetchTechnicians();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete technician');
    }
  };

  const filteredTechnicians = technicians.filter((tech) => {
    if (filterSpec !== 'All' && tech.specialization !== filterSpec) return false;
    if (filterStatus === 'Available' && tech.availabilityStatus !== 'Available') return false;
    if (filterStatus === 'Busy' && tech.availabilityStatus !== 'Busy') return false;
    if (filterStatus === 'Unavailable' && tech.availabilityStatus !== 'Unavailable') return false;
    if (filterStatus === 'Inactive' && tech.isActive !== false) return false;
    if (filterStatus === 'Demo' && !tech.isDemo) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (tech.name || '').toLowerCase().includes(q);
      const matchEmail = (tech.email || '').toLowerCase().includes(q);
      const matchId = (tech.technicianId || tech.workerId || '').toLowerCase().includes(q);
      const matchDept = (tech.department || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchId && !matchDept) return false;
    }

    return true;
  });

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      <div className="page-title flex justify-between items-center mb-2" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex items-center gap-2">
          <Shield size={28} color="var(--color-primary)" />
          <div>
            <h2 style={{ margin: 0 }}>Technician &amp; Worker Management</h2>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Add, monitor workloads, and manage campus facilities maintenance personnel
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-1"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={16} /> Add Technician
          </button>
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="btn btn-secondary flex items-center gap-1"
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
            title="Populate 32 demo technicians across all 8 specializations"
          >
            <Layers size={16} /> {seeding ? 'Syncing...' : 'Sync Demo Techs (32)'}
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success mb-3">{success}</div>}
      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* Filter & Search Bar */}
      <div className="surface-card mb-4" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={18} color="var(--color-text-muted)" />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, ID, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            />
          </div>

          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <div className="flex items-center gap-1">
              <Filter size={14} color="var(--color-text-muted)" />
              <select
                className="form-select"
                style={{ fontSize: '0.85rem', padding: '0.4rem 1.75rem 0.4rem 0.6rem' }}
                value={filterSpec}
                onChange={(e) => setFilterSpec(e.target.value)}
              >
                <option value="All">All Specializations ({technicians.length})</option>
                {SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="form-select"
              style={{ fontSize: '0.85rem', padding: '0.4rem 1.75rem 0.4rem 0.6rem' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available Only</option>
              <option value="Busy">Busy Only</option>
              <option value="Unavailable">Unavailable Only</option>
              <option value="Inactive">Inactive</option>
              <option value="Demo">Demo Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Technicians Table */}
      <div className="table-container mb-4">
        {filteredTechnicians.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--color-text-muted)' }}>
            <Briefcase size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>No technicians match the current filter</p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Try clearing filters or click &quot;Add Technician&quot; above.</p>
          </div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th>Technician Profile</th>
                <th>Specialization &amp; Dept</th>
                <th>Contact</th>
                <th>Availability</th>
                <th>Active Workload</th>
                <th>Completed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTechnicians.map((tech) => {
                const techId = tech.technicianId || tech.workerId || `TECH-${tech._id.toString().slice(-4).toUpperCase()}`;
                const isOverloaded = (tech.activeAssignmentsCount || 0) >= (tech.maxAssignments || 4);

                return (
                  <tr key={tech._id}>
                    <td>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong style={{ fontSize: '0.95rem' }}>{tech.name}</strong>
                          {tech.isDemo && (
                            <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#b45309', fontSize: '0.7rem' }}>
                              Demo
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {techId}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          {tech.designation || 'Technician'} &bull; {tech.experienceYears || 2} yrs exp
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'inline-block' }}>
                        {tech.specialization}
                      </span>
                      <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.78rem' }}>
                        <MapPin size={11} /> {tech.department || 'Campus Facilities'}
                      </div>
                    </td>

                    <td style={{ fontSize: '0.85rem' }}>
                      <div className="flex items-center gap-1">
                        <Mail size={12} color="var(--color-text-muted)" /> {tech.email}
                      </div>
                      {tech.phone && (
                        <div className="flex items-center gap-1 text-muted mt-1">
                          <Phone size={12} /> {tech.phone}
                        </div>
                      )}
                    </td>

                    <td>
                      <select
                        className="form-select"
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.25rem 1.5rem 0.25rem 0.5rem',
                          width: 'auto',
                          borderColor:
                            tech.availabilityStatus === 'Available'
                              ? 'var(--color-success)'
                              : tech.availabilityStatus === 'Busy'
                              ? 'var(--color-warning)'
                              : 'var(--color-danger)',
                        }}
                        value={tech.availabilityStatus || 'Available'}
                        onChange={(e) => handleUpdateAvailability(tech._id, e.target.value)}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${isOverloaded ? 'badge-danger' : tech.activeAssignmentsCount > 0 ? 'badge-warning' : 'badge-success'}`}
                          style={{ fontSize: '0.8rem' }}
                        >
                          {tech.activeAssignmentsCount || 0} / {tech.maxAssignments || 4} active
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="flex items-center gap-1" style={{ fontSize: '0.85rem', color: 'var(--color-success)', fontWeight: 600 }}>
                        <CheckCircle size={14} /> {tech.completedAssignmentsCount || 0}
                      </span>
                    </td>

                    <td>
                      <button
                        onClick={() => handleToggleActive(tech._id, tech.isActive !== false)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={tech.isActive !== false ? 'Click to Deactivate' : 'Click to Activate'}
                      >
                        {tech.isActive !== false ? (
                          <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.75rem' }}>
                            <ToggleRight size={14} /> Active
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            <ToggleLeft size={14} /> Inactive
                          </span>
                        )}
                      </button>
                    </td>

                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(tech)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Edit Technician"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(tech._id, tech.name)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: 'var(--color-danger)' }}
                          title="Remove Technician"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Technician Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="surface-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingId ? 'Edit Technician Details' : 'Add New Maintenance Technician'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Anand Verma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Technician ID *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. TECH-ELEC-01"
                    value={formData.technicianId}
                    onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Professional Email *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. anand.elec@fixit.campus"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 98001 01004"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {!editingId && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Login Password (Min 6 chars)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Default: Password@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Specialization *</label>
                  <select
                    className="form-select"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  >
                    {SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Professional Designation</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Senior Electrician"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-input"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Max Concurrent Tasks</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="form-input"
                    value={formData.maxAssignments}
                    onChange={(e) => setFormData({ ...formData, maxAssignments: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Assigned Department / Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Academic Block & Labs"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Availability Status</label>
                  <select
                    className="form-select"
                    value={formData.availabilityStatus}
                    onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isDemo"
                  checked={formData.isDemo}
                  onChange={(e) => setFormData({ ...formData, isDemo: e.target.checked })}
                />
                <label htmlFor="isDemo" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Mark as Demo Technician Record
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Saving...' : editingId ? 'Update Technician' : 'Create Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTechnicians;
