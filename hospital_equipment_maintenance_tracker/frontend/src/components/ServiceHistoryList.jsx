// Import core React hooks: useState for local state management, useEffect for side-effects
import React, { useState, useEffect } from 'react';
// Import base API URL constant from App component for network requests
import { API_URL } from '../App';
// Import Reports sub-component for generating analytics & summary reports
import Reports from './Reports';

// Main functional component for displaying and managing Service & Maintenance history
function ServiceHistoryList({ activeRole, staffDepartment, currentUser, viewMode = 'maintenance', onNavigate }) {
  // State storing all maintenance service history records fetched from backend
  const [historyList, setHistoryList] = useState([]);
  // State storing all equipment items fetched from backend
  const [equipmentList, setEquipmentList] = useState([]);
  // Loading status indicator state during async fetch operations
  const [loading, setLoading] = useState(true);
  // Search query text entered by the user in filter input
  const [searchTerm, setSearchTerm] = useState('');
  // Selected category filter (e.g., 'All', 'Medical', 'Electronic', 'IT')
  const [selectedCategory, setSelectedCategory] = useState('All');
  // Selected department filter (e.g., 'All', 'ICU', 'Radiology', etc.)
  const [selectedDept, setSelectedDept] = useState('All');
  // Selected service type filter (e.g., 'Preventive Maintenance', 'Repair', etc.)
  const [serviceTypeFilter, setServiceTypeFilter] = useState('All');
  // Selected Preventive Maintenance status filter ('Up-to-Date', 'Due Soon', 'Overdue')
  const [pmStatusFilter, setPmStatusFilter] = useState('All');

  // Active sub-tab state under Maintenance View: 'registry' (equipment list) | 'logs' (all service logs) | 'reports' (report builder)
  const [maintenanceSubTab, setMaintenanceSubTab] = useState('registry');

  // Currently selected equipment object to display details in the history modal
  const [selectedEquipmentForModal, setSelectedEquipmentForModal] = useState(null);
  // Array of history log entries for the modal's target equipment
  const [equipmentHistoryLogs, setEquipmentHistoryLogs] = useState([]);
  // Loading spinner state specifically for fetching timeline modal history logs
  const [loadingHistoryModal, setLoadingHistoryModal] = useState(false);

  // Visibility toggle for the "Record Maintenance" modal form
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  // Form input state object for logging a new maintenance event
  const [recordForm, setRecordForm] = useState({
    equipmentId: '', // Target equipment asset identifier
    serviceType: 'Preventive Maintenance', // Selected maintenance type
    actionTaken: '', // Diagnostic description or work done
    partsReplaced: '', // List of replaced components/spares
    cost: '', // Maintenance expenditure amount in USD
    downtimeHours: '', // Equipment downtime in hours
    completedBy: currentUser?.name || 'Technician', // Servicing technician name
    notes: '', // Additional maintenance notes
    updatePmSchedule: true // Flag to automatically push forward next PM date
  });
  // Submitting spinner state during maintenance record form submission
  const [submittingRecord, setSubmittingRecord] = useState(false);
  // Alert toast message state for user feedback alerts ({ type: 'success'|'danger', message: string })
  const [feedbackAlert, setFeedbackAlert] = useState(null);

  // Boolean flag indicating if current view mode is 'complaints' history vs 'maintenance' history
  const isComplaintsMode = viewMode === 'complaints';

  // Async function to fetch both service history and equipment list concurrently from API
  const fetchData = async () => {
    try {
      // Set loading status to true before starting API calls
      setLoading(true);
      // Fetch both history endpoint and equipment endpoint simultaneously using Promise.all
      const [histRes, eqRes] = await Promise.all([
        fetch(`${API_URL}/requests/history/all`), // API call for resolved history logs
        fetch(`${API_URL}/equipment`) // API call for all equipment assets
      ]);
      
      // Parse JSON response for history logs
      const histData = await histRes.json();
      // Parse JSON response for equipment list
      const eqData = await eqRes.json();

      // Ensure response is an array before setting state, fallback to empty array
      setHistoryList(Array.isArray(histData) ? histData : []);
      // Ensure response is an array before setting state, fallback to empty array
      setEquipmentList(Array.isArray(eqData) ? eqData : []);
    } catch (error) {
      // Log error to console if fetch fails
      console.error('Error fetching service history:', error);
      // Reset state lists to empty array on failure
      setHistoryList([]);
      setEquipmentList([]);
    } finally {
      // Turn off loading indicator regardless of success or failure
      setLoading(false);
    }
  };

  // Trigger data fetch and reset default subtab whenever viewMode or activeRole changes
  useEffect(() => {
    // Call main data loader
    fetchData();
    // Reset default sub-tab to 'registry' view
    setMaintenanceSubTab('registry');
  }, [viewMode, activeRole]); // Dependency array watching viewMode and activeRole

  // Helper function to evaluate Preventive Maintenance (PM) status and badge styling for equipment
  const getPmStatusInfo = (nextPmDate) => {
    // If no PM date is defined for the equipment, return default "Not Scheduled" metadata
    if (!nextPmDate) {
      return { status: 'Not Scheduled', label: 'Not Scheduled', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
    }
    // Get current date object
    const today = new Date();
    // Parse target PM due date string into Date object
    const target = new Date(nextPmDate);
    // Calculate difference in milliseconds between target date and current date
    const diffTime = target.getTime() - today.getTime();
    // Convert time difference from milliseconds to total remaining/overdue days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If remaining days is negative, equipment PM is overdue
    if (diffDays < 0) {
      return { status: 'Overdue', label: `Overdue (${Math.abs(diffDays)}d)`, color: '#b91c1c', bg: '#fee2e2', border: '#fecaca', diffDays };
    // If PM due date is within 14 days, return warning status "Due Soon"
    } else if (diffDays <= 14) {
      return { status: 'Due Soon', label: `Due in ${diffDays}d`, color: '#b45309', bg: '#fef3c7', border: '#fde68a', diffDays };
    }
    // Otherwise, PM is up to date
    return { status: 'Up-to-Date', label: `Due in ${diffDays}d`, color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', diffDays };
  };

  // Helper utility to format ISO date strings into DD-MM-YYYY format
  const formatDate = (dateStr) => {
    // Return N/A if date string is missing or null
    if (!dateStr) return 'N/A';
    // Instantiate Date object from string
    const d = new Date(dateStr);
    // Return N/A if date parsing produced NaN (invalid date)
    if (isNaN(d.getTime())) return 'N/A';
    // Format day with leading zero if single digit
    const day = String(d.getDate()).padStart(2, '0');
    // Format month (0-indexed) with leading zero if single digit
    const month = String(d.getMonth() + 1).padStart(2, '0');
    // Extract 4-digit year
    const year = d.getFullYear();
    // Return formatted date string
    return `${day}-${month}-${year}`;
  };

  // Helper utility to return color theme, icon, and label for service type badges
  const getServiceTypeBadge = (type) => {
    // Normalize type string to lowercase for case-insensitive matching
    const t = (type || 'Routine Service').toLowerCase();
    // Check if service type is Preventive Maintenance
    if (t.includes('preventive')) {
      return { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe', icon: 'bi-shield-check', label: 'Preventive (PM)' };
    }
    // Check if service type is Calibration
    if (t.includes('calibration')) {
      return { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', icon: 'bi-sliders', label: 'Calibration' };
    }
    // Check if service type is Safety Inspection
    if (t.includes('safety') || t.includes('inspection')) {
      return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: 'bi-check2-circle', label: 'Safety Inspection' };
    }
    // Check if service type is Part Replacement
    if (t.includes('part') || t.includes('replacement')) {
      return { bg: '#fff7ed', color: '#9a3412', border: '#ffedd5', icon: 'bi-gear-wide-connected', label: 'Part Replacement' };
    }
    // Check if service type is Breakdown Repair
    if (t.includes('repair')) {
      return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', icon: 'bi-wrench', label: 'Breakdown Repair' };
    }
    // Fallback default badge properties for generic routine service
    return { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0', icon: 'bi-tools', label: type || 'Routine Service' };
  };

  // Async event handler to fetch timeline history for a specific equipment when clicked
  const handleOpenEquipmentHistory = async (equipment) => {
    // Store selected equipment object in state to open modal
    setSelectedEquipmentForModal(equipment);
    // Show loading spinner inside history modal
    setLoadingHistoryModal(true);
    try {
      // Fetch maintenance history timeline specifically for target equipment ID
      const res = await fetch(`${API_URL}/equipment/${equipment.equipmentId || equipment._id}/history`);
      if (res.ok) {
        const data = await res.json();
        // Extract array of history entries from API response
        setEquipmentHistoryLogs(Array.isArray(data.history) ? data.history : []);
      } else {
        // Fallback filter if API endpoint fails
        const targetEqId = normId(equipment.equipmentId);
        const targetId = normId(equipment._id);
        const filtered = historyList.filter(h => {
          const hEqId = normId(h.equipmentId);
          return (targetEqId && hEqId === targetEqId) || (targetId && hEqId === targetId);
        });
        setEquipmentHistoryLogs(filtered);
      }
    } catch (err) {
      // Log timeline fetch error
      console.error('Error fetching equipment history timeline:', err);
      // Fallback local filter
      const targetEqId = normId(equipment.equipmentId);
      const targetId = normId(equipment._id);
      const filtered = historyList.filter(h => {
        const hEqId = normId(h.equipmentId);
        return (targetEqId && hEqId === targetEqId) || (targetId && hEqId === targetId);
      });
      setEquipmentHistoryLogs(filtered);
    } finally {
      // Turn off timeline modal loading spinner
      setLoadingHistoryModal(false);
    }
  };

  // Handler for initializing and opening the "Record Maintenance" form modal
  const handleOpenRecordForm = (preselectedEq = null) => {
    // Determine initial equipmentId: preselected equipment > first equipment in list > empty string
    const defaultEqId = preselectedEq 
      ? (preselectedEq.equipmentId || preselectedEq.equipment_id || preselectedEq._id) 
      : (equipmentList.length > 0 ? (equipmentList[0].equipmentId || equipmentList[0].equipment_id || equipmentList[0]._id) : '');

    // Set initial values for record form state
    setRecordForm({
      equipmentId: defaultEqId, // Target equipment ID
      serviceType: 'Preventive Maintenance', // Default service type
      actionTaken: '', // Empty work description
      partsReplaced: '', // Empty parts list
      cost: '', // Empty cost
      downtimeHours: '1.0', // Default 1.0 hour downtime
      completedBy: currentUser?.name || 'Technician', // Auto-fill current technician name
      completedAt: new Date().toISOString().substring(0, 10), // Default to today's date
      notes: '', // Empty notes
      updatePmSchedule: true // Default auto-advance PM schedule check
    });

    // Open Record Maintenance modal form
    setIsRecordModalOpen(true);
  };

  // Handler for submitting the "Record Maintenance" form
  const handleSaveMaintenanceRecord = async (e) => {
    // Prevent default HTML form submission behavior
    e.preventDefault();
    const targetEqId = recordForm.equipmentId || recordForm.equipment_id;
    // Validate required fields: equipmentId and actionTaken
    if (!targetEqId || !recordForm.actionTaken || !recordForm.actionTaken.trim()) {
      // Display error feedback alert if validation fails
      setFeedbackAlert({ type: 'danger', message: 'Please select an equipment and specify the action taken.' });
      return;
    }

    try {
      // Set submission loading state to true
      setSubmittingRecord(true);

      let dateObj = new Date();
      if (recordForm.completedAt) {
        const parsed = new Date(recordForm.completedAt);
        if (!isNaN(parsed.getTime())) {
          dateObj = parsed;
        }
      }

      // Construct payload object converting numeric values and ISO timestamps
      const payload = {
        ...recordForm, // Spread current form input values
        equipmentId: targetEqId,
        actionTaken: recordForm.actionTaken.trim(),
        cost: Number(recordForm.cost) || 0, // Convert cost string to Number, default 0
        downtimeHours: Number(recordForm.downtimeHours) || 0, // Convert downtime string to Number, default 0
        completedAt: dateObj.toISOString() // Convert completedAt to ISO date string
      };

      // Send POST request to backend equipment maintenance log endpoint
      const res = await fetch(`${API_URL}/equipment/${targetEqId}/maintenance`, {
        method: 'POST', // HTTP POST method
        headers: { 'Content-Type': 'application/json' }, // Set JSON content-type header
        body: JSON.stringify(payload) // Convert payload object to JSON string
      });

      // Handle non-OK HTTP responses
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save maintenance record');
      }

      // Parse JSON response on success
      const result = await res.json();

      // Close Record Maintenance modal
      setIsRecordModalOpen(false);
      // Show top green success alert banner
      setFeedbackAlert({ type: 'success', message: `Maintenance log successfully recorded for ${targetEqId}.` });
      setTimeout(() => setFeedbackAlert(null), 5000);

      // Trigger full data refresh from backend
      await fetchData();

      // If history modal is currently open for this equipment, refresh its timeline logs as well
      if (selectedEquipmentForModal && (
        selectedEquipmentForModal.equipmentId === targetEqId || 
        selectedEquipmentForModal.equipment_id === targetEqId ||
        selectedEquipmentForModal._id === targetEqId
      )) {
        handleOpenEquipmentHistory(selectedEquipmentForModal);
      }
    } catch (err) {
      // Log submission error to console
      console.error('Error recording maintenance:', err);
      // Set error feedback alert message
      setFeedbackAlert({ type: 'danger', message: err.message || 'Error saving maintenance record.' });
    } finally {
      // Reset submission loading state
      setSubmittingRecord(false);
    }
  };

  // Filter equipment list for Maintenance Registry table based on user filters & search query
  const filteredEquipment = equipmentList.filter(eq => {
    // Restrict display to user's department if active role is 'Staff'
    if (activeRole === 'Staff' && staffDepartment) {
      const deptLower = staffDepartment.toLowerCase().trim();
      const eqDept = (eq.department || '').toLowerCase().trim();
      if (eqDept !== deptLower) return false;
    }

    // Filter by selected department dropdown filter
    if (selectedDept !== 'All' && eq.department !== selectedDept) return false;
    // Filter by selected category dropdown filter (Medical, Electronic, IT)
    if (selectedCategory !== 'All' && eq.category !== selectedCategory) return false;

    // Filter by selected PM status filter (Up-to-Date, Due Soon, Overdue)
    if (pmStatusFilter !== 'All') {
      const pmInfo = getPmStatusInfo(eq.nextPreventiveMaintenance);
      if (pmInfo.status !== pmStatusFilter) return false;
    }

    // Convert search query term to lowercase
    const term = searchTerm.toLowerCase();
    // Return true if search query matches name, equipmentId, model, serialNumber, department, or manufacturer
    return (
      (eq.name || '').toLowerCase().includes(term) ||
      (eq.equipmentId || '').toLowerCase().includes(term) ||
      (eq.model || '').toLowerCase().includes(term) ||
      (eq.serialNumber || '').toLowerCase().includes(term) ||
      (eq.department || '').toLowerCase().includes(term) ||
      (eq.manufacturer || '').toLowerCase().includes(term)
    );
  });

  // Filter history records for Complaints History view (only breakdown complaints / repair requests)
  const filteredComplaints = historyList.filter(item => {
    // Only include logs originating from breakdown complaints (must have a requestId or repair service type)
    const isComplaintLog = Boolean(
      item.requestId || 
      (item.serviceType && (item.serviceType.toLowerCase().includes('repair') || item.serviceType.toLowerCase().includes('breakdown')))
    );
    if (!isComplaintLog) return false;

    // Find matching equipment record for this history item
    const eq = equipmentList.find(e => e.equipmentId === item.equipmentId || e._id === item.equipmentId);

    // Apply role-based department security checks for Staff users
    if (activeRole === 'Staff' && staffDepartment) {
      const deptLower = staffDepartment.toLowerCase().trim();
      const userNameLower = (currentUser?.name || '').toLowerCase().trim();
      const eqDeptMatches = eq && eq.department && eq.department.toLowerCase().trim() === deptLower;
      const itemDeptMatches = item.department && item.department.toLowerCase().trim() === deptLower;
      const reporterMatches = userNameLower && item.reportedBy && item.reportedBy.toLowerCase().trim() === userNameLower;
      if (!eqDeptMatches && !itemDeptMatches && !reporterMatches) return false;
    }

    // Filter by category dropdown filter
    if (selectedCategory !== 'All' && eq && eq.category !== selectedCategory) return false;
    // Filter by department dropdown filter
    if (selectedDept !== 'All' && item.department !== selectedDept) return false;

    // Convert search query term to lowercase
    const term = searchTerm.toLowerCase();
    // Return true if search query matches equipmentId, requestId, actionTaken, completedBy, reportedBy, department, or equipment name
    return (
      (item.equipmentId || '').toLowerCase().includes(term) ||
      (item.requestId || '').toLowerCase().includes(term) ||
      (item.actionTaken || '').toLowerCase().includes(term) ||
      (item.completedBy || '').toLowerCase().includes(term) ||
      (item.reportedBy && item.reportedBy.toLowerCase().includes(term)) ||
      (item.department && item.department.toLowerCase().includes(term)) ||
      (eq && (eq.name || eq.equipment_name || '').toLowerCase().includes(term))
    );
  });

  // Filter history items for "All Maintenance Logs" sub-tab in Maintenance view
  const filteredMaintenanceLogs = historyList.filter(item => {
    // Find matching equipment record for this history item
    const eq = equipmentList.find(e => e.equipmentId === item.equipmentId || e._id === item.equipmentId);

    // Restrict logs to user's assigned department if user role is Staff
    if (activeRole === 'Staff' && staffDepartment) {
      const deptLower = staffDepartment.toLowerCase().trim();
      const eqDeptMatches = eq && eq.department && eq.department.toLowerCase().trim() === deptLower;
      const itemDeptMatches = item.department && item.department.toLowerCase().trim() === deptLower;
      if (!eqDeptMatches && !itemDeptMatches) return false;
    }

    // Filter by category filter
    if (selectedCategory !== 'All' && eq && eq.category !== selectedCategory) return false;
    // Filter by department filter
    if (selectedDept !== 'All' && item.department !== selectedDept) return false;
    // Filter by service type dropdown filter
    if (serviceTypeFilter !== 'All') {
      const itemType = (item.serviceType || (item.requestId ? 'Repair' : 'Preventive Maintenance'));
      if (itemType !== serviceTypeFilter) return false;
    }

    // Convert search query term to lowercase
    const term = searchTerm.toLowerCase();
    // Return true if search term matches equipmentId, actionTaken, completedBy, department, partsReplaced, or equipment name
    return (
      (item.equipmentId || '').toLowerCase().includes(term) ||
      (item.actionTaken || '').toLowerCase().includes(term) ||
      (item.completedBy || '').toLowerCase().includes(term) ||
      (item.department && item.department.toLowerCase().includes(term)) ||
      (item.partsReplaced && item.partsReplaced.toLowerCase().includes(term)) ||
      (eq && (eq.name || eq.equipment_name || '').toLowerCase().includes(term))
    );
  });

  // Helper utility function to sanitize and normalize ID strings for comparison
  const normId = (id) => String(id || '').trim().toLowerCase();

  // Helper utility function to extract the most recent valid timestamp from a log entry object
  const getLogTime = (l) => {
    if (!l) return 0; // Return 0 if log object is undefined
    const tComp = l.completedAt ? new Date(l.completedAt).getTime() : 0; // Parse completion timestamp
    const tCreat = l.createdAt ? new Date(l.createdAt).getTime() : 0; // Parse creation timestamp
    const tUpd = l.updatedAt ? new Date(l.updatedAt).getTime() : 0; // Parse update timestamp
    // Return maximum available timestamp among completedAt, createdAt, and updatedAt
    return Math.max(isNaN(tComp) ? 0 : tComp, isNaN(tCreat) ? 0 : tCreat, isNaN(tUpd) ? 0 : tUpd);
  };

  // Helper utility to find the latest maintenance timestamp recorded for a given equipment
  const getEquipmentLastMaintenanceTime = (eq) => {
    const targetEqId = normId(eq.equipmentId); // Normalize equipmentId string
    const targetId = normId(eq._id); // Normalize mongo _id string
    // Filter history logs that belong to this equipment
    const eqLogs = historyList.filter(h => {
      const hEqId = normId(h.equipmentId);
      return hEqId && (hEqId === targetEqId || hEqId === targetId);
    });
    // Return 0 if no maintenance logs exist for this equipment
    if (!eqLogs || eqLogs.length === 0) return 0;
    // Map logs to timestamps array and filter valid non-zero timestamps
    const timestamps = eqLogs.map(getLogTime).filter(t => t > 0);
    // Return maximum (most recent) timestamp
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  };

  // Sort filtered equipment array in registry by Last Maintenance date (most recently serviced devices first)
  filteredEquipment.sort((a, b) => {
    const timeA = getEquipmentLastMaintenanceTime(a); // Latest service time for equipment A
    const timeB = getEquipmentLastMaintenanceTime(b); // Latest service time for equipment B
    if (timeA > 0 || timeB > 0) {
      if (timeB !== timeA) {
        return timeB - timeA; // Descending order: Devices serviced recently appear first
      }
    }
    // Fallback alphabetical sorting by equipment ID if neither has service logs or times are equal
    const idA = String(a.equipmentId || '');
    const idB = String(b.equipmentId || '');
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Sort All Maintenance Logs by completion timestamp (newest first)
  filteredMaintenanceLogs.sort((a, b) => {
    return getLogTime(b) - getLogTime(a);
  });

  // Sort Complaints History by completion timestamp (newest first)
  filteredComplaints.sort((a, b) => {
    return getLogTime(b) - getLogTime(a);
  });

  // Aggregate metric calculations for the summary cards
  const totalEquipmentsCount = filteredEquipment.length; // Count of total filtered equipment assets
  const pmUpToDateCount = filteredEquipment.filter(e => getPmStatusInfo(e.nextPreventiveMaintenance).status === 'Up-to-Date').length; // Count of equipment with PM up-to-date
  const pmDueSoonCount = filteredEquipment.filter(e => getPmStatusInfo(e.nextPreventiveMaintenance).status === 'Due Soon').length; // Count of equipment with PM due within 14 days
  const pmOverdueCount = filteredEquipment.filter(e => getPmStatusInfo(e.nextPreventiveMaintenance).status === 'Overdue').length; // Count of equipment with PM overdue
  const totalMaintenanceSpend = filteredMaintenanceLogs.reduce((acc, cur) => acc + (cur.cost || 0), 0); // Calculate total maintenance cost expenditure sum

  // Extract unique department list for filter dropdown choices
  const uniqueDepartments = Array.from(new Set(equipmentList.map(e => e.department).filter(Boolean)));

  return (
    <div className="fade-in">
      
      {/* Feedback Alert Toast */}
      {feedbackAlert && (
        <div className={`alert alert-${feedbackAlert.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
          <i className={`bi ${feedbackAlert.type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-danger'} me-2`}></i>
          {feedbackAlert.message}
          <button type="button" className="btn-close" onClick={() => setFeedbackAlert(null)}></button>
        </div>
      )}

      {/* Title Card */}
      <div className="card-clean mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h4 className="fw-bold mb-1" style={{ color: 'var(--light-text-main)' }}>
              {isComplaintsMode ? (
                <span><i className="bi bi-clock-history text-primary me-2"></i>Complaints History</span>
              ) : (
                <span><i className="bi bi-tools text-primary me-2"></i>Equipment Maintenance History</span>
              )}
            </h4>
            <p className="text-muted small mb-0">
              {isComplaintsMode ? (
                activeRole === 'Staff' 
                  ? `Archive of resolved breakdown complaints and emergency repair requests for ${staffDepartment || 'your department'}`
                  : 'Archive of resolved equipment complaints, breakdown reports, and repair resolutions'
              ) : (
                activeRole === 'Staff' 
                  ? `Equipment lifecycle history, preventive maintenance (PM) schedules, and service logs for ${staffDepartment || 'your department'}`
                  : 'Maintains equipment maintenance lifecycle, scheduled PM audits, calibrations, and hardware service records'
              )}
            </p>
          </div>

          <div className="d-flex gap-2 align-items-center flex-wrap">
            {isComplaintsMode ? (
              <button 
                className="btn btn-sm btn-outline-purple"
                onClick={() => onNavigate && onNavigate('maintenance_history')}
                title="Switch to Equipment Maintenance History"
              >
                <i className="bi bi-tools me-1"></i> Maintenance History →
              </button>
            ) : (
              <>
                {/* Record Maintenance Action Button (Admin / Technician) */}
                {activeRole !== 'Staff' && (
                  <button 
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1 shadow-sm"
                    onClick={() => handleOpenRecordModal()}
                  >
                    <i className="bi bi-plus-circle-fill"></i> Record Maintenance
                  </button>
                )}

                <button 
                  className="btn btn-sm btn-outline-purple"
                  onClick={() => onNavigate && onNavigate('complaints_history')}
                  title="Switch to Complaints History"
                >
                  <i className="bi bi-clock-history me-1"></i> Complaints History →
                </button>

                {/* Reports Generator toggle (for Admin / Technician only) */}
                {activeRole !== 'Staff' && (
                  <button 
                    className={`btn btn-sm ${maintenanceSubTab === 'reports' ? 'btn-purple' : 'btn-outline-purple'}`}
                    onClick={() => setMaintenanceSubTab(maintenanceSubTab === 'reports' ? 'registry' : 'reports')}
                  >
                    <i className="bi bi-file-earmark-bar-graph me-1"></i> {maintenanceSubTab === 'reports' ? 'Equipment Registry' : 'Reports Generator'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reports Generator View (Admin/Tech only) */}
      {!isComplaintsMode && maintenanceSubTab === 'reports' && activeRole !== 'Staff' ? (
        <Reports />
      ) : (
        <>
          {/* =========================================================
              VIEW 1: EQUIPMENT MAINTENANCE HISTORY
             ========================================================= */}
          {!isComplaintsMode ? (
            <>
              {/* Aggregate KPI Metrics Cards for Equipments */}
              <div className="row g-3 mb-4">
                <div className="col-md-3 col-sm-6">
                  <div className="metric-card-mock shadow-sm p-3 bg-white border rounded d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '44px', height: '44px', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '1.25rem' }}>
                      <i className="bi bi-cpu"></i>
                    </div>
                    <div>
                      <span className="text-muted small fw-bold d-block" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>EQUIPMENT ASSETS</span>
                      <h4 className="fw-bold m-0 text-dark">{totalEquipmentsCount}</h4>
                      <small className="text-muted" style={{ fontSize: '0.68rem' }}>Tracked in system</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="metric-card-mock shadow-sm p-3 bg-white border rounded d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '44px', height: '44px', backgroundColor: '#ecfdf5', color: '#10b981', fontSize: '1.25rem' }}>
                      <i className="bi bi-shield-check"></i>
                    </div>
                    <div>
                      <span className="text-muted small fw-bold d-block" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>PM UP-TO-DATE</span>
                      <h4 className="fw-bold m-0 text-success">{pmUpToDateCount}</h4>
                      <small className="text-success" style={{ fontSize: '0.68rem' }}>Good standing</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="metric-card-mock shadow-sm p-3 bg-white border rounded d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '44px', height: '44px', backgroundColor: (pmOverdueCount > 0 ? '#fee2e2' : '#fef3c7'), color: (pmOverdueCount > 0 ? '#dc2626' : '#d97706'), fontSize: '1.25rem' }}>
                      <i className="bi bi-exclamation-triangle"></i>
                    </div>
                    <div>
                      <span className="text-muted small fw-bold d-block" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>PM ATTENTION NEEDED</span>
                      <h4 className="fw-bold m-0" style={{ color: pmOverdueCount > 0 ? '#dc2626' : '#d97706' }}>
                        {pmOverdueCount} Overdue <span className="text-muted fw-normal" style={{ fontSize: '0.85rem' }}>/ {pmDueSoonCount} Due Soon</span>
                      </h4>
                      <small className="text-muted" style={{ fontSize: '0.68rem' }}>Requires technician</small>
                    </div>
                  </div>
                </div>

                <div className="col-md-3 col-sm-6">
                  <div className="metric-card-mock shadow-sm p-3 bg-white border rounded d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '44px', height: '44px', backgroundColor: '#faf5ff', color: '#9333ea', fontSize: '1.25rem' }}>
                      <i className="bi bi-cash-stack"></i>
                    </div>
                    <div>
                      <span className="text-muted small fw-bold d-block" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>TOTAL MAINTENANCE SPEND</span>
                      <h4 className="fw-bold m-0 text-purple" style={{ color: '#7e22ce' }}>${totalMaintenanceSpend.toLocaleString()}</h4>
                      <small className="text-muted" style={{ fontSize: '0.68rem' }}>Lifecycle maintenance</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Sub-tabs Navigation */}
              <div className="d-flex gap-2 mb-3 border-bottom pb-2">
                <button
                  className={`btn btn-sm ${maintenanceSubTab === 'registry' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setMaintenanceSubTab('registry')}
                >
                  <i className="bi bi-grid-3x3-gap-fill me-1"></i> Equipment Maintenance Registry ({filteredEquipment.length})
                </button>
                <button
                  className={`btn btn-sm ${maintenanceSubTab === 'logs' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setMaintenanceSubTab('logs')}
                >
                  <i className="bi bi-journal-text me-1"></i> All Service &amp; PM Logs ({filteredMaintenanceLogs.length})
                </button>
              </div>

              {/* Filter and Search Controls */}
              <div className="card-clean mb-4">
                <div className="row g-3 align-items-center">
                  <div className="col-md-4">
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search equipment, asset ID, model, serial #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ outline: 'none', boxShadow: 'none' }}
                      />
                    </div>
                  </div>

                  {activeRole !== 'Staff' && (
                    <div className="col-md-3">
                      <select 
                        className="form-select" 
                        value={selectedDept} 
                        onChange={(e) => setSelectedDept(e.target.value)}
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={activeRole !== 'Staff' ? "col-md-2" : "col-md-4"}>
                    <select 
                      className="form-select" 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      <option value="Medical">Medical</option>
                      <option value="Electronic">Electronic</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>

                  {maintenanceSubTab === 'registry' ? (
                    <div className={activeRole !== 'Staff' ? "col-md-3" : "col-md-4"}>
                      <select 
                        className="form-select" 
                        value={pmStatusFilter} 
                        onChange={(e) => setPmStatusFilter(e.target.value)}
                      >
                        <option value="All">All PM Statuses</option>
                        <option value="Up-to-Date">🟢 Up-to-Date</option>
                        <option value="Due Soon">🟡 Due Soon (&lt; 14 days)</option>
                        <option value="Overdue">🔴 Overdue</option>
                      </select>
                    </div>
                  ) : (
                    <div className={activeRole !== 'Staff' ? "col-md-3" : "col-md-4"}>
                      <select 
                        className="form-select" 
                        value={serviceTypeFilter} 
                        onChange={(e) => setServiceTypeFilter(e.target.value)}
                      >
                        <option value="All">All Service Types</option>
                        <option value="Preventive Maintenance">🛡️ Preventive Maintenance</option>
                        <option value="Calibration">⚖️ Calibration</option>
                        <option value="Safety Inspection">🔍 Safety Inspection</option>
                        <option value="Routine Service">⚙️ Routine Service</option>
                        <option value="Repair">🔧 Repair</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-Tab 1: Equipment Maintenance Registry */}
              {maintenanceSubTab === 'registry' && (
                <div className="card-clean">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                    </div>
                  ) : filteredEquipment.length === 0 ? (
                    <div className="text-center py-5 text-muted border rounded">
                      <i className="bi bi-cpu fs-1 mb-2 d-block text-secondary"></i>
                      No equipment records found matching the specified filters.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table-clean align-middle">
                        <thead>
                          <tr>
                            <th>Asset ID</th>
                            <th>Equipment Details</th>
                            <th>Department</th>
                            <th>Category</th>
                            <th>PM Frequency</th>
                            <th>
                              Last Serviced <i className="bi bi-arrow-down text-primary" title="Sorted by Last Maintenance Date (Newest first)"></i>
                            </th>
                            <th>Next PM Due</th>
                            <th>PM Status</th>
                            <th>Services</th>
                            <th className="text-end">Maintenance Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEquipment.map((eq) => {
                            const pmInfo = getPmStatusInfo(eq.nextPreventiveMaintenance);
                            // Find all historical service records for this equipment
                            const targetEqId = normId(eq.equipmentId);
                            const targetId = normId(eq._id);
                            const eqLogs = historyList.filter(h => {
                              const hEqId = normId(h.equipmentId);
                              return hEqId && (hEqId === targetEqId || hEqId === targetId);
                            });
                            const lastLog = [...eqLogs].sort((a, b) => getLogTime(b) - getLogTime(a))[0];
                            const totalEqCost = eqLogs.reduce((sum, h) => sum + (h.cost || 0), 0);

                            return (
                              <tr key={eq._id || eq.equipmentId}>
                                <td>
                                  <span className="font-monospace fw-bold text-dark px-2 py-1 rounded bg-light border">
                                    {eq.equipmentId}
                                  </span>
                                </td>
                                <td>
                                  <div className="fw-bold text-dark">{eq.name}</div>
                                  <div className="text-muted small font-monospace" style={{ fontSize: '0.72rem' }}>
                                    {eq.manufacturer} {eq.model} • SN: {eq.serialNumber || 'N/A'}
                                  </div>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark border px-2 py-1">
                                    {eq.department}
                                  </span>
                                  <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>{eq.location}</span>
                                </td>
                                <td>
                                  <span className="badge" style={{ backgroundColor: eq.category === 'Medical' ? '#eff6ff' : eq.category === 'Electronic' ? '#fef3c7' : '#f1f5f9', color: eq.category === 'Medical' ? '#1d4ed8' : eq.category === 'Electronic' ? '#b45309' : '#334155' }}>
                                    {eq.category}
                                  </span>
                                </td>
                                <td>
                                  <span className="small text-muted font-monospace">{eq.pmFrequency || 'Quarterly'}</span>
                                </td>
                                <td>
                                  {lastLog ? (
                                    <div>
                                      <span className="small font-monospace fw-bold text-dark">
                                        {formatDate(lastLog.completedAt || lastLog.createdAt)}
                                      </span>
                                      {lastLog.serviceType && (
                                        <span className="text-muted small d-block" style={{ fontSize: '0.68rem' }}>
                                          {lastLog.serviceType}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="small font-monospace text-muted">None recorded</span>
                                  )}
                                </td>
                                <td>
                                  <span className="small font-monospace fw-semibold">
                                    {formatDate(eq.nextPreventiveMaintenance)}
                                  </span>
                                </td>
                                <td>
                                  <span 
                                    className="badge px-2 py-1 rounded-pill" 
                                    style={{ 
                                      backgroundColor: pmInfo.bg, 
                                      color: pmInfo.color, 
                                      border: `1px solid ${pmInfo.border}`,
                                      fontSize: '0.72rem' 
                                    }}
                                  >
                                    <i className={`bi ${pmInfo.status === 'Up-to-Date' ? 'bi-check-circle-fill' : pmInfo.status === 'Overdue' ? 'bi-exclamation-octagon-fill' : 'bi-clock-fill'} me-1`}></i>
                                    {pmInfo.label}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-secondary text-white rounded-pill px-2 py-0.5" style={{ fontSize: '0.7rem' }}>
                                    {eqLogs.length} logs
                                  </span>
                                  {totalEqCost > 0 && (
                                    <div className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>Rs{totalEqCost}</div>
                                  )}
                                </td>
                                <td className="text-end">
                                  <div className="d-flex gap-1 justify-content-end">
                                    <button 
                                      className="btn btn-sm btn-outline-primary py-1 px-2.5 d-flex align-items-center gap-1"
                                      style={{ fontSize: '0.75rem' }}
                                      onClick={() => handleOpenEquipmentHistory(eq)}
                                      title="View complete equipment maintenance history timeline"
                                    >
                                      <i className="bi bi-clock-history"></i> History Timeline
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: All Service & PM Logs */}
              {maintenanceSubTab === 'logs' && (
                <div className="card-clean">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                    </div>
                  ) : filteredMaintenanceLogs.length === 0 ? (
                    <div className="text-center py-5 text-muted border rounded">
                      <i className="bi bi-journal-x fs-1 mb-2 d-block text-secondary"></i>
                      No maintenance logs found matching filters.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table-clean align-middle">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Asset ID</th>
                            <th>Equipment</th>
                            <th>Department</th>
                            <th>Service Type</th>
                            <th>Technician</th>
                            <th>Work Performed / Action</th>
                            <th>Parts Replaced</th>
                            <th>Downtime</th>
                            <th>Cost</th>
                            <th className="text-end">Timeline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMaintenanceLogs.map((item) => {
                            const eq = equipmentList.find(e => e.equipmentId === item.equipmentId || e._id === item.equipmentId);
                            const badge = getServiceTypeBadge(item.serviceType || (item.requestId ? 'Repair' : 'Preventive Maintenance'));

                            return (
                              <tr key={item._id || Math.random()}>
                                <td className="font-monospace text-muted small">{formatDate(item.completedAt)}</td>
                                <td>
                                  <span className="font-monospace fw-bold text-dark px-1.5 py-0.5 rounded bg-light border small">
                                    {eq ? eq.equipmentId : item.equipmentId}
                                  </span>
                                </td>
                                <td>
                                  <strong>{eq ? eq.name : item.equipmentId}</strong>
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark border px-2 py-0.5 small">
                                    {item.department || (eq ? eq.department : 'General')}
                                  </span>
                                </td>
                                <td>
                                  <span 
                                    className="badge px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1"
                                    style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontSize: '0.72rem' }}
                                  >
                                    <i className={`bi ${badge.icon}`}></i> {badge.label}
                                  </span>
                                </td>
                                <td className="small">{item.completedBy || 'Technician'}</td>
                                <td style={{ maxWidth: '280px' }} className="small text-truncate" title={item.actionTaken}>
                                  {item.actionTaken}
                                </td>
                                <td className="small text-muted">{item.partsReplaced || 'None'}</td>
                                <td className="font-monospace small">{item.downtimeHours ? `${item.downtimeHours}h` : '0h'}</td>
                                <td className="font-monospace small text-success fw-semibold">{item.cost ? `$${item.cost}` : '$0'}</td>
                                <td className="text-end">
                                  {eq && (
                                    <button 
                                      className="btn btn-sm btn-link text-primary p-0 text-decoration-none small"
                                      onClick={() => handleOpenEquipmentHistory(eq)}
                                    >
                                      History →
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* =========================================================
               VIEW 2: COMPLAINTS HISTORY (RESOLVED COMPLAINTS)
               ========================================================= */
            <>
              {/* Complaints Filter Controls */}
              <div className="card-clean mb-4">
                <div className="row g-3 align-items-center">
                  <div className={activeRole !== 'Staff' ? "col-md-6" : "col-md-8"}>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                      <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search complaints, reporters, equipment, technicians, resolutions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ outline: 'none', boxShadow: 'none' }}
                      />
                    </div>
                  </div>

                  {activeRole !== 'Staff' && (
                    <div className="col-md-3">
                      <select 
                        className="form-select" 
                        value={selectedDept} 
                        onChange={(e) => setSelectedDept(e.target.value)}
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={activeRole !== 'Staff' ? "col-md-3" : "col-md-4"}>
                    <select 
                      className="form-select" 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      <option value="Medical">Medical</option>
                      <option value="Electronic">Electronic</option>
                      <option value="IT">IT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Complaints Records Table */}
              <div className="card-clean">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="text-center py-5 text-muted border rounded">
                    <i className="bi bi-clipboard2-check fs-1 mb-2 d-block text-secondary"></i>
                    No resolved breakdown complaints found matching filters.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table-clean align-middle">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Asset ID</th>
                          <th>Equipment</th>
                          <th>Department</th>
                          <th>Reported By</th>
                          <th>Technician</th>
                          <th>Status</th>
                          <th>Resolution &amp; Action Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredComplaints.map((item) => {
                          const eq = equipmentList.find(e => e.equipmentId === item.equipmentId || e._id === item.equipmentId);
                          const displayDept = item.department || (eq ? eq.department : 'General');

                          return (
                            <tr key={item._id || Math.random()}>
                              <td className="font-monospace text-muted small">{formatDate(item.completedAt)}</td>
                              <td className="font-monospace text-dark small">{eq ? eq.equipmentId : item.equipmentId}</td>
                              <td>
                                <div className="fw-bold">{eq ? eq.name : item.equipmentId}</div>
                                <span className="text-muted small font-monospace" style={{ fontSize: '0.7rem' }}>
                                  {eq?.category || 'General'}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2 py-1">
                                  {displayDept}
                                </span>
                              </td>
                              <td className="small">{item.reportedBy || 'Staff'}</td>
                              <td className="small">{item.completedBy || 'Technician'}</td>
                              <td>
                                <span 
                                  className="badge rounded-pill px-2.5 py-1"
                                  style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: '600' }}
                                >
                                  <i className="bi bi-check-circle-fill me-1"></i> Completed
                                </span>
                              </td>
                              <td style={{ maxWidth: '300px' }} className="small">
                                <div>{item.actionTaken}</div>
                                {item.partsReplaced && item.partsReplaced !== 'None' && (
                                  <span className="text-muted d-block font-monospace" style={{ fontSize: '0.7rem' }}>
                                    Parts: {item.partsReplaced}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* =========================================================
          MODAL 1: EQUIPMENT MAINTENANCE TIMELINE & HISTORY CARD
         ========================================================= */}
      {selectedEquipmentForModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              
              {/* Modal Header */}
              <div className="modal-header bg-light border-bottom px-4 py-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style={{ width: '36px', height: '36px' }}>
                    <i className="bi bi-cpu"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark m-0">{selectedEquipmentForModal.name}</h5>
                    <span className="font-monospace text-muted small">
                      {selectedEquipmentForModal.equipmentId} • {selectedEquipmentForModal.department} ({selectedEquipmentForModal.location})
                    </span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedEquipmentForModal(null)}></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                
                {/* Equipment Spec Overview Card */}
                <div className="card-clean p-3 bg-light border rounded mb-4">
                  <div className="row g-3 small">
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Manufacturer &amp; Model</span>
                      <strong>{selectedEquipmentForModal.manufacturer} {selectedEquipmentForModal.model}</strong>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Asset ID</span>
                      <strong className="font-monospace text-dark px-1.5 py-0.5 rounded bg-white border small">{selectedEquipmentForModal.equipmentId}</strong>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">PM Frequency</span>
                      <strong>{selectedEquipmentForModal.pmFrequency || 'Quarterly'}</strong>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Next PM Due</span>
                      <strong className="text-primary">{formatDate(selectedEquipmentForModal.nextPreventiveMaintenance)}</strong>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Installation Date</span>
                      <span>{formatDate(selectedEquipmentForModal.installationDate)}</span>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Warranty Expiration</span>
                      <span>{formatDate(selectedEquipmentForModal.warrantyExpiration)}</span>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Current Status</span>
                      <span className="badge bg-success text-white">{selectedEquipmentForModal.status || 'Operational'}</span>
                    </div>
                    <div className="col-md-3 col-6">
                      <span className="text-muted d-block">Total Past Services</span>
                      <strong className="text-purple">{equipmentHistoryLogs.length} events</strong>
                    </div>
                  </div>
                </div>

                {/* Header for Timeline */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 text-dark">
                    <i className="bi bi-clock-history text-primary me-2"></i>
                    Chronological Maintenance Timeline
                  </h6>
                </div>

                {/* Timeline Content */}
                {loadingHistoryModal ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                    <span className="ms-2 text-muted small">Loading history logs...</span>
                  </div>
                ) : equipmentHistoryLogs.length === 0 ? (
                  <div className="text-center py-4 text-muted border rounded bg-white">
                    <i className="bi bi-clipboard2-check fs-2 text-secondary d-block mb-1"></i>
                    No prior maintenance logs on file for this equipment asset.
                  </div>
                ) : (
                  <div className="timeline-wrapper">
                    {equipmentHistoryLogs.map((log, index) => {
                      const badge = getServiceTypeBadge(log.serviceType || (log.requestId ? 'Repair' : 'Preventive Maintenance'));

                      return (
                        <div key={log._id || index} className="p-3 mb-2.5 bg-white border rounded shadow-sm">
                          <div className="d-flex justify-content-between align-items-center mb-1.5 flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <span 
                                className="badge px-2 py-1 rounded-pill small"
                                style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                              >
                                <i className={`bi ${badge.icon} me-1`}></i> {badge.label}
                              </span>
                              {log.requestId && (
                                <span className="font-monospace text-muted small bg-light border px-1.5 py-0.5 rounded" style={{ fontSize: '0.7rem' }}>
                                  Complaint {log.requestId}
                                </span>
                              )}
                            </div>
                            <span className="font-monospace text-muted small" style={{ fontSize: '0.72rem' }}>
                              <i className="bi bi-calendar3 me-1"></i>{formatDate(log.completedAt)}
                            </span>
                          </div>

                          <p className="m-0 text-dark small mb-2" style={{ lineHeight: '1.4' }}>
                            {log.actionTaken}
                          </p>

                          <div className="d-flex gap-3 text-muted flex-wrap" style={{ fontSize: '0.72rem' }}>
                            <span>
                              <i className="bi bi-person-badge text-secondary me-1"></i>
                              Technician: <strong>{log.completedBy || 'Technician'}</strong>
                            </span>
                            {log.partsReplaced && log.partsReplaced !== 'None' && (
                              <span>
                                <i className="bi bi-gear me-1 text-secondary"></i>
                                Parts: <strong>{log.partsReplaced}</strong>
                              </span>
                            )}
                            <span>
                              <i className="bi bi-clock me-1 text-secondary"></i>
                              Downtime: <strong>{log.downtimeHours ? `${log.downtimeHours}h` : '0h'}</strong>
                            </span>
                            <span>
                              <i className="bi bi-currency-dollar me-1 text-secondary"></i>
                              Cost: <strong>${log.cost || 0}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light border-top px-4 py-2" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedEquipmentForModal(null)}>
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: RECORD DIRECT EQUIPMENT MAINTENANCE
         ========================================================= */}
      {isRecordModalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              
              <div className="modal-header bg-light border-bottom px-4 py-3" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-success text-white" style={{ width: '34px', height: '34px' }}>
                    <i className="bi bi-tools"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark m-0">Record Equipment Maintenance</h5>
                    <span className="text-muted small">Maintain direct equipment lifecycle &amp; PM history</span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setIsRecordModalOpen(false)}></button>
              </div>

              <form onSubmit={handleSaveMaintenanceRecord}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    
                    {/* Equipment Selector */}
                    <div className="col-12">
                      <label className="form-label small fw-bold text-dark">Select Equipment Asset *</label>
                      <select 
                        className="form-select"
                        value={recordForm.equipmentId}
                        onChange={(e) => setRecordForm({ ...recordForm, equipmentId: e.target.value })}
                        required
                      >
                        {equipmentList.map(eq => (
                          <option key={eq._id || eq.equipmentId || eq.equipment_id} value={eq.equipmentId || eq.equipment_id || eq._id}>
                            {eq.equipmentId || eq.equipment_id || eq._id} — {eq.name || eq.equipment_name} ({eq.department})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Type & Maintenance Date */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark mb-1">Service Type *</label>
                      <select 
                        className="form-select"
                        value={recordForm.serviceType}
                        onChange={(e) => setRecordForm({ ...recordForm, serviceType: e.target.value })}
                        required
                      >
                        <option value="Preventive Maintenance">🛡️ Preventive Maintenance (PM)</option>
                        <option value="Calibration">⚖️ Calibration</option>
                        <option value="Safety Inspection">🔍 Safety Inspection</option>
                        <option value="Routine Service">⚙️ Routine Service</option>
                        <option value="Part Replacement">🔩 Part Replacement</option>
                        <option value="Repair">🔧 Overhaul &amp; Repair</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark mb-1">Maintenance Date *</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={recordForm.completedAt || ''}
                        onChange={(e) => setRecordForm({ ...recordForm, completedAt: e.target.value })}
                        required
                      />
                    </div>

                    {/* Technician Name */}
                    <div className="col-md-6">
                      <label className="form-label small fw-bold text-dark mb-1">Technician / Serviced By *</label>
                      <div className="input-group">
                        <span className="input-group-text bg-white"><i className="bi bi-person-badge text-muted"></i></span>
                        <input 
                          type="text"
                          className="form-control"
                          value={recordForm.completedBy}
                          onChange={(e) => setRecordForm({ ...recordForm, completedBy: e.target.value })}
                          placeholder="e.g. John Mathew"
                          required
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
                          min="0"
                          step="0.1"
                          className="form-control"
                          placeholder="1.0"
                          value={recordForm.downtimeHours}
                          onChange={(e) => setRecordForm({ ...recordForm, downtimeHours: e.target.value })}
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
                          min="0"
                          step="0.01"
                          className="form-control"
                          placeholder="0.00"
                          value={recordForm.cost}
                          onChange={(e) => setRecordForm({ ...recordForm, cost: e.target.value })}
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
                          placeholder="e.g. Lithium Pack D3, O2 Sensor, or None"
                          value={recordForm.partsReplaced}
                          onChange={(e) => setRecordForm({ ...recordForm, partsReplaced: e.target.value })}
                        />
                      </div>
                      <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                        List component spares replaced
                      </div>
                    </div>

                    {/* Action Taken / Work Done */}
                    <div className="col-12">
                      <label className="form-label small fw-bold text-dark mb-1">Work Performed / Diagnostic Actions *</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        placeholder="Describe the maintenance checklist completed, adjustments made, calibrations tested..."
                        value={recordForm.actionTaken}
                        onChange={(e) => setRecordForm({ ...recordForm, actionTaken: e.target.value })}
                        required
                      ></textarea>
                    </div>

                    {/* Update PM Schedule Checkbox */}
                    <div className="col-12">
                      <div className="form-check p-2.5 bg-light rounded border">
                        <input 
                          className="form-check-input ms-0 me-2" 
                          type="checkbox" 
                          id="updatePmScheduleCheck"
                          checked={recordForm.updatePmSchedule}
                          onChange={(e) => setRecordForm({ ...recordForm, updatePmSchedule: e.target.checked })}
                        />
                        <label className="form-check-label small text-dark" htmlFor="updatePmScheduleCheck">
                          <strong>Advance Next PM Due Date</strong> automatically based on equipment's frequency cycle (e.g. +3 months for Quarterly).
                        </label>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="modal-footer bg-light border-top px-4 py-2" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsRecordModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success btn-sm px-3" disabled={submittingRecord}>
                    {submittingRecord ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle-fill me-1"></i> Save Maintenance Record
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServiceHistoryList;
