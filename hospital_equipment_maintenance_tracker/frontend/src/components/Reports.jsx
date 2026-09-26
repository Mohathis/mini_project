import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';

function Reports() {
  const [requestsList, setRequestsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const savedProfile = (() => {
    try {
      const saved = localStorage.getItem('hospital_profile_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })();

  const hospitalName = savedProfile?.name || 'CityCare Hospital';
  const hospitalIcon = savedProfile?.icon || 'bi-shield-plus';

  const getLocalDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getLocalDateString();
  const defaultFromStr = '2026-01-01';

  // Filters State
  const [fromDate, setFromDate] = useState(defaultFromStr);
  const [toDate, setToDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Results State
  const [searchResults, setSearchResults] = useState([]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [resRequests, resHistory] = await Promise.all([
        fetch(`${API_URL}/requests`),
        fetch(`${API_URL}/requests/history/all`)
      ]);
      const activeData = await resRequests.json();
      const historyData = await resHistory.json();

      const activeList = Array.isArray(activeData) ? activeData : [];
      const historyList = Array.isArray(historyData) ? historyData : [];

      // Map history records to look like requests for unified reporting
      const formattedHistory = historyList.map(h => ({
        ...h,
        createdAt: h.completedAt || h.createdAt,
        assignedTechnician: h.completedBy || h.assignedTechnician,
        issueDescription: h.actionTaken || 'Maintenance completed successfully.',
        status: h.status || 'Completed'
      }));

      // Combine both lists
      const combined = [...activeList, ...formattedHistory];
      
      // Sort combined list by date (newest first)
      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setRequestsList(combined);
      
      // Run initial search
      runSearch(combined, defaultFromStr, todayStr, 'All', 'All', '', 'All');
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const runSearch = (list, from, to, status, dept, kw = keywordSearch, type = typeFilter) => {
    const filtered = list.filter(req => {
      let matchesDate = true;
      if (req.createdAt) {
        const d = new Date(req.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const createdDateOnly = `${yyyy}-${mm}-${dd}`;
        if (from) {
          matchesDate = matchesDate && (createdDateOnly >= from);
        }
        if (to) {
          matchesDate = matchesDate && (createdDateOnly <= to);
        }
      }

      const matchesStatus = status === 'All' || req.status === status;
      
      const reqDept = req.equipmentId?.department || req.department || 'N/A';
      const matchesDept = dept === 'All' || reqDept === dept;

      const desc = (req.issueDescription || req.actionTaken || '').toLowerCase();
      const isPmRecord = desc.includes('preventive') || desc.includes('pm') || desc.includes('maintenance') || desc.includes('inspection') || desc.includes('scheduled');
      const matchesType = type === 'All' || 
                          (type === 'PM' && isPmRecord) || 
                          (type === 'Complaint' && !isPmRecord);

      const q = (kw || '').trim().toLowerCase();
      const matchesKw = !q || 
        (req.requestId || '').toLowerCase().includes(q) ||
        (req.reportedBy || '').toLowerCase().includes(q) ||
        (req.department || '').toLowerCase().includes(q) ||
        (req.equipmentId?.name || req.equipmentId || '').toString().toLowerCase().includes(q) ||
        (req.issueDescription || '').toLowerCase().includes(q) ||
        (req.assignedTechnician || '').toLowerCase().includes(q);

      return matchesDate && matchesStatus && matchesDept && matchesKw && matchesType;
    });

    setSearchResults(filtered);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearch(requestsList, fromDate, toDate, statusFilter, deptFilter, keywordSearch, typeFilter);
  };

  const handleReset = () => {
    setFromDate(defaultFromStr);
    setToDate(todayStr);
    setStatusFilter('All');
    setDeptFilter('All');
    setKeywordSearch('');
    setTypeFilter('All');
    runSearch(requestsList, defaultFromStr, todayStr, 'All', 'All', '', 'All');
  };

  const handlePrint = () => {
    window.print();
  };

  // Date Formatter Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 'Completed') return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
    if (status === 'In Progress') return { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
    return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
  };

  // Metrics
  const totalCount = searchResults.length;
  const completedCount = searchResults.filter(r => r.status === 'Completed').length;
  const inProgressCount = searchResults.filter(r => r.status === 'In Progress').length;
  const pendingCount = searchResults.filter(r => r.status === 'Pending').length;

  return (
    <div className="fade-in">
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 15mm;
          }
          
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Hide all non-printable UI panels completely */
          .app-sidebar,
          .content-header,
          footer,
          .d-print-none,
          form,
          button {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Reset all layout wrappers to prevent clipping and margins */
          .light-theme-wrapper,
          .app-layout,
          .app-content,
          main,
          .p-4,
          .row,
          .col-lg-8,
          .col-md-12 {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: none !important;
          }

          #printable-report-area {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }

          /* Table layout styling for print */
          .table-responsive {
            display: block !important;
            width: 100% !important;
            overflow: visible !important;
            overflow-x: visible !important;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            word-wrap: break-word !important;
          }

          th, td {
            word-break: break-word !important;
            white-space: normal !important;
            padding: 8px !important;
            font-size: 9pt !important;
          }

          .badge {
            border: 1px solid #ccc !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
        <div>
          <h2 className="fw-bold m-0" style={{ color: 'var(--light-text-main)' }}>Reports Generator</h2>
          <p className="text-muted m-0 small">Search and compile custom maintenance logs and service statistics</p>
        </div>
        {searchResults.length > 0 && (
          <button onClick={handlePrint} className="btn btn-blue d-flex align-items-center gap-2 px-4 py-2">
            <i className="bi bi-printer"></i> Print Report
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="text-muted mt-2">Loading complaints registry...</p>
        </div>
      ) : (
        <div className="row g-4">
          
          {/* Left Column: Search Parameters (Hidden during Print) */}
          <div className="col-lg-4 col-md-12 d-print-none">
            <div className="card-clean shadow-sm border-0">
              <h5 className="fw-bold mb-3" style={{ color: 'var(--light-text-main)' }}>
                <i className="bi bi-funnel text-primary me-2"></i>Filter Options
              </h5>
              
              <form onSubmit={handleSearchSubmit}>
                <div className="d-flex flex-column gap-3">
                  <div>
                    <label className="form-label small fw-bold">Keyword Search</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ID, Device name, Tech, Reporter..."
                      value={keywordSearch}
                      onChange={(e) => setKeywordSearch(e.target.value)}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small fw-bold">From Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">To Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label small fw-bold">Status</label>
                    <select 
                      className="form-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses (Completed, In Progress, Pending)</option>
                      <option value="Completed">🟢 Completed</option>
                      <option value="In Progress">🔵 In Progress</option>
                      <option value="Pending">🔴 Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label small fw-bold">Record Type</label>
                    <select 
                      className="form-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="All">All Types (PM & Complaints)</option>
                      <option value="PM">🔧 Preventive Maintenance (PM)</option>
                      <option value="Complaint">🚨 Complaint / Repair</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label small fw-bold">Department</label>
                    <select 
                      className="form-select"
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                    >
                      <option value="All">All Departments</option>
                      <option value="Emergency">Emergency</option>
                      <option value="ICU">ICU</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Administration">Administration</option>
                      <option value="OPD">OPD</option>
                    </select>
                  </div>

                  <div className="d-flex gap-2 mt-2">
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary w-50 py-2"
                      onClick={handleReset}
                    >
                      Reset
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-blue w-50 py-2 text-white fw-bold"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Printable Report Preview Area */}
          <div className="col-lg-8 col-md-12">
            
            {/* Summary KPI metrics */}
            <div className="row g-3 mb-4 d-print-none">
              <div className="col-md-3 col-6">
                <div className="card-clean text-center py-3 px-2 border-0 shadow-sm">
                  <span className="text-muted small fw-bold d-block text-uppercase">Total Matches</span>
                  <h3 className="fw-bold m-0 mt-1" style={{ color: 'var(--light-text-main)' }}>{totalCount}</h3>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card-clean text-center py-3 px-2 border-0 shadow-sm bg-success bg-opacity-10 text-success">
                  <span className="small fw-bold d-block text-uppercase">Completed</span>
                  <h3 className="fw-bold m-0 mt-1">{completedCount}</h3>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card-clean text-center py-3 px-2 border-0 shadow-sm" style={{ backgroundColor: 'rgba(var(--bs-primary-rgb, 2, 132, 199), 0.12)', color: 'var(--bs-primary, #0284c7)' }}>
                  <span className="small fw-bold d-block text-uppercase">In Progress</span>
                  <h3 className="fw-bold m-0 mt-1">{inProgressCount}</h3>
                </div>
              </div>
              <div className="col-md-3 col-6">
                <div className="card-clean text-center py-3 px-2 border-0 shadow-sm bg-danger bg-opacity-10 text-danger">
                  <span className="small fw-bold d-block text-uppercase">Pending</span>
                  <h3 className="fw-bold m-0 mt-1">{pendingCount}</h3>
                </div>
              </div>
            </div>

            {/* Document Printable View */}
            <div className="card-clean shadow-sm border-0 p-4 bg-white text-dark" id="printable-report-area" style={{ minHeight: '600px' }}>
              
              {/* Report Document Header */}
              <div className="border-bottom pb-4 mb-4 text-center">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                  <i className={`bi ${hospitalIcon} fs-3 text-primary`}></i>
                  <h3 className="fw-bold m-0 text-uppercase tracking-wider">{hospitalName}</h3>
                </div>
                <p className="text-muted small m-0 text-uppercase font-monospace">Equipment Maintenance Registry</p>
                {savedProfile?.phone && (
                  <div className="small text-muted mt-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                    <span>Phone: {savedProfile.phone}</span> | <span>Email: {savedProfile.email || 'support@hospital.org'}</span>
                  </div>
                )}
                <div className="badge bg-dark mt-2 font-monospace px-3 py-1">System Report Document</div>
              </div>

              {/* Report Parameters Overview */}
              <div className="row g-2 small border rounded p-3 mb-4 bg-light text-dark">
                <div className="col-md-6 col-12">
                  <strong>Reporting Interval:</strong> {formatDate(fromDate)} to {formatDate(toDate)}
                </div>
                <div className="col-md-6 col-12">
                  <strong>Status Scope:</strong> {statusFilter}
                </div>
                <div className="col-md-6 col-12">
                  <strong>Target Department:</strong> {deptFilter}
                </div>
                <div className="col-md-6 col-12">
                  <strong>Compiled Date:</strong> {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Table of Records */}
              {searchResults.length === 0 ? (
                <div className="text-center py-5 text-muted border border-dashed rounded mt-4">
                  <i className="bi bi-file-earmark-x fs-1 mb-2 d-block"></i>
                  No maintenance records matched the defined parameters.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-striped align-middle" style={{ fontSize: '0.85rem' }}>
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Device Name</th>
                        <th>Dept</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Assigned Tech</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((req) => {
                        const eqDept = req.equipmentId?.department || req.department || 'N/A';
                        const eqName = req.equipmentId?.name || req.equipmentId;
                        const desc = (req.issueDescription || req.actionTaken || '').toLowerCase();
                        const isPmRecord = desc.includes('preventive') || desc.includes('pm') || desc.includes('maintenance') || desc.includes('inspection') || desc.includes('scheduled');
                        const recordType = isPmRecord ? 'PM' : 'Complaint';
                        return (
                          <tr key={req._id}>
                            <td className="font-monospace fw-bold">{req.requestId}</td>
                            <td>
                              <div><strong>{eqName}</strong></div>
                              <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                Asset ID: {typeof req.equipmentId === 'object' ? req.equipmentId.equipmentId : req.equipmentId}
                              </span>
                            </td>
                            <td>{eqDept}</td>
                            <td>
                              <span className="badge rounded-pill text-uppercase px-2 py-1" style={
                                isPmRecord ? { backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontSize: '0.7rem' } : { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.7rem' }
                              }>
                                {recordType}
                              </span>
                            </td>
                            <td>
                              <span className="badge rounded-pill text-uppercase px-2 py-1" style={{
                                backgroundColor: req.status === 'Completed' ? '#d1fae5' : req.status === 'In Progress' ? '#dbeafe' : '#fee2e2',
                                color: req.status === 'Completed' ? '#065f46' : req.status === 'In Progress' ? '#1e40af' : '#991b1b',
                                fontSize: '0.7rem'
                              }}>
                                {req.status}
                              </span>
                            </td>
                            <td>{req.assignedTechnician || 'Unassigned'}</td>
                            <td className="font-monospace">{formatDate(req.createdAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Report Footer */}
              <div className="mt-5 pt-4 border-top text-center text-muted small">
                <p className="m-0">End of Compiled Maintenance Report — {hospitalName} Administration Office</p>
              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default Reports;
