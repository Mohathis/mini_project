import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';
import { validatePassword } from '../utils/validation';

export function TechniciansManager({ activeRole, techniciansList, onRefresh, showAlert }) {
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().substring(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const [showPrevious, setShowPrevious] = useState(false);
  const [previousTechs, setPreviousTechs] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const fetchPreviousTechs = async () => {
    setLoadingPrevious(true);
    try {
      const res = await fetch(`${API_URL}/users?role=Technician&showDeleted=true`);
      if (res.ok) {
        const data = await res.json();
        setPreviousTechs(data);
      }
    } catch (err) {
      console.error('Error fetching previous technicians:', err);
    } finally {
      setLoadingPrevious(false);
    }
  };

  useEffect(() => {
    if (showPrevious) {
      fetchPreviousTechs();
    }
  }, [showPrevious]);

  // Edit inline states for Technicians
  const [editingTechId, setEditingTechId] = useState(null);
  const [deletingTechId, setDeletingTechId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editJoinDate, setEditJoinDate] = useState('');

  const startEdit = (t) => {
    setEditingTechId(t._id);
    setEditName(t.name || '');
    setEditSpecialty(t.specialty || '');
    setEditPhone(t.phone || '');
    setEditUsername(t.username || '');
    setEditPassword(t.password || '');
    setEditJoinDate(t.joinDate ? new Date(t.joinDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10));
  };

  const cancelEdit = () => {
    setEditingTechId(null);
  };

  const handleUpdate = async (id) => {
    if (!editName || !editSpecialty || !editUsername || !editPassword || !editJoinDate) {
      showAlert('All fields are required.', 'warning');
      return;
    }
    const valErr = validatePassword(editPassword);
    if (valErr) {
      showAlert(valErr, 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          specialty: editSpecialty,
          phone: editPhone,
          username: editUsername,
          password: editPassword,
          joinDate: editJoinDate
        })
      });
      if (res.ok) {
        showAlert('Technician updated successfully.', 'success');
        setEditingTechId(null);
        onRefresh();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to update technician.', 'danger');
      }
    } catch (err) {
      showAlert('Error updating technician.', 'danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !name || !specialty) return;

    const valErr = validatePassword(password);
    if (valErr) {
      showAlert(valErr, 'warning');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, role: 'Technician', specialty, phone, joinDate })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(`Technician "${data.name}" registered successfully.`, 'success');
        setUsername('');
        setPassword('');
        setName('');
        setSpecialty('');
        setPhone('');
        setJoinDate(new Date().toISOString().substring(0, 10));
        setShowForm(false);
        onRefresh();
      } else {
        showAlert(data.message || 'Failed to register technician.', 'danger');
      }
    } catch (err) {
      showAlert('Network error occurred.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showAlert('Technician removed successfully.', 'success');
        onRefresh();
        setShowPrevious(true);
        fetchPreviousTechs();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to delete technician.', 'danger');
      }
    } catch (err) {
      showAlert('Error deleting technician.', 'danger');
    }
  };

  const list = techniciansList && techniciansList.length > 0 ? techniciansList : [
    { name: 'John Mathew', role: 'Technician', specialty: 'Ventilators, ECG & ICU Gear', activeTasks: 2, status: 'On Shift', joinDate: '2023-01-15' },
    { name: 'Robert Downey', role: 'Technician', specialty: 'Imaging & MRI Scanners', activeTasks: 3, status: 'On Shift', joinDate: '2024-03-22' },
    { name: 'Sarah Jenkins', role: 'Technician', specialty: 'Network Printers & Switches', activeTasks: 1, status: 'On Break', joinDate: '2024-06-10' }
  ];

  return (
    <div className="fade-in">
      {/* Action Toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        {activeRole === 'Manager' && !showForm && (
          <button 
            className="btn btn-blue d-flex align-items-center gap-2 px-3 py-2"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-lg"></i> Register New Technician
          </button>
        )}
        <button 
          className={`btn ${showPrevious ? 'btn-primary text-white' : 'btn-outline-primary'} d-flex align-items-center gap-2 px-3 py-2`}
          onClick={() => setShowPrevious(!showPrevious)}
        >
          <i className="bi bi-clock-history"></i> {showPrevious ? 'Show Active Techs' : 'Previous Techs'}
        </button>
      </div>

      {/* Registration form */}
      {activeRole === 'Manager' && showForm && (
        <div className="mb-4">
          <div className="card-clean" style={{ maxWidth: '600px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 text-dark">Register New Technician</h5>
              <button className="btn-close" onClick={() => setShowForm(false)}></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. John Doe" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Specialty *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. ICU Gear, MRI" 
                    required
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Username *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. johndoe" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Password *</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="••••••••" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    placeholder="e.g. +1-555-0192" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Join Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                  />
                </div>
                <div className="col-12 d-flex justify-content-end gap-2 mt-3">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-blue btn-sm px-3"
                    disabled={submitting}
                  >
                    {submitting ? 'Registering...' : 'Register'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPrevious ? (
        /* Previous Technicians Table */
        <div className="card-clean">
          <h4 className="fw-bold mb-4"><i className="bi bi-clock-history me-2 text-primary"></i>Previous Engineering Team (Deleted)</h4>
          {loadingPrevious ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : previousTechs.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-people mb-2" style={{ fontSize: '2.5rem' }}></i>
              <p>No previous technicians found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Specialty</th>
                    <th>Username</th>
                    <th>Join Date</th>
                    <th>End Date</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {previousTechs.map((t, index) => {
                    const start = t.joinDate;
                    const end = t.endDate;
                    const diffTime = start && end ? Math.abs(new Date(end) - new Date(start)) : null;
                    const diffDays = diffTime !== null ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;
                    const durationStr = diffDays !== null ? `${diffDays} Day${diffDays !== 1 ? 's' : ''}` : 'N/A';
                    return (
                      <tr key={t._id || index}>
                        <td><strong>{t.name}</strong></td>
                        <td><span className="badge bg-light text-dark font-monospace">{t.specialty || 'General'}</span></td>
                        <td><code className="text-primary">{t.username || 'N/A'}</code></td>
                        <td>{t.joinDate ? new Date(t.joinDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                        <td>{t.endDate ? new Date(t.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</td>
                        <td><span className="status-badge status-warning-bg">{durationStr}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Technicians List Grid */
        <div className="card-clean">
          <h4 className="fw-bold mb-4"><i className="bi bi-people-fill me-2 text-primary"></i>Authorized Engineering Team</h4>
          <div className="row g-4">
            {list.map((t, index) => {
              const isEditing = editingTechId === t._id;
              return (
                <div key={t._id || index} className="col-md-6">
                  <div className="p-3 border rounded bg-white shadow-sm">
                    {isEditing ? (
                      <div className="row g-2">
                        <div className="col-12">
                          <label className="form-label small fw-bold mb-1">Full Name</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-bold mb-1">Specialty</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            value={editSpecialty} 
                            onChange={(e) => setEditSpecialty(e.target.value)} 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold mb-1">Username</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            value={editUsername} 
                            onChange={(e) => setEditUsername(e.target.value)} 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold mb-1">Password</label>
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            value={editPassword} 
                            onChange={(e) => setEditPassword(e.target.value)} 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold mb-1">Phone Number</label>
                          <input 
                            type="tel" 
                            className="form-control form-control-sm"
                            placeholder="e.g. +1-555-0192"
                            value={editPhone} 
                            onChange={(e) => setEditPhone(e.target.value)} 
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold mb-1">Join Date</label>
                          <input 
                            type="date" 
                            className="form-control form-control-sm"
                            value={editJoinDate} 
                            onChange={(e) => setEditJoinDate(e.target.value)} 
                          />
                        </div>
                        <div className="col-12 d-flex justify-content-end gap-1 mt-2">
                          <button 
                            className="btn btn-sm btn-success py-1 px-2"
                            title="Save changes"
                            onClick={() => handleUpdate(t._id)}
                          >
                            <i className="bi bi-check-lg"></i> Save
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary py-1 px-2"
                            title="Cancel"
                            onClick={cancelEdit}
                          >
                            <i className="bi bi-x-lg"></i> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h5 className="fw-bold mb-1">{t.name}</h5>
                          <span className="text-muted small d-block mb-1">Initials: <strong>{t.initials || 'T'}</strong> | Role: {t.role || 'Technician'}</span>
                          {t.phone && (
                            <span className="text-muted small d-block mb-1">
                              <i className="bi bi-telephone me-1 text-primary"></i>Phone: <strong>{t.phone}</strong>
                            </span>
                          )}
                          {activeRole === 'Manager' && (
                            <span className="text-muted small d-block mb-1">
                              U: <code className="text-primary">{t.username || 'N/A'}</code> | P: <code className="text-secondary">{t.password || 'N/A'}</code>
                            </span>
                          )}
                          <span className="text-muted small d-block mb-2">
                            Join Date: <strong>{t.joinDate ? new Date(t.joinDate).toISOString().substring(0, 10) : 'N/A'}</strong>
                          </span>
                          <span className="badge bg-light text-dark font-monospace" style={{ fontSize: '0.75rem' }}>Spec: {t.specialty || 'General'}</span>
                        </div>
                        <div className="text-end d-flex flex-column align-items-end gap-2">
                          <span className="badge bg-success">
                            {t.status || 'On Shift'}
                          </span>
                          {activeRole === 'Manager' && t._id && (
                            <div className="d-flex gap-1 mt-1">
                              <button 
                                className="btn btn-sm btn-outline-primary py-1 px-2" 
                                title="Edit Technician"
                                onClick={() => startEdit(t)}
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              {deletingTechId === t._id ? (
                                <div className="d-flex gap-1 align-items-center">
                                  <button 
                                    className="btn btn-sm btn-danger py-1 px-2" 
                                    title="Confirm Delete"
                                    onClick={() => {
                                      handleDelete(t._id);
                                      setDeletingTechId(null);
                                    }}
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    <i className="bi bi-check-lg"></i> Delete?
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-secondary py-1 px-1" 
                                    title="Cancel"
                                    onClick={() => setDeletingTechId(null)}
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  className="btn btn-sm btn-outline-danger py-1 px-2" 
                                  title="Remove Technician"
                                  onClick={() => setDeletingTechId(t._id)}
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TechniciansManager;
