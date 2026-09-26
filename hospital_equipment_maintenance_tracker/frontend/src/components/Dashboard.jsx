import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { API_URL } from '../App';

const STATUS_COLORS = {
  'Working': '#10b981', // green
  'Faulty': '#ef4444', // vivid rose red
  'Under Maintenance': '#3b82f6' // deep blue
};

function Dashboard({ activeRole, onNavigate, currentUser, initialSubView, clearInitialSubView }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state inside Dashboard: 'metrics', 'due_list', 'perform_pm'
  const [subView, setSubView] = useState('metrics');
  const [inspectEqId, setInspectEqId] = useState('');
  
  // State for Perform Maintenance form
  const [selectedEqId, setSelectedEqId] = useState('');
  const [pmForm, setPmForm] = useState({
    serviceType: 'Preventive Maintenance',
    completedAt: new Date().toISOString().substring(0, 10),
    completedBy: currentUser?.name || 'Technician',
    actionTaken: '',
    partsReplaced: '',
    cost: '',
    downtimeHours: '1.0',
    notes: '',
    updatePmSchedule: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, reqRes, histRes] = await Promise.all([
        fetch(`${API_URL}/equipment`),
        fetch(`${API_URL}/requests`),
        fetch(`${API_URL}/requests/history/all`)
      ]);
      const eqData = await eqRes.json();
      const reqData = await reqRes.json();
      const histData = await histRes.json();

      setEquipmentList(Array.isArray(eqData) ? eqData : []);
      setRequestsList(Array.isArray(reqData) ? reqData : []);
      setHistoryList(Array.isArray(histData) ? histData : []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
      if (clearInitialSubView) {
        clearInitialSubView();
      }
    }
  }, [initialSubView]);

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedEqId) {
      alert('Please select an equipment asset.');
      return;
    }
    if (!pmForm.actionTaken.trim()) {
      alert('Please enter the maintenance work performed.');
      return;
    }

    try {
      const eq = equipmentList.find(item => 
        (item.equipmentId && item.equipmentId === selectedEqId) || 
        (item.equipment_id && item.equipment_id === selectedEqId) || 
        (item._id && item._id === selectedEqId)
      );
      if (!eq) {
        if (showAlert) showAlert('Selected equipment not found in inventory.', 'danger');
        else alert('Selected equipment not found.');
        return;
      }

      const costNum = Number(pmForm.cost) || 0;
      const downtimeNum = Number(pmForm.downtimeHours) || 0;

      const maintPayload = {
        actionTaken: pmForm.actionTaken.trim(),
        partsReplaced: pmForm.partsReplaced.trim() || 'None',
        cost: costNum,
        downtimeHours: downtimeNum,
        completedBy: pmForm.completedBy.trim() || currentUser?.name || 'Technician',
        notes: pmForm.notes.trim() || '',
        serviceType: pmForm.serviceType || 'Preventive Maintenance',
        updatePmSchedule: pmForm.updatePmSchedule !== false,
        completedAt: pmForm.completedAt ? new Date(pmForm.completedAt).toISOString() : new Date().toISOString()
      };

      const targetEqId = eq.equipmentId || eq.equipment_id || eq._id;
      const res = await fetch(`${API_URL}/equipment/${targetEqId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintPayload)
      });

      if (!res.ok) {
        const err = await res.json();
        if (showAlert) showAlert(err.message || 'Error saving maintenance record.', 'danger');
        else alert(err.message || 'Error saving maintenance record.');
        return;
      }

      if (showAlert) {
        showAlert('Maintenance log successfully recorded.', 'success');
      }

      // Reset state and reload
      setSelectedEqId('');
      setPmForm({
        serviceType: 'Preventive Maintenance',
        completedAt: new Date().toISOString().substring(0, 10),
        completedBy: currentUser?.name || 'Technician',
        actionTaken: '',
        partsReplaced: '',
        cost: '',
        downtimeHours: '1.0',
        notes: '',
        updatePmSchedule: true
      });
      setSubView('metrics');
      try {
        await fetchData();
      } catch (fErr) {
        console.warn('Background data refresh:', fErr);
      }
    } catch (error) {
      console.error('Error logging PM:', error);
      const errMsg = error.message || 'Error occurred while saving maintenance.';
      if (showAlert) {
        showAlert(errMsg, 'danger');
      } else {
        alert(errMsg);
      }
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper status converter
  const getDisplayStatus = (status) => {
    if (status === 'Operational') return 'Working';
    if (status === 'Broken') return 'Faulty';
    return status; // Under Maintenance, Retired
  };

  // 1. Calculations for metrics
  const totalEquipment = equipmentList.length;
  const workingCount = equipmentList.filter(eq => getDisplayStatus(eq.status) === 'Working').length;
  const faultyCount = equipmentList.filter(eq => getDisplayStatus(eq.status) === 'Faulty').length;
  const maintenanceCount = equipmentList.filter(eq => getDisplayStatus(eq.status) === 'Under Maintenance').length;

  // 2. PM Alerts Calculation
  const now = new Date();
  const pmDueList = equipmentList.map(eq => {
    const nextPm = new Date(eq.nextPreventiveMaintenance);
    const diffTime = nextPm - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'Upcoming';
    if (diffDays < 0) status = 'Overdue';
    else if (diffDays <= 7) status = 'Due Soon';

    return {
      ...eq,
      pmStatus: status,
      diffDays
    };
  }).filter(eq => eq.status !== 'Retired' && eq.diffDays <= 14);

  const overdueCount = pmDueList.filter(eq => eq.pmStatus === 'Overdue').length;
  const dueSoonCount = pmDueList.filter(eq => eq.pmStatus === 'Due Soon').length;

  // 3. Recharts Donut data
  const donutData = [
    { name: 'Working', value: workingCount },
    { name: 'Faulty', value: faultyCount },
    { name: 'Under Maintenance', value: maintenanceCount }
  ].filter(d => d.value > 0);

  // Status badges colors for PM list
  const getPmStatusBadgeStyle = (pmStatus) => {
    if (pmStatus === 'Overdue') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
    if (pmStatus === 'Due Soon') {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
  };

  // 4. Categories breakdown
  const categories = [...new Set(equipmentList.map(eq => eq.category || 'General'))];
  const categoryCounts = categories.map(cat => {
    const count = equipmentList.filter(eq => (eq.category || 'General') === cat).length;
    const percentage = Math.round((count / totalEquipment) * 100) || 0;
    return { name: cat, count, percentage };
  });

  // 5. Recent Complaints Actions Feed
  const complaintHistory = historyList
    .filter(h => h.requestId || (h.serviceType && (h.serviceType.toLowerCase().includes('repair') || h.serviceType.toLowerCase().includes('breakdown'))))
    .map(h => ({
      _id: h._id || h.requestId,
      requestId: h.requestId,
      equipmentId: h.equipmentId,
      actionText: h.actionTaken || 'Breakdown repair completed.',
      reportedBy: h.reportedBy,
      person: h.completedBy ? `Resolved by ${h.completedBy}` : (h.reportedBy ? `Reported by ${h.reportedBy}` : 'Staff'),
      department: h.department,
      status: h.status || 'Completed',
      date: h.completedAt || h.createdAt,
      cost: h.cost,
      isResolved: true
    }));

  const activeComplaints = requestsList.map(r => ({
    _id: r._id || r.requestId,
    requestId: r.requestId,
    equipmentId: typeof r.equipmentId === 'object' ? r.equipmentId?.equipmentId : r.equipmentId,
    actionText: r.issueDescription,
    reportedBy: r.reportedBy,
    person: r.assignedTechnician ? `Assigned to ${r.assignedTechnician}` : `Reported by ${r.reportedBy || 'Staff'}`,
    department: r.department,
    status: r.status || 'Pending',
    date: r.updatedAt || r.createdAt,
    cost: 0,
    isResolved: false
  }));

  const recentComplaints = [...activeComplaints, ...complaintHistory]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  // 6. Top 3 urgent overdue
  const urgentOverdue = pmDueList
    .filter(eq => eq.pmStatus === 'Overdue')
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 3);

  // 7. Equipment currently under maintenance
  const inMaintenanceEquipment = equipmentList.filter(eq => getDisplayStatus(eq.status) === 'Under Maintenance');

  // 8. Selected equipment for maintenance status inspector
  const inspectEq = equipmentList.find(e => e.equipmentId === inspectEqId || e._id === inspectEqId) ||
    inMaintenanceEquipment[0] ||
    pmDueList[0] ||
    equipmentList[0];

  const inspectEqPmStatus = inspectEq ? (() => {
    const nextPm = new Date(inspectEq.nextPreventiveMaintenance);
    const diffTime = nextPm - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'Overdue', label: `Overdue (${Math.abs(diffDays)}d)` };
    if (diffDays <= 7) return { status: 'Due Soon', label: `Due Soon (${diffDays}d)` };
    return { status: 'Upcoming', label: `Due in ${diffDays}d` };
  })() : { status: 'Upcoming', label: 'Up-to-Date' };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="text-muted mt-2">Compiling diagnostics and preventive metrics...</p>
      </div>
    );
  }

  return (
    <div className="fade-in">

      {/* SUBVIEW 1: METRICS DASHBOARD */}
      {subView === 'metrics' && (
        <div className="d-flex flex-column gap-4">
          

          {/* Metrics row */}
          <div className="row g-3">
            <div className="col-md-3 col-sm-6">
              <div className="metric-card-mock shadow-sm h-100 p-3 bg-white border rounded d-flex align-items-center gap-3">
                <div className="metric-card-icon-wrapper icon-wrapper-blue d-flex align-items-center justify-content-center rounded-circle" style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '1.25rem' }}>
                  <i className="bi bi-cpu-fill"></i>
                </div>
                <div className="flex-grow-1">
                  <span className="text-muted small fw-bold d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>TOTAL ASSETS</span>
                  <h3 className="fw-bold m-0 text-dark">{totalEquipment}</h3>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div className="progress-bar bg-blue" role="progressbar" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="metric-card-mock shadow-sm h-100 p-3 bg-white border rounded d-flex align-items-center gap-3">
                <div className="metric-card-icon-wrapper icon-wrapper-green d-flex align-items-center justify-content-center rounded-circle" style={{ width: '48px', height: '48px', backgroundColor: '#ecfdf5', color: '#10b981', fontSize: '1.25rem' }}>
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <div className="flex-grow-1">
                  <span className="text-muted small fw-bold d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>OPERATIONAL</span>
                  <h3 className="fw-bold m-0 text-success">{workingCount}</h3>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div className="progress-bar bg-success" role="progressbar" style={{ width: `${(workingCount / (totalEquipment || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="metric-card-mock shadow-sm h-100 p-3 bg-white border rounded d-flex align-items-center gap-3">
                <div className="metric-card-icon-wrapper icon-wrapper-orange d-flex align-items-center justify-content-center rounded-circle" style={{ width: '48px', height: '48px', backgroundColor: '#fff7ed', color: '#f97316', fontSize: '1.25rem' }}>
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div className="flex-grow-1">
                  <span className="text-muted small fw-bold d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>FAULTY DEVICES</span>
                  <h3 className="fw-bold m-0 text-danger">{faultyCount}</h3>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div className="progress-bar bg-danger" role="progressbar" style={{ width: `${(faultyCount / (totalEquipment || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3 col-sm-6">
              <div className="metric-card-mock shadow-sm h-100 p-3 bg-white border rounded d-flex align-items-center gap-3">
                <div className="metric-card-icon-wrapper icon-wrapper-blue d-flex align-items-center justify-content-center rounded-circle" style={{ width: '48px', height: '48px', backgroundColor: '#fef2f2', color: '#9333ea', fontSize: '1.25rem' }}>
                  <i className="bi bi-wrench-adjustable"></i>
                </div>
                <div className="flex-grow-1">
                  <span className="text-muted small fw-bold d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>IN MAINTENANCE</span>
                  <h3 className="fw-bold m-0 text-primary" style={{ color: '#9333ea' }}>{maintenanceCount}</h3>
                  <div className="progress mt-2" style={{ height: '4px' }}>
                    <div className="progress-bar" role="progressbar" style={{ width: `${(maintenanceCount / (totalEquipment || 1)) * 100}%`, backgroundColor: '#9333ea' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lower dashboard widgets row */}
          <div className="row g-4">
            
            {/* Left column widgets */}
            <div className="col-lg-7 col-md-12 d-flex flex-column gap-4">
              
              {/* Maintenance Alerts Card */}
              <div className="card-clean d-flex flex-column justify-content-between mb-0">
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold m-0 text-dark"><i className="bi bi-bell-fill text-danger me-2"></i>Maintenance Status</h5>
                    <div className="d-flex gap-2">
                      {inMaintenanceEquipment.length > 0 && (
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 small" style={{ color: '#9333ea', borderColor: '#d8b4fe' }}>
                          {inMaintenanceEquipment.length} In Maintenance
                        </span>
                      )}
                      <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2 py-1 small">{overdueCount} Overdue</span>
                      <span className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-2 py-1 small" style={{ color: '#d97706', borderColor: '#fcd34d' }}>{dueSoonCount} Due Soon</span>
                    </div>
                  </div>
                  
                  {overdueCount > 0 ? (
                    <div className="p-3 border border-danger border-opacity-25 rounded bg-danger bg-opacity-10 d-flex align-items-center gap-3 mb-3">
                      <div className="fs-1 text-danger"><i className="bi bi-exclamation-triangle"></i></div>
                      <div>
                        <h3 className="fw-bold m-0 text-danger">{overdueCount === 1 ? '1 Device Overdue' : `${overdueCount} Devices Overdue`}</h3>
                        <span className="text-muted small">Preventive maintenance is overdue for these hardware assets.</span>
                      </div>
                    </div>
                  ) : null}

                  {dueSoonCount > 0 ? (
                    <div className="p-3 border border-warning border-opacity-25 rounded bg-warning bg-opacity-10 d-flex align-items-center gap-3 mb-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                      <div className="fs-1" style={{ color: '#d97706' }}><i className="bi bi-clock-history"></i></div>
                      <div>
                        <h3 className="fw-bold m-0" style={{ color: '#b45309' }}>{dueSoonCount === 1 ? '1 Device Due Soon' : `${dueSoonCount} Devices Due Soon`}</h3>
                        <span className="text-muted small">Upcoming maintenance scheduled within the next 7 days.</span>
                      </div>
                    </div>
                  ) : null}

                  {overdueCount === 0 && dueSoonCount === 0 && inMaintenanceEquipment.length === 0 && (
                    <div className="p-3 border border-success border-opacity-25 rounded bg-success bg-opacity-10 d-flex align-items-center gap-3 mb-3">
                      <div className="fs-1 text-success"><i className="bi bi-check-circle"></i></div>
                      <div>
                        <h3 className="fw-bold m-0 text-success">All Scheduled PMs Up-to-date</h3>
                        <span className="text-muted small">No preventive maintenance due within the next 7 days.</span>
                      </div>
                    </div>
                  )}

                  {/* Hardware Currently Under Maintenance list */}
                  {inMaintenanceEquipment.length > 0 && (
                    <div className="mt-3">
                      <span className="text-muted small fw-bold d-block mb-2" style={{ color: '#9333ea' }}>
                        <i className="bi bi-wrench-adjustable me-1"></i>HARDWARE CURRENTLY UNDER MAINTENANCE
                      </span>
                      <div className="d-flex flex-column gap-2">
                        {inMaintenanceEquipment.slice(0, 3).map(eq => (
                          <div key={eq._id} className="d-flex align-items-center justify-content-between p-2 border rounded bg-light hover-bg" style={{ transition: 'all 0.2s' }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge py-1 text-white" style={{ fontSize: '0.68rem', backgroundColor: '#9333ea' }}>
                                Under Maintenance
                              </span>
                              <span className="small fw-bold">{eq.name}</span>
                              <span className="text-muted small">({eq.department})</span>
                            </div>
                            <span className="text-muted font-monospace small">{eq.equipmentId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Urgent Overdue list */}
                  {urgentOverdue.length > 0 && (
                    <div className="mt-3">
                      <span className="text-muted small fw-bold d-block mb-2 text-danger">CRITICAL OVERDUE HARDWARE</span>
                      <div className="d-flex flex-column gap-2">
                        {urgentOverdue.map(eq => (
                          <div key={eq._id} className="d-flex align-items-center justify-content-between p-2 border rounded bg-light hover-bg" style={{ transition: 'all 0.2s' }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-danger py-1" style={{ fontSize: '0.68rem' }}>{Math.abs(eq.diffDays)} days late</span>
                              <span className="small fw-bold">{eq.name}</span>
                            </div>
                            <span className="text-muted font-monospace small">{eq.equipmentId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Due Soon list */}
                  {pmDueList.filter(eq => eq.pmStatus === 'Due Soon').length > 0 && (
                    <div className="mt-3">
                      <span className="text-muted small fw-bold d-block mb-2" style={{ color: '#b45309' }}>UPCOMING PM (NEXT 7 DAYS)</span>
                      <div className="d-flex flex-column gap-2">
                        {pmDueList.filter(eq => eq.pmStatus === 'Due Soon').sort((a, b) => a.diffDays - b.diffDays).slice(0, 3).map(eq => (
                          <div key={eq._id} className="d-flex align-items-center justify-content-between p-2 border rounded bg-light hover-bg" style={{ transition: 'all 0.2s' }}>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge py-1 text-dark" style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#d97706' }}>
                                {eq.diffDays === 0 ? 'Today' : `in ${eq.diffDays} days`}
                              </span>
                              <span className="small fw-bold">{eq.name}</span>
                            </div>
                            <span className="text-muted font-monospace small">{eq.equipmentId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  className="btn btn-purple mt-4 w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setSubView('due_list')}
                >
                  <i className="bi bi-calendar-event"></i> Manage Schedules & Due List
                </button>
              </div>

              {/* Equipment Maintenance Status Inspector Spotlight Card */}
              {inspectEq && (
                <div className="card-clean mb-0 shadow-sm border">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h5 className="fw-bold m-0 text-dark">
                      <i className="bi bi-cpu-fill text-primary me-2"></i>Equipment Maintenance Status
                    </h5>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Asset:</span>
                      <select 
                        className="form-select form-select-sm font-monospace" 
                        style={{ maxWidth: '240px' }}
                        value={inspectEq.equipmentId}
                        onChange={(e) => setInspectEqId(e.target.value)}
                      >
                        {equipmentList.map(eq => (
                          <option key={eq._id || eq.equipmentId || eq.equipment_id} value={eq.equipmentId || eq.equipment_id || eq._id}>
                            {eq.equipmentId || eq.equipment_id || eq._id} - {eq.name || eq.equipment_name} ({getDisplayStatus(eq.status)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-3 border rounded bg-white shadow-xs">
                    <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h6 className="fw-bold text-dark m-0 fs-6">{inspectEq.name}</h6>
                          <span className="badge bg-light text-dark font-monospace border px-2 py-0.5">{inspectEq.equipmentId}</span>
                          <span className="badge bg-light text-secondary border px-2 py-0.5">{inspectEq.department}</span>
                        </div>
                        <span className="text-muted small font-monospace d-block" style={{ fontSize: '0.73rem' }}>
                          {inspectEq.manufacturer} &bull; Model: {inspectEq.model} &bull; Room {inspectEq.location}
                        </span>
                      </div>
                      
                      <div className="d-flex gap-2">
                        <span 
                          className="status-badge" 
                          style={
                            getDisplayStatus(inspectEq.status) === 'Working'
                              ? { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' }
                              : getDisplayStatus(inspectEq.status) === 'Under Maintenance'
                              ? { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }
                              : { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }
                          }
                        >
                          <i className="bi bi-circle-fill" style={{ fontSize: '0.45rem' }}></i>
                          {getDisplayStatus(inspectEq.status)}
                        </span>
                        <span className="status-badge" style={getPmStatusBadgeStyle(inspectEqPmStatus.status)}>
                          {inspectEqPmStatus.label}
                        </span>
                      </div>
                    </div>

                    <div className="row g-2 text-muted small font-monospace border-top pt-2" style={{ fontSize: '0.78rem' }}>
                      <div className="col-sm-6">
                        <i className="bi bi-calendar-event text-primary me-1"></i>
                        Next Due PM: <strong className="text-dark">{formatDate(inspectEq.nextPreventiveMaintenance)}</strong>
                      </div>
                      <div className="col-sm-6">
                        <i className="bi bi-shield-check text-success me-1"></i>
                        Warranty Expiry: <strong className="text-dark">{formatDate(inspectEq.warrantyExpiration)}</strong>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <span className="text-muted small font-monospace" style={{ fontSize: '0.7rem' }}>
                        PM Frequency: <strong>{inspectEq.pmFrequency || 'Quarterly'}</strong>
                      </span>
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-xs btn-outline-secondary py-1 px-2.5 font-monospace"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => onNavigate && onNavigate('maintenance_history')}
                        >
                          <i className="bi bi-clock-history me-1"></i> View History
                        </button>
                        <button 
                          className="btn btn-xs btn-purple py-1 px-2.5 font-monospace"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedEqId(inspectEq.equipmentId);
                            setSubView('perform_pm');
                          }}
                        >
                          <i className="bi bi-wrench me-1"></i> Perform Maintenance
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Complaints Actions Feed Card */}
              <div className="card-clean mb-0">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold m-0 text-dark">
                    <i className="bi bi-clock-history text-primary me-2"></i>Recent Complaints Actions
                  </h5>
                  <button 
                    className="btn btn-sm btn-outline-purple"
                    onClick={() => onNavigate('complaints_history')}
                    title="View All Resolved Complaints"
                  >
                    View Complaints History →
                  </button>
                </div>
                
                {recentComplaints.length === 0 ? (
                  <div className="text-muted small py-4 text-center">
                    <i className="bi bi-clipboard2-check fs-2 d-block mb-1 text-secondary"></i>
                    No recent complaints actions found.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {recentComplaints.map(act => {
                      const eq = equipmentList.find(e => e.equipmentId === act.equipmentId || e._id === act.equipmentId);
                      const eqName = eq ? eq.name : act.equipmentId;

                      return (
                        <div key={act._id || Math.random()} className="d-flex justify-content-between align-items-start p-3 border rounded bg-white shadow-xs">
                          <div className="d-flex gap-3 align-items-start">
                            <div 
                              className="d-flex align-items-center justify-content-center rounded" 
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                fontSize: '1.2rem', 
                                flexShrink: 0,
                                backgroundColor: act.status === 'Completed' ? '#ecfdf5' : act.status === 'In Progress' ? '#eff6ff' : '#fff7ed',
                                color: act.status === 'Completed' ? '#10b981' : act.status === 'In Progress' ? '#2563eb' : '#ea580c'
                              }}
                            >
                              <i className={`bi ${act.status === 'Completed' ? 'bi-check-circle-fill' : act.status === 'In Progress' ? 'bi-wrench' : 'bi-exclamation-circle-fill'}`}></i>
                            </div>
                            <div>
                              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.88rem' }}>{eqName}</h6>
                                <span className="text-muted font-monospace small" style={{ fontSize: '0.72rem' }}>({act.equipmentId})</span>
                                {act.department && (
                                  <span className="badge bg-light text-secondary border px-1.5 py-0.5" style={{ fontSize: '0.65rem' }}>
                                    {act.department}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted mb-1 small" style={{ fontSize: '0.78rem', lineHeight: '1.35' }}>{act.actionText}</p>
                              <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                {act.person} • {formatDate(act.date)}
                              </span>
                            </div>
                          </div>
                          <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0 ms-2">
                            <span 
                              className="badge rounded-pill px-2 py-1"
                              style={{
                                fontSize: '0.7rem',
                                backgroundColor: act.status === 'Completed' ? '#dcfce7' : act.status === 'In Progress' ? '#dbeafe' : '#ffedd5',
                                color: act.status === 'Completed' ? '#15803d' : act.status === 'In Progress' ? '#1e40af' : '#c2410c',
                                border: `1px solid ${act.status === 'Completed' ? '#bbf7d0' : act.status === 'In Progress' ? '#bfdbfe' : '#fed7aa'}`
                              }}
                            >
                              {act.status}
                            </span>
                            {act.cost > 0 && (
                              <span className="badge bg-light text-success border border-success border-opacity-25 px-1.5 py-0.5 font-monospace" style={{ fontSize: '0.7rem' }}>
                                ${act.cost}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right column widgets */}
            <div className="col-lg-5 col-md-12 d-flex flex-column gap-4">
              
              {/* Equipment Status Donut chart */}
              <div className="card-clean mb-0">
                <h5 className="fw-bold mb-3 text-dark"><i className="bi bi-pie-chart-fill text-info me-2"></i>Asset Health Distribution</h5>
                
                <div className="d-flex flex-column align-items-center justify-content-center gap-3">
                  <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '180px', height: '180px' }}>
                    <div style={{ width: '100%', height: '100%' }}>
                      {donutData.length === 0 ? (
                        <div className="text-muted small text-center pt-5">No active assets.</div>
                      ) : (
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={62}
                              outerRadius={78}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {donutData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={STATUS_COLORS[entry.name]} 
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    {donutData.length > 0 && (
                      <div className="position-absolute text-center d-flex flex-column justify-content-center align-items-center" style={{ pointerEvents: 'none' }}>
                        <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>Operational</span>
                        <h4 className="fw-bold m-0 text-success" style={{ fontSize: '1.25rem' }}>
                          {Math.round((workingCount / (totalEquipment || 1)) * 100)}%
                        </h4>
                        <span className="text-muted" style={{ fontSize: '0.62rem' }}>{workingCount}/{totalEquipment} Devices</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Legend listing percentages */}
                  <div className="d-flex flex-column gap-2 w-100 border-top pt-3">
                    {donutData.map((d, index) => {
                      const percentage = Math.round((d.value / (totalEquipment || 1)) * 100) || 0;
                      let badgeClass = 'bg-success';
                      if (d.name === 'Faulty') badgeClass = 'bg-danger';
                      if (d.name === 'Under Maintenance') badgeClass = 'bg-primary';
                      return (
                        <div key={index} className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <span className={`rounded-circle ${badgeClass}`} style={{ width: '8px', height: '8px', display: 'inline-block' }}></span>
                            <span className="small fw-semibold">{d.name}</span>
                          </div>
                          <span className="small font-monospace fw-bold">{d.value} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Categories breakdown Card */}
              <div className="card-clean mb-0">
                <h5 className="fw-bold mb-3 text-dark"><i className="bi bi-tags-fill text-primary me-2"></i>Equipment Category Spread</h5>
                <div className="d-flex flex-column gap-3">
                  {categoryCounts.map((cat, index) => (
                    <div key={index}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-bold">{cat.name}</span>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>{cat.count} devices</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar" 
                          role="progressbar" 
                          style={{ width: `${cat.percentage}%`, background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUBVIEW 2: MAINTENANCE DUE LIST */}
      {subView === 'due_list' && (
        <div className="card-clean">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--light-text-main)' }}>Maintenance Due</h4>
              <p className="text-muted small mb-0">Scheduled preventive maintenance dates</p>
            </div>
            
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setSubView('metrics')}>
                <i className="bi bi-arrow-left"></i> Back to Dashboard
              </button>
              <button 
                className="btn btn-purple btn-sm"
                onClick={() => {
                  setSelectedEqId('');
                  setSubView('perform_pm');
                }}
              >
                <i className="bi bi-wrench"></i> Perform Maintenance
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Equipment</th>
                  <th>Last Maintenance</th>
                  <th>Next Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pmDueList.map(eq => (
                  <tr key={eq._id}>
                    <td className="font-monospace fw-bold">{eq.equipmentId}</td>
                    <td>
                      <strong>{eq.name}</strong>
                      <span className="text-muted small d-block">{eq.department} &bull; Room {eq.location}</span>
                    </td>
                    <td className="font-monospace">{formatDate(eq.installationDate)}</td>
                    <td className="font-monospace">{formatDate(eq.nextPreventiveMaintenance)}</td>
                    <td>
                      <span className="status-badge" style={getPmStatusBadgeStyle(eq.pmStatus)}>
                        {eq.pmStatus}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-xs btn-outline-purple py-1 px-2 font-monospace"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => {
                          setSelectedEqId(eq.equipmentId);
                          setSubView('perform_pm');
                        }}
                      >
                        Perform PM
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: PERFORM MAINTENANCE FORM */}
      {subView === 'perform_pm' && (
        <div className="card-clean shadow-sm" style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
            <div className="d-flex align-items-center gap-3">
              <div 
                className="d-flex align-items-center justify-content-center rounded-circle" 
                style={{ width: '44px', height: '44px', backgroundColor: '#faf5ff', color: '#9333ea', fontSize: '1.3rem' }}
              >
                <i className="bi bi-tools"></i>
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-dark">Perform Equipment Maintenance</h4>
                <p className="text-muted small mb-0">Record preventive maintenance, calibration, parts replaced, and costs</p>
              </div>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
              onClick={() => setSubView('due_list')}
            >
              <i className="bi bi-arrow-left"></i> Back to Due List
            </button>
          </div>

          <form onSubmit={handleSaveMaintenance}>
            {/* Equipment Selection */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-dark mb-1">Select Equipment Asset *</label>
              <select 
                className="form-select"
                required
                value={selectedEqId}
                onChange={(e) => setSelectedEqId(e.target.value)}
              >
                <option value="">-- Choose Equipment --</option>
                {equipmentList
                  .filter(eq => eq.status !== 'Retired')
                  .map(eq => (
                    <option key={eq._id || eq.equipmentId || eq.equipment_id} value={eq.equipmentId || eq.equipment_id || eq._id}>
                      {eq.equipmentId || eq.equipment_id || eq._id} — {eq.name || eq.equipment_name} ({eq.department})
                    </option>
                  ))}
              </select>

              {/* Selected Equipment Details Preview Card */}
              {(() => {
                const selectedEq = equipmentList.find(e => e.equipmentId === selectedEqId || e.equipment_id === selectedEqId || e._id === selectedEqId);
                if (!selectedEq) return null;
                const nextPm = new Date(selectedEq.nextPreventiveMaintenance);
                const diffTime = nextPm - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isDueSoon = diffDays >= 0 && diffDays <= 14;

                return (
                  <div className="p-3 bg-light border rounded mt-2.5">
                    <div className="row g-2 align-items-center small">
                      <div className="col-md-3 col-6">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>DEPARTMENT</span>
                        <strong>{selectedEq.department}</strong>
                        <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>{selectedEq.location || 'Main Floor'}</span>
                      </div>
                      <div className="col-md-3 col-6">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>MODEL &amp; MAKER</span>
                        <strong className="text-truncate d-block">{selectedEq.manufacturer || 'N/A'} {selectedEq.model || ''}</strong>
                      </div>
                      <div className="col-md-3 col-6">
                        <span className="text-muted d-block" style={{ fontSize: '0.68rem' }}>PM SCHEDULE</span>
                        <strong>{selectedEq.pmFrequency || 'Quarterly'}</strong>
                        <span className="d-block text-muted font-monospace" style={{ fontSize: '0.68rem' }}>Due: {formatDate(selectedEq.nextPreventiveMaintenance)}</span>
                      </div>
                      <div className="col-md-3 col-6 text-md-end">
                        <span 
                          className="badge px-2 py-1 rounded-pill"
                          style={{
                            fontSize: '0.72rem',
                            backgroundColor: isOverdue ? '#fee2e2' : isDueSoon ? '#fef3c7' : '#dcfce7',
                            color: isOverdue ? '#991b1b' : isDueSoon ? '#92400e' : '#166534',
                            border: `1px solid ${isOverdue ? '#fca5a5' : isDueSoon ? '#fde68a' : '#bbf7d0'}`
                          }}
                        >
                          {isOverdue ? `Overdue (${Math.abs(diffDays)}d)` : isDueSoon ? `Due in ${diffDays}d` : 'Up-to-Date'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="row g-3">
              {/* Service Type */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Service Type *</label>
                <select 
                  className="form-select"
                  value={pmForm.serviceType}
                  onChange={(e) => setPmForm({ ...pmForm, serviceType: e.target.value })}
                  required
                >
                  <option value="Preventive Maintenance">🛡️ Preventive Maintenance (PM)</option>
                  <option value="Calibration">⚖️ Calibration</option>
                  <option value="Safety Inspection">🔍 Safety Inspection</option>
                  <option value="Routine Service">⚙️ Routine Service</option>
                  <option value="Part Replacement">🔩 Part Replacement</option>
                  <option value="Repair">🔧 Overhaul &amp; Breakdown Repair</option>
                </select>
              </div>

              {/* Maintenance Date */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Maintenance Date *</label>
                <input 
                  type="date" 
                  className="form-control"
                  required
                  value={pmForm.completedAt}
                  onChange={(e) => setPmForm({ ...pmForm, completedAt: e.target.value })}
                />
              </div>

              {/* Technician */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Technician / Serviced By *</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-person-badge text-muted"></i></span>
                  <input 
                    type="text" 
                    className="form-control"
                    required
                    placeholder="e.g. John Mathew"
                    value={pmForm.completedBy}
                    onChange={(e) => setPmForm({ ...pmForm, completedBy: e.target.value })}
                  />
                </div>
              </div>

              {/* Downtime Hours */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Downtime Duration</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-clock text-muted"></i></span>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0"
                    className="form-control"
                    placeholder="1.0"
                    value={pmForm.downtimeHours}
                    onChange={(e) => setPmForm({ ...pmForm, downtimeHours: e.target.value })}
                  />
                  <span className="input-group-text bg-white text-muted small">Hours</span>
                </div>
              </div>

              {/* Maintenance Cost ($) */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Maintenance Cost ($)</label>
                <div className="input-group">
                  <span className="input-group-text bg-white fw-bold text-success">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="0.00"
                    value={pmForm.cost}
                    onChange={(e) => setPmForm({ ...pmForm, cost: e.target.value })}
                  />
                  <span className="input-group-text bg-white text-muted small">USD</span>
                </div>
                <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                  Total cost of service, labor, or parts incurred
                </div>
              </div>

              {/* Parts Replaced */}
              <div className="col-md-6">
                <label className="form-label small fw-bold text-dark mb-1">Parts Replaced (if any)</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-gear text-muted"></i></span>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. Battery Pack, Optical Sensors, or None"
                    value={pmForm.partsReplaced}
                    onChange={(e) => setPmForm({ ...pmForm, partsReplaced: e.target.value })}
                  />
                </div>
                <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                  List component spares replaced during this servicing
                </div>
              </div>

              {/* Work Performed / Action Taken */}
              <div className="col-12">
                <label className="form-label small fw-bold text-dark mb-1">Work Performed / Diagnostic Actions *</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  placeholder="Describe maintenance checklist performed, calibrations tested, adjustments made, sensors cleaned..."
                  required
                  value={pmForm.actionTaken}
                  onChange={(e) => setPmForm({ ...pmForm, actionTaken: e.target.value })}
                ></textarea>
              </div>

              {/* Additional Notes */}
              <div className="col-12">
                <label className="form-label small fw-bold text-dark mb-1">Technician Notes &amp; Observations (Optional)</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  placeholder="Additional remarks on hardware condition, safety warnings, or follow-up recommendations..."
                  value={pmForm.notes}
                  onChange={(e) => setPmForm({ ...pmForm, notes: e.target.value })}
                ></textarea>
              </div>

              {/* PM Schedule Advance Toggle */}
              <div className="col-12">
                <div className="p-3 border rounded bg-light d-flex align-items-center justify-content-between">
                  <div>
                    <strong className="d-block text-dark small">Advance Preventive Maintenance Schedule</strong>
                    <span className="text-muted small">
                      Automatically calculate and update the equipment's Next PM Due Date based on its maintenance frequency cycle.
                    </span>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      role="switch"
                      style={{ cursor: 'pointer', width: '2.5rem', height: '1.25rem' }}
                      checked={pmForm.updatePmSchedule}
                      onChange={(e) => setPmForm({ ...pmForm, updatePmSchedule: e.target.checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Form Actions */}
            <div className="d-flex justify-content-end align-items-center gap-2 mt-4 pt-3 border-top">
              <button 
                type="button" 
                className="btn btn-outline-secondary px-4 py-2"
                onClick={() => setSubView('due_list')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-purple px-4 py-2 d-flex align-items-center gap-2 shadow-sm"
              >
                <i className="bi bi-check-circle-fill"></i> Save Maintenance &amp; Update History
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
