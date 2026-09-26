import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';

export const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function MaintenanceRequests({ activeRole, forceMode, staffDepartment, showAlert, onNavigate, currentUser, initialRequestId, clearInitialRequestId, departmentsList, techniciansList }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flow State
  // Mode can be: 'report_form', 'issue_details', 'update_form', 'queue'
  const [mode, setMode] = useState(forceMode === 'report' ? 'report_form' : 'queue');
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Admin/Technician filter state
  const [adminDeptFilter, setAdminDeptFilter] = useState('All');
  const [adminStatusFilter, setAdminStatusFilter] = useState('All');
  const [adminSearch, setAdminSearch] = useState('');

  // Form State: Report Issue
  const [reportForm, setReportForm] = useState({
    equipmentId: '',
    issueDescription: '',
    priority: 'High',
    reportedBy: currentUser ? currentUser.name : (activeRole === 'Staff' ? 'Staff Member' : `${activeRole} Mathew`)
  });

  useEffect(() => {
    setReportForm(prev => ({
      ...prev,
      reportedBy: currentUser ? currentUser.name : (activeRole === 'Staff' ? 'Staff Member' : `${activeRole} Mathew`)
    }));
  }, [currentUser, activeRole]);

  // Form State: Update Issue
  const [updateForm, setUpdateForm] = useState({
    technician: 'John Mathew',
    status: 'Completed',
    repairNotes: '',
    repairDate: new Date().toISOString().substring(0, 10)
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/equipment`),
        fetch(`${API_URL}/requests`)
      ]);
      const eqData = await eqRes.json();
      const reqData = await reqRes.json();

      setEquipmentList(Array.isArray(eqData) ? eqData : []);
      setRequestsList(Array.isArray(reqData) ? reqData : []);

      // If a request was selected, update its reference from the fresh queue
      if (selectedRequest) {
        const freshReq = reqData.find(r => r._id === selectedRequest._id || r.requestId === selectedRequest.requestId);
        if (freshReq) {
          setSelectedRequest(freshReq);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Failed to synchronize with server.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMode(forceMode === 'report' ? 'report_form' : 'queue');
    fetchData();
  }, [forceMode]);

  useEffect(() => {
    if (initialRequestId && requestsList.length > 0) {
      const matched = requestsList.find(r => r.requestId === initialRequestId || r._id === initialRequestId);
      if (matched) {
        setSelectedRequest(matched);
        setMode('issue_details');
        clearInitialRequestId();
      }
    }
  }, [initialRequestId, requestsList]);

  // Handle reporting submit
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.equipmentId) {
      showAlert('Please select an equipment to report issue.', 'warning');
      return;
    }

    try {
      const selectedEquipment = equipmentList.find(eq => eq.equipmentId === reportForm.equipmentId || eq._id === reportForm.equipmentId);

      const payload = {
        equipmentId: reportForm.equipmentId,
        issueDescription: reportForm.issueDescription,
        priority: reportForm.priority,
        reportedBy: reportForm.reportedBy || (currentUser ? currentUser.name : (activeRole === 'Staff' ? 'Staff Member' : `${activeRole} Mathew`)),
        department: selectedEquipment ? selectedEquipment.department : 'ICU'
      };

      const res = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(`Complaint ${data.requestId} successfully created.`, 'success');
        setSelectedRequest(data);
        setMode('queue');
        // Reset form
        setReportForm({
          equipmentId: '',
          issueDescription: '',
          priority: 'High',
          reportedBy: currentUser ? currentUser.name : (activeRole === 'Staff' ? 'Staff Member' : `${activeRole} Mathew`)
        });
        fetchData();
      } else {
        if (data.isDuplicate) {
          showAlert(`DUPLICATE COMPLAINT: Complaint ${data.activeRequest.requestId} is already open.`, 'danger');
          const existing = requestsList.find(r => r.requestId === data.activeRequest.requestId);
          if (existing) {
            setSelectedRequest(existing);
            setMode('issue_details');
          }
        } else {
          showAlert(data.message || 'Error logging failure.', 'danger');
        }
      }
    } catch (error) {
      showAlert('Connection failure during submission.', 'danger');
    }
  };

  // Handle update status submit
  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    const today = getTodayStr();
    if (updateForm.repairDate && updateForm.repairDate > today) {
      showAlert('Repair date cannot be in the future. Please select today or a previous date.', 'warning');
      return;
    }

    try {
      const payload = {
        status: updateForm.status,
        assignedTechnician: selectedRequest.assignedTechnician || updateForm.technician,
        managerNotes: updateForm.repairNotes || `Status updated to ${updateForm.status}`,
        actionTaken: updateForm.repairNotes || `Maintenance status updated to ${updateForm.status}`,
        cost: 35, // default replacement part cost
        downtimeHours: 2, // default hours
        repairDate: updateForm.repairDate || today
      };

      const res = await fetch(`${API_URL}/requests/${selectedRequest._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedData = await res.json();
        showAlert(`Maintenance status updated to ${updateForm.status}.`, 'success');
        setShowAssignModal(false);

        if (updateForm.status === 'Completed') {
          // Complaint is moved to history and deleted from complaints
          setSelectedRequest(null);
          setMode('queue');
        } else {
          setSelectedRequest(updatedData);
        }
        fetchData();
      } else {
        showAlert('Failed to update work order.', 'danger');
      }
    } catch (error) {
      showAlert('Connection error during status modification.', 'danger');
    }
  };

  // Date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Display status styles
  const getPriorityStyle = (priority) => {
    if (priority === 'High' || priority === 'Emergency') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
    if (priority === 'Medium') {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 'Completed') {
      return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
    }
    if (status === 'In Progress') {
      return { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
    }
    if (status === 'Pending') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
    return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Filter requests
  const DEPARTMENTS = ['All', ...(departmentsList && departmentsList.length > 0 ? departmentsList.map(d => d.name) : ['Emergency', 'OPD', 'Laboratory', 'Pharmacy', 'Radiology', 'Administration', 'ICU'])];

  const getFilteredRequests = () => {
    // Exclude Completed complaints from active complaints list
    let list = requestsList.filter(r => r.status !== 'Completed');

    if (activeRole === 'Staff') {
      const staffName = currentUser ? currentUser.name : 'Staff Member';
      return list.filter(r => r.department === staffDepartment || r.reportedBy === staffName || r.reportedBy === 'Staff Member');
    }

    // Manager / Technician: apply dept, status, search filters
    if (adminDeptFilter !== 'All') {
      list = list.filter(r => r.department === adminDeptFilter);
    }
    if (adminStatusFilter !== 'All') {
      list = list.filter(r => r.status === adminStatusFilter);
    }
    if (adminSearch.trim()) {
      const q = adminSearch.trim().toLowerCase();
      list = list.filter(r =>
        (r.requestId || '').toLowerCase().includes(q) ||
        (r.reportedBy || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q) ||
        (r.equipmentId?.name || r.equipmentId || '').toString().toLowerCase().includes(q) ||
        (r.issueDescription || '').toLowerCase().includes(q)
      );
    }
    return list;
  };

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningReq, setAssigningReq] = useState(null);
  const [assignedTechName, setAssignedTechName] = useState('');
  const [assignDate, setAssignDate] = useState(getTodayStr());
  const [assignStatus, setAssignStatus] = useState('Assigned');

  const openAssignModal = (req, e) => {
    if (e) e.stopPropagation();
    setAssigningReq(req);
    const defaultTech = req.assignedTechnician || (techniciansList && techniciansList.length > 0 ? techniciansList[0].name : 'John Mathew');
    setAssignedTechName(defaultTech);
    setAssignStatus('Assigned');
    const today = getTodayStr();
    const initDate = req.assignDate && req.assignDate.substring(0, 10) >= today
      ? req.assignDate.substring(0, 10)
      : today;
    setAssignDate(initDate);
    setShowAssignModal(true);
  };

  const handleQuickAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigningReq) return;

    const today = getTodayStr();
    if (assignDate < today) {
      showAlert('Assign date cannot be in the past. Please select today or a future date.', 'warning');
      return;
    }

    try {
      const payload = {
        assignedTechnician: assignedTechName,
        status: assignStatus,
        assignDate: assignDate
      };

      const res = await fetch(`${API_URL}/requests/${assigningReq._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedData = await res.json();
        showAlert(`Assigned complaint ${assigningReq.requestId} to ${assignedTechName}.`, 'success');
        setShowAssignModal(false);
        setAssigningReq(null);
        fetchData();
      } else {
        showAlert('Failed to assign technician.', 'danger');
      }
    } catch (error) {
      showAlert('Error assigning technician.', 'danger');
    }
  };

  return (
    <div className="fade-in">

      {/* QUICK ASSIGN TECHNICIAN POPUP MODAL */}
      {showAssignModal && assigningReq && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill text-primary me-2"></i>
                  Assign Technician
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignModal(false)}
                ></button>
              </div>
              <form onSubmit={handleQuickAssignSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="small text-muted font-monospace fw-bold">{assigningReq.requestId}</div>
                    <strong className="d-block text-dark">{assigningReq.equipmentId?.name || assigningReq.equipmentId}</strong>
                    <span className="small text-muted">Reported by {assigningReq.reportedBy} ({assigningReq.department})</span>
                  </div>

                  <div>
                    <label className="form-label small fw-bold mb-1">Choose Technician to Assign *</label>
                    <select
                      className="form-select"
                      value={assignedTechName}
                      onChange={(e) => setAssignedTechName(e.target.value)}
                      required
                    >
                      <option value="">-- Select Technician --</option>
                      {techniciansList && techniciansList.length > 0 ? (
                        techniciansList.map(tech => (
                          <option key={tech._id || tech.name} value={tech.name}>
                            👤 {tech.name} {tech.department ? `(${tech.department})` : ''}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="John Mathew">👤 John Mathew</option>
                          <option value="Robert Downey">👤 Robert Downey</option>
                          <option value="Sarah Jenkins">👤 Sarah Jenkins</option>
                          <option value="Alice Vance">👤 Alice Vance</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="mt-3">
                    <label className="form-label small fw-bold mb-1">Assign Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      min={getTodayStr()}
                      value={assignDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        const today = getTodayStr();
                        if (val && val < today) {
                          showAlert('Previous dates cannot be selected. Reset to today.', 'warning');
                          setAssignDate(today);
                        } else {
                          setAssignDate(val);
                        }
                      }}
                    />
                  </div>

                  <div className="mt-3">
                    <label className="form-label small fw-bold mb-1">Status *</label>
                    <select
                      className="form-select bg-light text-dark fw-semibold"
                      value="Assigned"
                      disabled
                    >
                      <option value="Assigned">🟡 Assigned</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => { setShowAssignModal(false); setAssigningReq(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm px-4"
                    disabled={!assignedTechName}
                  >
                    <i className="bi bi-person-check-fill me-1"></i> Assign to {assignedTechName || 'Technician'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 1. REPORT ISSUE FORM */}
      {mode === 'report_form' && (
        <div className="card-clean" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h4 className="fw-bold mb-4" style={{ color: 'var(--light-text-main)' }}>Report Issue</h4>

          <form onSubmit={handleReportSubmit}>
            <div className="d-flex flex-column gap-4">
              <div>
                <label className="form-label small fw-bold">Select Equipment *</label>
                <select
                  className="form-select"
                  required
                  value={reportForm.equipmentId}
                  onChange={(e) => setReportForm(prev => ({ ...prev, equipmentId: e.target.value }))}
                >
                  <option value="">-- Choose Device --</option>
                  {equipmentList
                    .filter(eq => eq.status !== 'Retired' && (activeRole !== 'Staff' || !staffDepartment || eq.department?.toLowerCase() === staffDepartment?.toLowerCase()))
                    .map(eq => (
                      <option key={eq._id || eq.equipmentId || eq.equipment_id} value={eq.equipmentId || eq.equipment_id || eq._id}>
                        {eq.equipmentId || eq.equipment_id || eq._id} - {eq.name || eq.equipment_name} ({eq.department})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="form-label small fw-bold">Reported By *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="Enter your name"
                  value={reportForm.reportedBy}
                  onChange={(e) => setReportForm(prev => ({ ...prev, reportedBy: e.target.value }))}
                />
              </div>

              <div>
                <div className="d-flex justify-content-between">
                  <label className="form-label small fw-bold">Issue Description *</label>
                  <span className="text-muted small">{reportForm.issueDescription.length}/500</span>
                </div>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="TV not turning on."
                  required
                  maxLength="500"
                  value={reportForm.issueDescription}
                  onChange={(e) => setReportForm(prev => ({ ...prev, issueDescription: e.target.value }))}
                ></textarea>
              </div>

              <div>
                <label className="form-label small fw-bold">Priority *</label>
                <select
                  className="form-select"
                  value={reportForm.priority}
                  onChange={(e) => setReportForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-4 py-2"
                  onClick={() => {
                    if (forceMode === 'workorder') setMode('queue');
                    else onNavigate('dashboard');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-blue px-4 py-2"
                >
                  Submit Issue
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 2. ISSUE DETAILS SCREEN */}
      {mode === 'issue_details' && selectedRequest && (
        <div className="row g-4 justify-content-center">
          <div className="col-md-7 col-sm-12">
            <div className="card-clean h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold m-0" style={{ color: 'var(--light-text-main)' }}>Issue Details</h4>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    if (forceMode === 'report') onNavigate('dashboard');
                    else setMode('queue');
                  }}
                >
                  <i className="bi bi-arrow-left"></i> Back
                </button>
              </div>

              <div className="d-flex flex-column gap-3">
                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Issue ID</div>
                  <div className="col-8 font-monospace fw-bold">{selectedRequest.requestId}</div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Equipment</div>
                  <div className="col-8">
                    <strong>
                      {typeof selectedRequest.equipmentId === 'object' && selectedRequest.equipmentId !== null
                        ? (selectedRequest.equipmentId.name || selectedRequest.equipmentId.equipmentId || 'Equipment')
                        : (selectedRequest.equipmentId || 'Equipment')}
                    </strong>
                    <span className="d-block text-muted small font-monospace">
                      ({typeof selectedRequest.equipmentId === 'object' && selectedRequest.equipmentId !== null
                        ? selectedRequest.equipmentId.equipmentId
                        : (selectedRequest.equipmentId || 'N/A')})
                    </span>
                  </div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Reported By</div>
                  <div className="col-8">{selectedRequest.reportedBy}</div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Issue</div>
                  <div className="col-8">{selectedRequest.issueDescription}</div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Priority</div>
                  <div className="col-8">
                    <span className="priority-badge" style={getPriorityStyle(selectedRequest.priority)}>
                      {selectedRequest.priority}
                    </span>
                  </div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Status</div>
                  <div className="col-8">
                    <span className="status-badge" style={getStatusBadgeStyle(selectedRequest.status)}>
                      <i className="bi bi-circle-fill" style={{ fontSize: '0.45rem' }}></i>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Assigned Tech</div>
                  <div className="col-8 text-dark fw-semibold">
                    {selectedRequest.assignedTechnician || 'Unassigned'}
                  </div>
                </div>

                {selectedRequest.assignDate && (
                  <div className="row border-bottom pb-2">
                    <div className="col-4 text-muted small fw-bold text-uppercase">Assign Date</div>
                    <div className="col-8 font-monospace text-primary fw-semibold">
                      <i className="bi bi-calendar2-check me-1"></i>
                      {new Date(selectedRequest.assignDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}

                <div className="row border-bottom pb-2">
                  <div className="col-4 text-muted small fw-bold text-uppercase">Reported Date</div>
                  <div className="col-8 font-monospace">{formatDate(selectedRequest.createdAt)}</div>
                </div>

                {/* If Completed, show resolution */}
                {selectedRequest.status === 'Completed' && (
                  <div className="p-3 border rounded bg-light mt-2">
                    <h6 className="fw-bold mb-2 text-success"><i className="bi bi-check-circle-fill me-1"></i>Resolution Summary</h6>
                    <div className="row g-2 font-monospace small">
                      <div className="col-4 text-muted">Technician:</div>
                      <div className="col-8 text-dark">{selectedRequest.assignedTechnician || 'John Mathew'}</div>
                      <div className="col-4 text-muted">Repair Date:</div>
                      <div className="col-8 text-dark">{formatDate(selectedRequest.updatedAt)}</div>
                      <div className="col-4 text-muted">Repair Notes:</div>
                      <div className="col-8 text-dark text-wrap">{selectedRequest.managerNotes || 'Replaced power adapter and tested TV. Working fine now.'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons inside Card */}
              {selectedRequest.status !== 'Completed' && activeRole !== 'Staff' && (
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  {activeRole === 'Manager' && (
                    <button
                      className="btn btn-outline-primary px-3 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignModal(selectedRequest, e);
                      }}
                    >
                      <i className="bi bi-person-plus-fill me-1"></i> Assign Technician
                    </button>
                  )}
                  <button
                    className="btn btn-blue px-3 py-2"
                    onClick={() => {
                      setUpdateForm({
                        technician: selectedRequest.assignedTechnician || 'John Mathew',
                        status: 'Completed',
                        repairNotes: selectedRequest.managerNotes || '',
                        repairDate: new Date().toISOString().substring(0, 10)
                      });
                      setShowAssignModal(true);
                    }}
                  >
                    <i className="bi bi-wrench"></i> Maintenance &amp; Update
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MAINTENANCE & UPDATE ISSUE POPUP MODAL */}
      {showAssignModal && selectedRequest && !assigningReq && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header bg-light">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-wrench-adjustable-circle-fill text-primary me-2"></i>
                  Maintenance &amp; Update Issue ({selectedRequest.requestId})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignModal(false)}
                ></button>
              </div>

              <form onSubmit={handleUpdateStatusSubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded border mb-3">
                    <div className="small text-muted font-monospace fw-bold">{selectedRequest.requestId}</div>
                    <strong className="d-block text-dark">
                      {typeof selectedRequest.equipmentId === 'object' && selectedRequest.equipmentId !== null
                        ? (selectedRequest.equipmentId.name || selectedRequest.equipmentId.equipmentId || 'Equipment')
                        : (selectedRequest.equipmentId || 'Equipment')}
                    </strong>
                    <span className="small text-muted">Reported by {selectedRequest.reportedBy} ({selectedRequest.department})</span>
                  </div>

                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="form-label small fw-bold mb-1">
                        {selectedRequest.assignedTechnician ? 'Assigned Technician' : 'Technician *'}
                      </label>
                      {selectedRequest.assignedTechnician || activeRole === 'Technician' ? (
                        <div>
                          <div className="input-group">
                            <span className="input-group-text bg-light text-muted border-end-0">
                              <i className="bi bi-person-fill-lock"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control bg-light text-dark fw-semibold border-start-0"
                              value={selectedRequest.assignedTechnician || updateForm.technician || (currentUser?.name || 'Technician')}
                              disabled
                              readOnly
                            />
                          </div>
                          <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                            <i className="bi bi-lock-fill me-1 text-secondary"></i>
                            Assigned technician cannot be changed in update form.
                          </small>
                        </div>
                      ) : (
                        <select
                          className="form-select"
                          value={updateForm.technician || 'John Mathew'}
                          onChange={(e) => setUpdateForm(prev => ({ ...prev, technician: e.target.value }))}
                        >
                          {techniciansList && techniciansList.length > 0 ? (
                            techniciansList.map(tech => (
                              <option key={tech._id || tech.name} value={tech.name}>
                                👤 {tech.name} {tech.department ? `(${tech.department})` : ''}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="John Mathew">👤 John Mathew</option>
                              <option value="Robert Downey">👤 Robert Downey</option>
                              <option value="Sarah Jenkins">👤 Sarah Jenkins</option>
                              <option value="Alice Vance">👤 Alice Vance</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="form-label small fw-bold mb-1">Status *</label>
                      {activeRole === 'Manager' ? (
                        <select
                          className="form-select"
                          value="Completed"
                          disabled
                        >
                          <option value="Completed">🟢 Completed</option>
                        </select>
                      ) : (
                        <select
                          className="form-select"
                          value={updateForm.status || 'Completed'}
                          onChange={(e) => setUpdateForm(prev => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="Completed">🟢 Completed</option>
                          <option value="In Progress">🔵 In Progress</option>
                          <option value="Pending">🔴 Pending</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <div className="d-flex justify-content-between">
                        <label className="form-label small fw-bold mb-1">Repair Notes</label>
                        <span className="text-muted small">{(updateForm.repairNotes || '').length}/500</span>
                      </div>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter repair notes or inspection details..."
                        maxLength="500"
                        value={updateForm.repairNotes || ''}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, repairNotes: e.target.value }))}
                      ></textarea>
                    </div>

                    <div>
                      <label className="form-label small fw-bold mb-1">Repair Date</label>
                      <input
                        type="date"
                        className="form-control"
                        max={getTodayStr()}
                        value={updateForm.repairDate || getTodayStr()}
                        onChange={(e) => setUpdateForm(prev => ({ ...prev, repairDate: e.target.value }))}
                      />
                      <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-calendar-check me-1 text-secondary"></i>
                        Select today or a previous date (future dates not allowed).
                      </small>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-blue px-4"
                  >
                    Update Status
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. WORK ORDER QUEUE VIEW */}
      {mode === 'queue' && (
        <div className="card-clean">
          {/* Header row */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--light-text-main)' }}>Complaints</h4>
              <p className="text-muted small mb-0">Active reported complaints and repair requests</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-outline-purple d-flex align-items-center gap-2 px-3 py-2"
                onClick={() => onNavigate('history')}
                title="View Resolved Complaints & History"
              >
                <i className="bi bi-clock-history"></i> Complaints History
              </button>
              {activeRole !== 'Technician' && (
                <button
                  className="btn btn-blue d-flex align-items-center gap-2 px-3 py-2"
                  onClick={() => setMode('report_form')}
                >
                  <i className="bi bi-plus-lg"></i> Log Failures
                </button>
              )}
            </div>
          </div>

          {/* Filter controls — visible to Manager & Technician only */}
          {activeRole !== 'Staff' && (
            <div className="row g-2 mb-4">
              {/* Search */}
              <div className="col-md-5">
                <div className="d-flex align-items-center bg-light border rounded px-2 py-1 gap-2">
                  <i className="bi bi-search text-muted small"></i>
                  <input
                    type="text"
                    placeholder="Search by ID, reporter, equipment…"
                    className="border-0 bg-transparent w-100"
                    style={{ outline: 'none', fontSize: '0.85rem' }}
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                  />
                  {adminSearch && (
                    <button
                      className="btn p-0 text-muted"
                      style={{ lineHeight: 1, fontSize: '0.8rem' }}
                      onClick={() => setAdminSearch('')}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Department filter */}
              <div className="col-md-4">
                <select
                  className="form-select form-select-sm"
                  value={adminDeptFilter}
                  onChange={e => setAdminDeptFilter(e.target.value)}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>
                      {d === 'All' ? '🏥 All Departments' : d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="col-md-3">
                <select
                  className="form-select form-select-sm"
                  value={adminStatusFilter}
                  onChange={e => setAdminStatusFilter(e.target.value)}
                >
                  <option value="All">All Active Statuses</option>
                  <option value="Pending">🔴 Pending</option>
                  <option value="Assigned">🟡 Assigned</option>
                  <option value="In Progress">🔵 In Progress</option>
                  <option value="Cancelled">⚫ Cancelled</option>
                </select>
              </div>

              {/* Active filter pills */}
              {(adminDeptFilter !== 'All' || adminStatusFilter !== 'All' || adminSearch) && (
                <div className="col-12 d-flex align-items-center gap-2 flex-wrap">
                  <span className="text-muted small">
                    {getFilteredRequests().length} result{getFilteredRequests().length !== 1 ? 's' : ''}
                  </span>
                  {adminDeptFilter !== 'All' && (
                    <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 500, fontSize: '0.72rem' }}>
                      Dept: {adminDeptFilter}
                      <button className="btn p-0 ms-1" style={{ fontSize: '0.65rem', color: '#1d4ed8', lineHeight: 1 }} onClick={() => setAdminDeptFilter('All')}>
                        <i className="bi bi-x"></i>
                      </button>
                    </span>
                  )}
                  {adminStatusFilter !== 'All' && (
                    <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 500, fontSize: '0.72rem' }}>
                      Status: {adminStatusFilter}
                      <button className="btn p-0 ms-1" style={{ fontSize: '0.65rem', color: '#15803d', lineHeight: 1 }} onClick={() => setAdminStatusFilter('All')}>
                        <i className="bi bi-x"></i>
                      </button>
                    </span>
                  )}
                  <button
                    className="btn btn-link btn-sm p-0 text-muted text-decoration-none"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => { setAdminDeptFilter('All'); setAdminStatusFilter('All'); setAdminSearch(''); }}
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : getFilteredRequests().length === 0 ? (
            <div className="text-center py-5 text-muted border rounded">
              <i className="bi bi-tools fs-1 mb-2 d-block text-secondary"></i>
              <p className="mb-2">No active complaints matching role department filters.</p>
              <button
                className="btn btn-sm btn-outline-purple"
                onClick={() => onNavigate('history')}
              >
                <i className="bi bi-clock-history me-1"></i> View Resolved in Complaints History
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Equipment</th>
                    <th>Reported By</th>
                    <th>Department</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Reported Date</th>

                  </tr>
                </thead>
                <tbody>
                  {getFilteredRequests().map((req) => (
                    <tr
                      key={req._id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedRequest(req);
                        setMode('issue_details');
                      }}
                    >
                      <td className="font-monospace fw-bold">{req.requestId}</td>
                      <td>
                        <strong>
                          {typeof req.equipmentId === 'object' && req.equipmentId !== null
                            ? (req.equipmentId.name || req.equipmentId.equipmentId || 'Equipment')
                            : (req.equipmentId || 'Equipment')}
                        </strong>
                        <span className="text-muted font-monospace small d-block">
                          ID: {typeof req.equipmentId === 'object' && req.equipmentId !== null
                            ? req.equipmentId.equipmentId
                            : (req.equipmentId || 'N/A')}
                        </span>
                      </td>
                      <td>{req.reportedBy}</td>
                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1">{req.department}</span>
                      </td>
                      <td>
                        {req.assignedTechnician ? (
                          <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1">
                            <i className="bi bi-person-fill me-1"></i>{req.assignedTechnician}
                          </span>
                        ) : (
                          <span className="text-muted small fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className="priority-badge" style={getPriorityStyle(req.priority)}>
                          {req.priority}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge" style={getStatusBadgeStyle(req.status)}>
                          <i className="bi bi-circle-fill" style={{ fontSize: '0.45rem' }}></i>
                          {req.status}
                        </span>
                      </td>
                      <td className="font-monospace">{formatDate(req.createdAt)}</td>
                      {activeRole !== 'Staff' && (
                        <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>

                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default MaintenanceRequests;
