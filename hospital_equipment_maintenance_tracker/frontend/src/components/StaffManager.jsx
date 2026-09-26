import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';
import { validatePassword } from '../utils/validation';

export function StaffManager({ activeRole, staffList, onRefresh, showAlert, departmentsList }) {
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState(null);

  // Auto select first department on render
  useEffect(() => {
    if (departmentsList && departmentsList.length > 0) {
      setDepartment(departmentsList[0].name);
    } else {
      setDepartment('Emergency');
    }
  }, [departmentsList, showForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !name || !department) return;

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
        body: JSON.stringify({ username, password, name, role: 'Staff', department })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(`Staff member "${data.name}" registered successfully.`, 'success');
        setUsername('');
        setPassword('');
        setName('');
        setShowForm(false);
        onRefresh();
      } else {
        showAlert(data.message || 'Failed to register staff member.', 'danger');
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
        showAlert('Staff member removed successfully.', 'success');
        onRefresh();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to delete staff member.', 'danger');
      }
    } catch (err) {
      showAlert('Error deleting staff member.', 'danger');
    }
  };

  const list = staffList && staffList.length > 0 ? staffList : [
    { name: 'Nurse Joy', role: 'Staff', department: 'Emergency', initials: 'NJ' }
  ];

  return (
    <div className="fade-in">
      {/* Registration form */}
      {activeRole === 'Manager' && (
        <div className="mb-4">
          {!showForm ? (
            <button 
              className="btn btn-blue d-flex align-items-center gap-2 px-3 py-2"
              onClick={() => setShowForm(true)}
            >
              <i className="bi bi-plus-lg"></i> Register New Staff Member
            </button>
          ) : (
            <div className="card-clean" style={{ maxWidth: '600px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="fw-bold m-0 text-dark">Register New Staff Member</h5>
                <button className="btn-close" onClick={() => setShowForm(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Full Name *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Nurse Joy" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Department *</label>
                    <select 
                      className="form-select"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      {(departmentsList && departmentsList.length > 0 ? departmentsList : [{ name: 'Emergency' }, { name: 'OPD' }, { name: 'Laboratory' }, { name: 'Pharmacy' }, { name: 'Radiology' }, { name: 'Administration' }, { name: 'ICU' }]).map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Username *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. nursejoy" 
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
          )}
        </div>
      )}

      {/* Staff List Grid */}
      <div className="card-clean">
        <h4 className="fw-bold mb-4"><i className="bi bi-person-badge-fill me-2 text-primary"></i>Active Nursing & Department Staff</h4>
        <div className="row g-4">
          {list.map((s, index) => (
            <div key={s._id || index} className="col-md-6">
              <div className="p-3 border rounded bg-white shadow-sm d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold mb-1">{s.name}</h5>
                  <span className="text-muted small d-block mb-2">Initials: <strong>{s.initials || 'S'}</strong> | Username: <strong>{s.username}</strong></span>
                  <span className="badge bg-light text-primary font-monospace" style={{ fontSize: '0.75rem' }}><i className="bi bi-hospital me-1"></i>Dept: {s.department || 'General'}</span>
                </div>
                <div className="text-end d-flex flex-column align-items-end">
                  {activeRole === 'Manager' && s._id && (
                    <>
                      {deletingStaffId === s._id ? (
                        <div className="d-flex gap-1 align-items-center mt-1">
                          <button 
                            className="btn btn-sm btn-danger py-1 px-2" 
                            title="Confirm Delete"
                            onClick={() => {
                              handleDelete(s._id);
                              setDeletingStaffId(null);
                            }}
                            style={{ fontSize: '0.72rem' }}
                          >
                            <i className="bi bi-check-lg"></i> Delete?
                          </button>
                          <button 
                            className="btn btn-sm btn-secondary py-1 px-1" 
                            title="Cancel"
                            onClick={() => setDeletingStaffId(null)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="btn btn-sm btn-outline-danger py-1 px-2 mt-1" 
                          title="Remove Staff Member"
                          onClick={() => setDeletingStaffId(s._id)}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StaffManager;
