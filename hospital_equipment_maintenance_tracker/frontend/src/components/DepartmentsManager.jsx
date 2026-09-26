import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';
import { validateDepartmentCode, validatePassword } from '../utils/validation';

export function DepartmentsManager({ activeRole, departmentsList, onRefresh, showAlert }) {
  const list = departmentsList && departmentsList.length > 0 ? departmentsList : [
    { name: 'Emergency', code: 'ER', lead: 'Dr. Sarah Connor', activeEqupements: 8 },
    { name: 'ICU', code: 'ICU', lead: 'Dr. John Miller', activeEqupements: 12 },
    { name: 'Radiology', code: 'RAD', lead: 'Dr. Elena Vance', activeEqupements: 6 },
    { name: 'Laboratory', code: 'LAB', lead: 'Dr. Alex Mercer', activeEqupements: 15 },
    { name: 'Pharmacy', code: 'PHAR', lead: 'Dr. Gregory House', activeEqupements: 4 },
    { name: 'OPD', code: 'OPD', lead: 'Dr. Stephen Strange', activeEqupements: 10 }
  ];

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lead, setLead] = useState('');
  const [activeEqupements, setActiveEqupements] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live code validation for Add Department form
  const cleanAddCode = code.trim().toUpperCase();
  const addCodeDuplicate = cleanAddCode ? list.find(d => !d.isDeleted && d.code && d.code.trim().toUpperCase() === cleanAddCode) : null;
  const addCodeError = cleanAddCode ? validateDepartmentCode(cleanAddCode, list) : null;

  // Previous Departments states
  const [showPrevious, setShowPrevious] = useState(false);
  const [previousDepts, setPreviousDepts] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  // Edit inline states
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editLead, setEditLead] = useState('');
  const [editActiveEqupements, setEditActiveEqupements] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchPreviousDepts = async () => {
    setLoadingPrevious(true);
    try {
      const res = await fetch(`${API_URL}/departments?showDeleted=true`);
      if (res.ok) {
        const data = await res.json();
        setPreviousDepts(data);
      }
    } catch (err) {
      console.error('Error fetching previous departments:', err);
    } finally {
      setLoadingPrevious(false);
    }
  };

  useEffect(() => {
    if (showPrevious) {
      fetchPreviousDepts();
    }
  }, [showPrevious]);

  const startEdit = (d) => {
    setEditingDeptId(d._id);
    setEditName(d.name || '');
    setEditCode(d.code || '');
    setEditLead(d.lead || '');
    setEditActiveEqupements(d.activeEqupements !== undefined ? d.activeEqupements : 0);
    setEditUsername(d.username === 'N/A' ? '' : (d.username || ''));
    setEditPassword(d.password === 'N/A' ? '' : (d.password || ''));
  };

  const cancelEdit = () => {
    setEditingDeptId(null);
  };

  const handleUpdate = async (id) => {
    if (!editName || !editCode || !editLead || !editUsername || !editPassword) {
      showAlert('All fields are required.', 'warning');
      return;
    }
    const codeErr = validateDepartmentCode(editCode, list, id);
    if (codeErr) {
      showAlert(codeErr, 'warning');
      return;
    }
    const valErr = validatePassword(editPassword);
    if (valErr) {
      showAlert(valErr, 'warning');
      return;
    }
    if (Number(editActiveEqupements) < 0) {
      showAlert('Active equipments count cannot be negative.', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          lead: editLead.trim(),
          activeEqupements: editActiveEqupements,
          username: editUsername.trim(),
          password: editPassword
        })
      });
      if (res.ok) {
        showAlert('Department updated successfully.', 'success');
        setEditingDeptId(null);
        onRefresh();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to update department.', 'danger');
      }
    } catch (err) {
      showAlert('Error updating department.', 'danger');
    }
  };

  const handleDelete = async (id, reason) => {
    if (!reason || !reason.trim()) {
      showAlert('Please provide a reason for deleting this department.', 'warning');
      return;
    }
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (res.ok) {
        showAlert('Department moved to previous departments.', 'success');
        setDeletingDept(null);
        setDeleteReason('');
        onRefresh();
        setShowPrevious(true);
        fetchPreviousDepts();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to delete department.', 'danger');
      }
    } catch (err) {
      showAlert('Error deleting department.', 'danger');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRestore = async (id) => {
    setRestoringId(id);
    try {
      const res = await fetch(`${API_URL}/departments/${id}/restore`, {
        method: 'PUT'
      });
      if (res.ok) {
        showAlert('Department restored successfully.', 'success');
        onRefresh();
        fetchPreviousDepts();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Failed to restore department.', 'danger');
      }
    } catch (err) {
      showAlert('Error restoring department.', 'danger');
    } finally {
      setRestoringId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !code || !lead || activeEqupements === '' || !username || !password) return;

    const codeErr = validateDepartmentCode(code, list);
    if (codeErr) {
      showAlert(codeErr, 'warning');
      return;
    }

    const valErr = validatePassword(password);
    if (valErr) {
      showAlert(valErr, 'warning');
      return;
    }
    if (Number(activeEqupements) < 0) {
      showAlert('Active equipments count cannot be negative.', 'warning');
      return;
    }
    setSubmitting(true);

    try {
      // 1. Create Department
      const res = await fetch(`${API_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          lead: lead.trim(),
          activeEqupements
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showAlert(data.message || 'Failed to add department.', 'danger');
        setSubmitting(false);
        return;
      }

      // 2. Create User Account
      const userRes = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: `${name.trim()} Account`,
          role: 'Staff',
          department: name.trim()
        })
      });

      const userData = await userRes.json();
      if (userRes.ok) {
        showAlert(`Department "${data.name}" (${data.code}) and login account registered successfully.`, 'success');
        setName('');
        setCode('');
        setLead('');
        setActiveEqupements('');
        setUsername('');
        setPassword('');
        setShowForm(false);
        onRefresh();
      } else {
        showAlert(userData.message || 'Department created but failed to create login account.', 'warning');
        onRefresh();
      }
    } catch (err) {
      showAlert('Network error occurred.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Action Toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        {activeRole === 'Manager' && !showForm && (
          <button 
            className="btn btn-blue d-flex align-items-center gap-2 px-3 py-2"
            onClick={() => setShowForm(true)}
          >
            <i className="bi bi-plus-lg"></i> Add New Department
          </button>
        )}
        <button 
          className={`btn ${showPrevious ? 'btn-primary text-white' : 'btn-outline-primary'} d-flex align-items-center gap-2 px-3 py-2`}
          onClick={() => setShowPrevious(!showPrevious)}
        >
          <i className="bi bi-clock-history"></i> {showPrevious ? 'Show Active Departments' : 'Previous Departments'}
        </button>
      </div>

      {/* Add Department Form Panel */}
      {activeRole === 'Manager' && showForm && (
        <div className="mb-4">
          <div className="card-clean" style={{ maxWidth: '600px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0 text-dark">Add New Department</h5>
              <button className="btn-close" onClick={() => setShowForm(false)}></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Department Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Cardiology" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold d-flex justify-content-between align-items-center">
                    <span>Department Code *</span>
                    <span className="text-muted fw-normal" style={{ fontSize: '0.72rem' }}>Unique (2-10 chars)</span>
                  </label>
                  <input 
                    type="text" 
                    className={`form-control font-monospace ${code.trim() ? (addCodeError ? 'is-invalid' : 'is-valid') : ''}`} 
                    placeholder="e.g. CARD" 
                    required
                    maxLength="10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  />
                  {code.trim() && addCodeDuplicate && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.76rem' }}>
                      <i className="bi bi-exclamation-triangle-fill text-danger"></i>
                      <span>Already assigned to <strong>{addCodeDuplicate.name}</strong>. Codes must be unique.</span>
                    </div>
                  )}
                  {code.trim() && !addCodeDuplicate && addCodeError && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.76rem' }}>
                      <i className="bi bi-x-circle-fill text-danger"></i>
                      <span>{addCodeError}</span>
                    </div>
                  )}
                  {code.trim() && !addCodeError && (
                    <div className="text-success small mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.76rem' }}>
                      <i className="bi bi-check-circle-fill text-success"></i>
                      <span>Code "{cleanAddCode}" is available</span>
                    </div>
                  )}
                </div>
                <div className="col-md-12">
                  <label className="form-label small fw-bold">Department Lead *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Dr. Bruce Banner" 
                    required
                    value={lead}
                    onChange={(e) => setLead(e.target.value)}
                  />
                </div>
                <div className="col-md-12">
                  <label className="form-label small fw-bold">Active Equipments *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 10" 
                    required
                    min="0"
                    value={activeEqupements}
                    onChange={(e) => setActiveEqupements(e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Username *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. cardiology_user" 
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
                    {submitting ? 'Saving...' : 'Save Department'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Department Confirmation Modal with Reason */}
      {deletingDept && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-danger text-white py-3 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-trash-fill fs-5"></i>
                  <h5 className="modal-title fw-bold m-0">Delete Department</h5>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  aria-label="Close" 
                  onClick={() => {
                    setDeletingDept(null);
                    setDeleteReason('');
                  }}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="text-muted mb-3" style={{ fontSize: '0.92rem' }}>
                  Deleting this department will archive it to the <strong>Previous Departments</strong> list and deactivate any associated staff login account.
                </p>
                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <div className="row g-2 small">
                    <div className="col-6">
                      <span className="text-muted d-block">Department Name</span>
                      <strong className="text-dark">{deletingDept.name}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Code</span>
                      <span className="badge bg-secondary font-monospace">{deletingDept.code}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Department Lead</span>
                      <span>{deletingDept.lead || 'N/A'}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Active Equipment</span>
                      <span>{deletingDept.activeEqupements || 0} Devices</span>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">
                    Reason for Deletion <span className="text-danger">*</span>
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder="Enter reason for deleting / decommissioning this department..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                  ></textarea>
                </div>

                {/* Quick chip presets */}
                <div>
                  <label className="form-label text-muted small fw-semibold d-block mb-1">Quick Reasons:</label>
                  <div className="d-flex flex-wrap gap-1">
                    {[
                      'Department Merged',
                      'Service Decommissioned',
                      'Facility Restructuring',
                      'Equipment Reallocated',
                      'Temporary Closure'
                    ].map((reasonText) => (
                      <button
                        key={reasonText}
                        type="button"
                        className={`btn btn-sm py-1 px-2 ${deleteReason === reasonText ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.75rem', borderRadius: '20px' }}
                        onClick={() => setDeleteReason(reasonText)}
                      >
                        + {reasonText}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm px-3" 
                  onClick={() => {
                    setDeletingDept(null);
                    setDeleteReason('');
                  }}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm px-4 d-flex align-items-center gap-2"
                  disabled={!deleteReason.trim() || deleteSubmitting}
                  onClick={() => handleDelete(deletingDept._id, deleteReason)}
                >
                  {deleteSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash-fill"></i> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrevious ? (
        /* Previous Departments Table */
        <div className="card-clean">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <h4 className="fw-bold m-0">
              <i className="bi bi-clock-history me-2 text-primary"></i>Previous Departments (Deleted / Archived)
            </h4>
            <button 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={fetchPreviousDepts}
              disabled={loadingPrevious}
            >
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>

          {loadingPrevious ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted small mt-2">Loading previous departments...</p>
            </div>
          ) : previousDepts.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-hospital mb-2" style={{ fontSize: '2.5rem', opacity: 0.5 }}></i>
              <p className="mb-0 fw-semibold">No previous departments found.</p>
              <span className="small text-muted">Deleted or decommissioned departments will appear here.</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Dept Name</th>
                    <th>Code</th>
                    <th>Department Lead</th>
                    <th>Reason for Deletion</th>
                    <th>Date Deleted</th>
                    <th>Duration Active</th>
                    {activeRole === 'Manager' && <th style={{ width: '110px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {previousDepts.map((d, index) => {
                    const start = d.createdAt;
                    const end = d.deletedAt || d.updatedAt;
                    const diffTime = start && end ? Math.abs(new Date(end) - new Date(start)) : null;
                    const diffDays = diffTime !== null ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;
                    const durationStr = diffDays !== null ? `${diffDays} Day${diffDays !== 1 ? 's' : ''}` : 'N/A';

                    return (
                      <tr key={d._id || index}>
                        <td>
                          <strong>{d.name}</strong>
                        </td>
                        <td>
                          <span className="badge bg-secondary font-monospace" style={{ fontSize: '0.75rem' }}>{d.code}</span>
                        </td>
                        <td>{d.lead || 'N/A'}</td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-danger-subtle text-danger border border-danger-subtle small">
                            <i className="bi bi-info-circle-fill" style={{ fontSize: '0.75rem' }}></i>
                            <span>{d.deletionReason || 'No reason specified'}</span>
                          </div>
                        </td>
                        <td>
                          {d.deletedAt 
                            ? new Date(d.deletedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : (d.updatedAt ? new Date(d.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A')}
                        </td>
                        <td>
                          <span className="status-badge status-warning-bg">{durationStr}</span>
                        </td>
                        {activeRole === 'Manager' && (
                          <td>
                            <button 
                              className="btn btn-sm btn-outline-success py-1 px-2 d-inline-flex align-items-center gap-1"
                              title="Restore Department"
                              disabled={restoringId === d._id}
                              onClick={() => handleRestore(d._id)}
                              style={{ fontSize: '0.78rem' }}
                            >
                              {restoringId === d._id ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                <>
                                  <i className="bi bi-arrow-counterclockwise"></i> Restore
                                </>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Active Departments List Card */
        <div className="card-clean">
          <h4 className="fw-bold mb-4"><i className="bi bi-hospital me-2 text-primary"></i>Hospital Departments</h4>
          <div className="table-responsive">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Dept Name</th>
                  <th>Code</th>
                  <th>Department Lead</th>
                  <th>Active Equipments</th>
                  <th>Login Details</th>
                  <th>Status</th>
                  {activeRole === 'Manager' && <th style={{ width: '100px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {list.map((d, index) => {
                  const isEditing = editingDeptId === d._id;
                  const editCodeClean = editCode.trim().toUpperCase();
                  const editCodeConflict = isEditing && editCodeClean
                    ? list.find(dept => (dept._id || '').toString() !== (d._id || '').toString() && !dept.isDeleted && dept.code && dept.code.trim().toUpperCase() === editCodeClean)
                    : null;
                  return (
                    <tr key={d._id || index}>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            style={{ minWidth: '120px' }}
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                          />
                        ) : (
                          <strong>{d.name}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div>
                            <input 
                              type="text" 
                              className={`form-control form-control-sm font-monospace ${editCodeConflict ? 'is-invalid' : ''}`}
                              style={{ minWidth: '85px' }}
                              maxLength="10"
                              value={editCode} 
                              onChange={(e) => setEditCode(e.target.value.toUpperCase().replace(/\s+/g, ''))} 
                            />
                            {editCodeConflict && (
                              <div className="text-danger small mt-1" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                Used by {editCodeConflict.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge bg-secondary font-monospace" style={{ fontSize: '0.75rem' }}>{d.code}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="form-control form-control-sm"
                            style={{ minWidth: '120px' }}
                            value={editLead} 
                            onChange={(e) => setEditLead(e.target.value)} 
                          />
                        ) : (
                          d.lead
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="form-control form-control-sm"
                            style={{ minWidth: '70px' }}
                            min="0"
                            value={editActiveEqupements} 
                            onChange={(e) => setEditActiveEqupements(e.target.value)} 
                          />
                        ) : (
                          <span>{d.activeEqupements !== undefined ? d.activeEqupements : 0} Devices</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="d-flex flex-column gap-1">
                            <input 
                              type="text" 
                              className="form-control form-control-sm"
                              style={{ minWidth: '95px' }}
                              placeholder="Username"
                              value={editUsername} 
                              onChange={(e) => setEditUsername(e.target.value)} 
                            />
                            <input 
                              type="text" 
                              className="form-control form-control-sm"
                              style={{ minWidth: '95px' }}
                              placeholder="Password"
                              value={editPassword} 
                              onChange={(e) => setEditPassword(e.target.value)} 
                            />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <strong>U:</strong> <code className="text-primary">{d.username || 'N/A'}</code>
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>
                              <strong>P:</strong> <code className="text-secondary">{d.password || 'N/A'}</code>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="status-badge status-operational-bg">
                          <i className="bi bi-circle-fill" style={{ fontSize: '0.45rem' }}></i> Active
                        </span>
                      </td>
                      {activeRole === 'Manager' && (
                        <td>
                          {isEditing ? (
                            <div className="d-flex gap-1">
                              <button 
                                className="btn btn-sm btn-success py-1 px-2"
                                title="Save changes"
                                onClick={() => handleUpdate(d._id)}
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button 
                                className="btn btn-sm btn-secondary py-1 px-2"
                                title="Cancel"
                                onClick={cancelEdit}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          ) : (
                            <div className="d-flex gap-1">
                              {d._id && (
                                <>
                                  <button 
                                     className="btn btn-sm btn-outline-primary py-1 px-2"
                                     title="Edit department"
                                     onClick={() => startEdit(d)}
                                   >
                                     <i className="bi bi-pencil-fill"></i>
                                   </button>
                                   <button 
                                     className="btn btn-sm btn-outline-danger py-1 px-2"
                                     title="Delete department"
                                     onClick={() => {
                                       setDeletingDept(d);
                                       setDeleteReason('');
                                     }}
                                   >
                                     <i className="bi bi-trash-fill"></i>
                                   </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentsManager;
