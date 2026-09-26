import React, { useState, useEffect } from 'react';
import { API_URL } from '../App';

const generateNextId = (list) => {
  let maxNum = 0;

  list.forEach(eq => {
    const id = String(eq.equipmentId || '').trim();
    const match = id.match(/^(.*?)(0*(\d+))$/);
    if (match) {
      const num = parseInt(match[3], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `EQ-${nextNum}`;
};

const calculateWarrantyExpiration = (installDateStr, period = '1 Year') => {
  if (!installDateStr) return '';
  const d = new Date(installDateStr);
  if (isNaN(d.getTime())) return '';
  let years = 1;
  const parsed = parseInt(period, 10);
  if (!isNaN(parsed) && parsed >= 1) {
    years = parsed;
  }
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
};

function EquipmentInventory({ activeRole, staffDepartment, showAlert, departmentsList }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // View state: 'list', 'add', 'success'
  const [viewMode, setViewMode] = useState('list');
  const [lastAddedEquipment, setLastAddedEquipment] = useState(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    equipmentId: '',
    name: '',
    category: 'Medical',
    department: 'ICU',
    location: '',
    brand: '',
    model: '',
    status: 'Working', // Maps to 'Operational' in DB
    installationDate: '',
    warrantyPeriod: '1 Year', // 1 Year, 2 Years, 3 Years, 4 Years, 5 Years
    warrantyExpiration: '',
    maintenanceInterval: '6 Months' // 1 Month, 3 Months, 6 Months, 1 Year
  });

  const [categories, setCategories] = useState([
    { value: 'Medical', label: 'Medical Device' },
    { value: 'Electronic', label: 'Electronic' },
    { value: 'IT', label: 'IT Infrastructure' },
    
  ]);

  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [manageCategory, setManageCategory] = useState(null);
  
  // Custom Inline Categories UI State
  const [editingCategoryValue, setEditingCategoryValue] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteConfirmValue, setDeleteConfirmValue] = useState(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const handleSaveCategoryRename = (catVal) => {
    if (newCategoryName && newCategoryName.trim()) {
      const trimmed = newCategoryName.trim();
      const exists = categories.some(c => c.value.toLowerCase() === trimmed.toLowerCase() && c.value !== catVal);
      if (exists) {
        showAlert('Category already exists.', 'danger');
        return;
      }
      setCategories(prev => prev.map(c => c.value === catVal ? { value: trimmed, label: trimmed } : c));
      if (formData.category === catVal) {
        setFormData(prev => ({ ...prev, category: trimmed }));
      }
      showAlert(`Category renamed to "${trimmed}".`, 'success');
      setEditingCategoryValue(null);
      setManageCategory(null);
    }
  };

  const handleConfirmDeleteCategory = (catVal) => {
    const cat = categories.find(c => c.value === catVal);
    if (!cat) return;
    const updated = categories.filter(c => c.value !== catVal);
    setCategories(updated);
    if (formData.category === catVal) {
      setFormData(prev => ({ ...prev, category: updated[0]?.value || '' }));
    }
    showAlert(`Category "${cat.label}" deleted.`, 'success');
    setDeleteConfirmValue(null);
    setManageCategory(null);
  };

  const handleSaveNewCategory = () => {
    if (newCatInput && newCatInput.trim()) {
      const trimmed = newCatInput.trim();
      const exists = categories.some(c => c.value.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        showAlert('Category already exists.', 'danger');
        return;
      }
      setCategories(prev => [...prev, { value: trimmed, label: trimmed }]);
      setFormData(prev => ({ ...prev, category: trimmed }));
      showAlert(`Category "${trimmed}" added successfully.`, 'success');
      setIsAddingCat(false);
      setNewCatInput('');
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/equipment`);
      const data = await res.json();
      setEquipmentList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching equipment list:', error);
      showAlert('Failed to retrieve equipment records.', 'danger');
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'installationDate' || name === 'warrantyPeriod') {
        const instDate = name === 'installationDate' ? value : prev.installationDate;
        const period = name === 'warrantyPeriod' ? value : (prev.warrantyPeriod || '1 Year');
        if (instDate) {
          updated.warrantyExpiration = calculateWarrantyExpiration(instDate, period);
        }
      }
      return updated;
    });
  };

  const toInputDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const handleStartAdd = () => {
    setEditingEquipmentId(null);
    const nextId = generateNextId(equipmentList);
    setFormData({
      equipmentId: nextId,
      name: '',
      category: 'Medical',
      department: 'ICU',
      location: '',
      brand: '',
      model: '',
      status: 'Working',
      installationDate: '',
      warrantyPeriod: '1 Year',
      warrantyExpiration: '',
      maintenanceInterval: '6 Months'
    });
    setViewMode('add');
  };

  const handleStartEdit = (eq) => {
    setEditingEquipmentId(eq._id);
    let interval = '6 Months';
    if (eq.pmFrequency === 'Monthly') interval = '1 Month';
    else if (eq.pmFrequency === 'Quarterly') interval = '3 Months';
    else if (eq.pmFrequency === 'Semi-Annually') interval = '6 Months';
    else if (eq.pmFrequency === 'Annually') interval = '1 Year';

    const displayStat = getDisplayStatusLabel(eq.status);

    // Detect warranty period from existing equipment dates
    let detectedPeriod = '1 Year';
    if (eq.installationDate && eq.warrantyExpiration) {
      const instTime = new Date(eq.installationDate).getTime();
      const expTime = new Date(eq.warrantyExpiration).getTime();
      const diffYears = Math.round((expTime - instTime) / (365.25 * 24 * 60 * 60 * 1000));
      if (diffYears === 2) detectedPeriod = '2 Years';
      else if (diffYears === 3) detectedPeriod = '3 Years';
      else if (diffYears === 4) detectedPeriod = '4 Years';
      else if (diffYears >= 5) detectedPeriod = '5 Years';
      else detectedPeriod = '1 Year';
    }

    setFormData({
      equipmentId: eq.equipmentId || eq.equipment_id || '',
      name: eq.name || eq.equipment_name || '',
      category: eq.category || 'Medical',
      department: eq.department || 'ICU',
      location: eq.location || '',
      brand: eq.manufacturer || '',
      model: eq.model || '',
      status: displayStat,
      installationDate: toInputDate(eq.installationDate),
      warrantyPeriod: detectedPeriod,
      warrantyExpiration: toInputDate(eq.warrantyExpiration),
      maintenanceInterval: interval
    });
    setViewMode('add');
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await fetch(`${API_URL}/equipment/${deleteCandidate._id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showAlert(`Equipment "${deleteCandidate.name}" deleted successfully.`, 'success');
        setDeleteCandidate(null);
        fetchEquipment();
      } else {
        const err = await res.json();
        showAlert(err.message || 'Error deleting equipment.', 'danger');
      }
    } catch (error) {
      showAlert('Connection failure during deletion.', 'danger');
    }
  };

  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    try {
      // Frontend uniqueness validation for asset ID
      const targetId = (formData.equipmentId || '').trim();
      if (targetId) {
        const isDuplicate = equipmentList.some(
          eq => eq._id !== editingEquipmentId && eq.equipmentId.toLowerCase() === targetId.toLowerCase()
        );
        if (isDuplicate) {
          showAlert(`Equipment with Asset ID "${targetId}" already exists in the inventory.`, 'danger');
          return;
        }
      }

      // 1. Map mockup status vocabulary to backend db schema values
      const dbStatus = formData.status === 'Working' ? 'Operational' : (formData.status === 'Faulty' ? 'Broken' : formData.status);
      
      // 2. Map Interval to PM Frequency
      let pmFrequency = 'Quarterly';
      if (formData.maintenanceInterval === '1 Month') pmFrequency = 'Monthly';
      else if (formData.maintenanceInterval === '3 Months') pmFrequency = 'Quarterly';
      else if (formData.maintenanceInterval === '6 Months') pmFrequency = 'Semi-Annually';
      else if (formData.maintenanceInterval === '1 Year') pmFrequency = 'Annually';

      const lastDate = formData.installationDate ? new Date(formData.installationDate) : new Date();
      const nextDate = new Date(lastDate);
      if (pmFrequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      else if (pmFrequency === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (pmFrequency === 'Semi-Annually') nextDate.setMonth(nextDate.getMonth() + 6);
      else nextDate.setFullYear(nextDate.getFullYear() + 1);

      // Calculate warranty expiration date from installationDate + warrantyPeriod (1-5 Years)
      let years = 1;
      const parsedYears = parseInt(formData.warrantyPeriod, 10);
      if (!isNaN(parsedYears) && parsedYears >= 1) {
        years = parsedYears;
      }
      const warrantyDate = new Date(lastDate);
      warrantyDate.setFullYear(warrantyDate.getFullYear() + years);

      // Format payloads
      const fallbackId = generateNextId(equipmentList);
      const payload = {
        equipmentId: formData.equipmentId || fallbackId,
        name: formData.name,
        category: formData.category,
        department: formData.department,
        location: formData.location || `${formData.department} Room 101`,
        model: formData.model || 'N/A',
        serialNumber: `SN-${Math.floor(Math.random() * 900000 + 100000)}`,
        manufacturer: formData.brand || 'N/A', // mapping brand to manufacturer field
        installationDate: lastDate.toISOString(),
        warrantyExpiration: warrantyDate.toISOString(),
        pmFrequency,
        status: dbStatus,
        nextPreventiveMaintenance: nextDate.toISOString()
      };

      const isEdit = !!editingEquipmentId;
      const url = isEdit ? `${API_URL}/equipment/${editingEquipmentId}` : `${API_URL}/equipment`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json();
        if (isEdit) {
          showAlert('Equipment successfully updated.', 'success');
          setViewMode('list');
        } else {
          showAlert('Equipment successfully registered into inventory.', 'success');
          setLastAddedEquipment(savedData);
          setCurrentPage(1);
          setViewMode('success');
        }
        
        // Reset form
        setFormData({
          equipmentId: '',
          name: '',
          category: 'Medical',
          department: 'ICU',
          location: '',
          brand: '',
          model: '',
          status: 'Working',
          installationDate: '',
          warrantyPeriod: '1 Year',
          warrantyExpiration: '',
          maintenanceInterval: '6 Months'
        });
        setEditingEquipmentId(null);
        fetchEquipment();
      } else {
        const err = await res.json();
        showAlert(err.message || (isEdit ? 'Error updating equipment.' : 'Error registering equipment.'), 'danger');
      }
    } catch (error) {
      showAlert('Connection failure during save.', 'danger');
    }
  };

  // Helper formatting dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Map internal database status back to user-friendly label
  const getDisplayStatusLabel = (internalStatus) => {
    if (internalStatus === 'Operational') return 'Working';
    if (internalStatus === 'Broken') return 'Faulty';
    return internalStatus; // Under Maintenance, Retired
  };

  // Status badges color picker
  const getStatusBadgeStyle = (status) => {
    const displayStatus = getDisplayStatusLabel(status);
    if (displayStatus === 'Working') {
      return { backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' };
    }
    if (displayStatus === 'Faulty') {
      return { backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    }
    if (displayStatus === 'Under Maintenance') {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' };
    }
    return { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  };

  // Filter list
  const filteredEquipment = equipmentList.filter(eq => {
    const eqName = eq.name || eq.equipment_name || '';
    const eqId = eq.equipmentId || eq.equipment_id || '';
    const eqModel = eq.model || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch = 
      eqName.toLowerCase().includes(term) || 
      eqId.toLowerCase().includes(term) || 
      eqModel.toLowerCase().includes(term);
      
    const matchesDept = selectedDept === 'All' || eq.department === selectedDept;
    
    // Convert backend status to display status for filter alignment
    const displayStatus = getDisplayStatusLabel(eq.status);
    const matchesStatus = selectedStatus === 'All' || displayStatus === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  }).sort((a, b) => {
    // 1. If a specific item was just added in this session, put it at the very top (first row)
    if (lastAddedEquipment) {
      const lastId = String(lastAddedEquipment.equipmentId || lastAddedEquipment.equipment_id || lastAddedEquipment._id || '');
      const idA = String(a.equipmentId || a.equipment_id || a._id || '');
      const idB = String(b.equipmentId || b.equipment_id || b._id || '');

      if (idA === lastId && idB !== lastId) return -1;
      if (idB === lastId && idA !== lastId) return 1;
    }

    // 2. Sort by creation date if available (newest first)
    const timeA = new Date(a.createdAt || a.installationDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.installationDate || 0).getTime();
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeB - timeA;
    }

    // 3. Sort by Asset ID descending (e.g., EQ-10, EQ-9, EQ-8... EQ-1) so latest added equipment is always first
    const idA = String(a.equipmentId || a.equipment_id || '');
    const idB = String(b.equipmentId || b.equipment_id || '');
    return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Pagination Logic
  const totalEntries = filteredEquipment.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEquipment.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="fade-in">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="card-clean">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <div>
              <h4 className="fw-bold mb-1" style={{ color: 'var(--light-text-main)' }}>Equipment</h4>
              <p className="text-muted small mb-0">Manage all hospital equipment</p>
            </div>
            
            {activeRole === 'Manager' && (
              <button className="btn btn-green d-flex align-items-center gap-2 px-3 py-2" onClick={handleStartAdd}>
                <i className="bi bi-plus-lg"></i> Add Equipment
              </button>
            )}
          </div>

          {/* Search and Filters Bar */}
          <div className="row g-3 mb-4">
            <div className="col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="Search equipment..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ outline: 'none', boxShadow: 'none' }}
                />
              </div>
            </div>
            <div className="col-md-3 col-6">
              <select 
                className="form-select" 
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Departments</option>
                {departmentsList && departmentsList.length > 0 ? (
                  departmentsList.map(dept => (
                    <option key={dept._id || dept.name} value={dept.name}>{dept.name}</option>
                  ))
                ) : (
                  <>
                    <option value="Emergency">Emergency</option>
                    <option value="ICU">ICU</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Administration">Administration</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-md-3 col-6">
              <select 
                className="form-select" 
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Status</option>
                <option value="Working">Working</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Faulty">Faulty</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
          </div>

          {/* Equipment Table */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
              <p className="text-muted mt-2">Loading equipment registers...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="text-center py-5 text-muted border rounded">
              <i className="bi bi-cpu fs-1 mb-2 d-block text-secondary"></i>
              No equipment registers matching selected filters.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Equipment Name</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Next Maintenance</th>
                    <th>Warranty Expiry</th>
                    {activeRole === 'Manager' && <th className="text-end pe-3">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((eq) => {
                    const itemEqId = eq.equipmentId || eq.equipment_id || '';
                    const itemEqName = eq.name || eq.equipment_name || '';
                    // Check if this was the last added item to give a visual indicator
                    const isNewItem = lastAddedEquipment && (lastAddedEquipment.equipmentId === itemEqId || lastAddedEquipment.equipment_id === itemEqId);
                    
                    return (
                      <tr 
                        key={eq._id} 
                        style={isNewItem ? { borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4' } : {}}
                      >
                        <td className="font-monospace fw-bold">{itemEqId}</td>
                        <td>
                          <strong>{itemEqName}</strong>
                          <span className="text-muted small d-block font-monospace">{eq.manufacturer} &bull; {eq.model}</span>
                        </td>
                        <td>{eq.department}</td>
                        <td>
                          <span 
                            className="status-badge" 
                            style={getStatusBadgeStyle(eq.status)}
                          >
                            <i className="bi bi-circle-fill" style={{ fontSize: '0.45rem' }}></i>
                            {getDisplayStatusLabel(eq.status)}
                          </span>
                        </td>
                        <td className="font-monospace">{formatDate(eq.nextPreventiveMaintenance)}</td>
                        <td className="font-monospace">
                          <span>{formatDate(eq.warrantyExpiration)}</span>
                          {eq.warrantyExpiration && (
                            <span 
                              className="d-block"
                              style={{ 
                                fontSize: '0.72rem', 
                                color: new Date(eq.warrantyExpiration) < new Date() ? '#ef4444' : '#10b981',
                                fontWeight: '600'
                              }}
                            >
                              {new Date(eq.warrantyExpiration) < new Date() ? 'Expired' : 'Under Warranty'}
                            </span>
                          )}
                        </td>
                        {activeRole === 'Manager' && (
                          <td className="text-end pe-3">
                            <button 
                              className="btn btn-sm btn-outline-primary me-2"
                              title="Edit Equipment"
                              onClick={() => handleStartEdit(eq)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              title="Delete Equipment"
                              onClick={() => setDeleteCandidate(eq)}
                            >
                              <i className="bi bi-trash"></i>
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

          {/* Pagination Footer */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mt-4 gap-2 border-top pt-3">
            <span className="text-muted small font-monospace">
              Showing {totalEntries === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
            </span>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Items per page:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <nav>
                <ul className="pagination pagination-sm m-0 gap-1">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link rounded" onClick={() => handlePageChange(currentPage - 1)}>&lt;</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                      <button 
                        className="page-link rounded font-monospace" 
                        style={currentPage === i + 1 ? { backgroundColor: '#10b981', borderColor: '#10b981' } : {}}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link rounded" onClick={() => handlePageChange(currentPage + 1)}>&gt;</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD / EDIT EQUIPMENT FORM VIEW */}
      {viewMode === 'add' && (
        <div className="card-clean" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h4 className="fw-bold mb-4" style={{ color: 'var(--light-text-main)' }}>
            {editingEquipmentId ? 'Edit Equipment' : 'Add Equipment'}
          </h4>
          
          <form onSubmit={handleSaveEquipment}>
            <div className="row g-4">
              
              {/* Column 1 */}
              <div className="col-md-6 d-flex flex-column gap-3">
                <div>
                  <label className="form-label small fw-bold text-muted">Asset ID *</label>
                  <input 
                    type="text" 
                    name="equipmentId"
                    className="form-control text-muted" 
                    required 
                    value={formData.equipmentId} 
                    onChange={handleInputChange} 
                    disabled
                  />
                </div>
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-bold mb-0">Category *</label>
                    {!isAddingCat ? (
                      <button 
                        type="button" 
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => setIsAddingCat(true)}
                        style={{ fontSize: '0.75rem' }}
                      >
                        <i className="bi bi-plus-circle me-1"></i>Add Category
                      </button>
                    ) : (
                      <div className="d-flex gap-1 align-items-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text" 
                          placeholder="New category..." 
                          className="form-control form-control-sm text-dark bg-white"
                          value={newCatInput}
                          onChange={(e) => setNewCatInput(e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '1px 5px', width: '110px' }}
                        />
                        <button 
                          type="button" 
                          className="btn btn-sm btn-success py-0 px-1" 
                          style={{ fontSize: '0.7rem' }}
                          onClick={handleSaveNewCategory}
                        >
                          Add
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-secondary py-0 px-1" 
                          style={{ fontSize: '0.7rem' }}
                          onClick={() => {
                            setIsAddingCat(false);
                            setNewCatInput('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="position-relative w-100">
                    <button 
                      type="button"
                      className="form-select text-start d-flex justify-content-between align-items-center bg-white text-dark"
                      onClick={() => {
                        setIsSelectOpen(!isSelectOpen);
                        setManageCategory(null);
                        setEditingCategoryValue(null);
                        setDeleteConfirmValue(null);
                      }}
                    >
                      {categories.find(c => c.value === formData.category)?.label || 'Select Category'}
                    </button>
                    {isSelectOpen && (
                      <ul className="dropdown-menu show w-100 shadow-lg py-1 mt-1 bg-white" style={{ display: 'block', zIndex: 1000, maxHeight: '250px', overflowY: 'auto' }}>
                        {categories.map(cat => (
                          <li 
                            key={cat.value} 
                            className="dropdown-item d-flex justify-content-between align-items-center py-2 px-3 position-relative"
                            style={{ cursor: 'pointer' }}
                            onClick={(e) => {
                              if (e.target.closest('.dropdown-dots-container') || e.target.closest('.inline-edit-container')) return;
                              setFormData(prev => ({ ...prev, category: cat.value }));
                              setIsSelectOpen(false);
                              setManageCategory(null);
                              setEditingCategoryValue(null);
                              setDeleteConfirmValue(null);
                            }}
                          >
                            {editingCategoryValue === cat.value ? (
                              <div className="d-flex gap-1 align-items-center inline-edit-container w-100" onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm text-dark bg-white"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  style={{ fontSize: '0.8rem', padding: '2px 5px' }}
                                />
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-success py-0 px-2"
                                  onClick={() => handleSaveCategoryRename(cat.value)}
                                >
                                  Save
                                </button>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-secondary py-0 px-2"
                                  onClick={() => setEditingCategoryValue(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : deleteConfirmValue === cat.value ? (
                              <div className="d-flex gap-2 align-items-center inline-edit-container w-100" onClick={(e) => e.stopPropagation()}>
                                <span className="text-danger small fw-bold">Delete?</span>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-danger py-0 px-2"
                                  onClick={() => handleConfirmDeleteCategory(cat.value)}
                                >
                                  Yes
                                </button>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-secondary py-0 px-2"
                                  onClick={() => setDeleteConfirmValue(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-dark">{cat.label}</span>
                                <div className="dropdown-dots-container d-flex gap-1 align-items-center" onClick={(e) => e.stopPropagation()}>
                                  {manageCategory === cat.value ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-link btn-sm p-1 text-secondary"
                                        onClick={() => {
                                          setEditingCategoryValue(cat.value);
                                          setNewCategoryName(cat.label);
                                          setManageCategory(null);
                                        }}
                                        title="Rename"
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-link btn-sm p-1 text-danger"
                                        onClick={() => {
                                          setDeleteConfirmValue(cat.value);
                                          setManageCategory(null);
                                        }}
                                        title="Delete"
                                      >
                                        <i className="bi bi-trash"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-link btn-sm p-1 text-muted"
                                        onClick={() => setManageCategory(null)}
                                        title="Back"
                                      >
                                        <i className="bi bi-x-circle"></i>
                                      </button>
                                    </>
                                  ) : (
                                    <i 
                                      className="bi bi-three-dots-vertical text-dark cursor-pointer px-1 py-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setManageCategory(cat.value);
                                      }}
                                    ></i>
                                  )}
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div>
                  <label className="form-label small fw-bold">Location</label>
                  <input 
                    type="text" 
                    name="location"
                    className="form-control" 
                    placeholder="ICU Room 202" 
                    value={formData.location} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold">Model</label>
                  <input 
                    type="text" 
                    name="model"
                    className="form-control" 
                    placeholder="V60" 
                    value={formData.model} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold">Installation Date *</label>
                  <input 
                    type="date" 
                    name="installationDate"
                    className="form-control" 
                    required 
                    value={formData.installationDate || ''} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              {/* Column 2 */}
              <div className="col-md-6 d-flex flex-column gap-3">
                <div>
                  <label className="form-label small fw-bold">Equipment Name *</label>
                  <input 
                    type="text" 
                    name="name"
                    className="form-control" 
                    placeholder="Ventilator" 
                    required 
                    value={formData.name} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold">Department *</label>
                  <select 
                    name="department"
                    className="form-select"
                    value={formData.department} 
                    onChange={handleInputChange}
                  >
                    {departmentsList && departmentsList.length > 0 ? (
                      departmentsList.map(dept => (
                        <option key={dept._id || dept.name} value={dept.name}>{dept.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="ICU">ICU</option>
                        <option value="Emergency">Emergency</option>
                        <option value="OPD">OPD</option>
                        <option value="Laboratory">Laboratory</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Radiology">Radiology</option>
                        <option value="Administration">Administration</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="form-label small fw-bold">Brand</label>
                  <input 
                    type="text" 
                    name="brand"
                    className="form-control" 
                    placeholder="Philips" 
                    value={formData.brand} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div>
                  <label className="form-label small fw-bold">Status</label>
                  <select 
                    name="status"
                    className="form-select"
                    value={formData.status} 
                    onChange={handleInputChange}
                  >
                    <option value="Working">Working</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Faulty">Faulty (Broken)</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="form-label small fw-bold">Maintenance Interval *</label>
                  <select 
                    name="maintenanceInterval"
                    className="form-select"
                    value={formData.maintenanceInterval} 
                    onChange={handleInputChange}
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                  </select>
                </div>
                <div>
                  <label className="form-label small fw-bold">Warranty Expiry *</label>
                  <select 
                    name="warrantyPeriod"
                    className="form-select"
                    value={formData.warrantyPeriod} 
                    onChange={handleInputChange} 
                  >
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="4 Years">4 Years</option>
                    <option value="5 Years">5 Years</option>
                  </select>
                  {formData.installationDate ? (
                    <div className="small text-muted mt-1 font-monospace">
                      <i className="bi bi-shield-check text-success me-1"></i>
                      Expires: <strong className="text-dark">{formatDate(calculateWarrantyExpiration(formData.installationDate, formData.warrantyPeriod))}</strong>
                    </div>
                  ) : (
                    <div className="small text-muted mt-1">
                      <i className="bi bi-info-circle me-1"></i>Calculated from installation date
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Form Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-5">
              <button 
                type="button" 
                className="btn btn-outline-secondary px-4 py-2"
                onClick={() => {
                  setEditingEquipmentId(null);
                  setViewMode('list');
                }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-green px-4 py-2"
              >
                {editingEquipmentId ? 'Update Equipment' : 'Save Equipment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. REGISTRATION SUCCESS VIEW */}
      {viewMode === 'success' && lastAddedEquipment && (
        <div className="card-clean success-card fade-in">
          <div className="success-icon-circle shadow-sm">
            <i className="bi bi-check-lg"></i>
          </div>
          
          <h3 className="fw-bold mb-1">Equipment Added Successfully!</h3>
          <p className="text-muted small mb-4">The device record has been registered and scheduled for preventive audits.</p>
          
          <div className="p-3 border rounded text-start mb-4 bg-light">
            <div className="row g-2 font-monospace small">
              <div className="col-5 text-muted text-uppercase">Asset ID:</div>
              <div className="col-7 text-dark fw-bold">{lastAddedEquipment.equipmentId}</div>
              <div className="col-5 text-muted text-uppercase">Equipment:</div>
              <div className="col-7 text-dark fw-bold">{lastAddedEquipment.name}</div>
              <div className="col-5 text-muted text-uppercase">Next Due PM:</div>
              <div className="col-7 text-success fw-bold">{formatDate(lastAddedEquipment.nextPreventiveMaintenance)}</div>
              <div className="col-5 text-muted text-uppercase">Warranty Expiry:</div>
              <div className="col-7 text-dark fw-bold">{formatDate(lastAddedEquipment.warrantyExpiration)}</div>
            </div>
          </div>

          <button 
            className="btn btn-green w-100 py-2"
            onClick={() => {
              setCurrentPage(1);
              setViewMode('list');
            }}
          >
            View Equipment
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content card-clean p-3">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill"></i> Delete Equipment
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteCandidate(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-2">Are you sure you want to delete this equipment record?</p>
                <div className="p-3 bg-light rounded border">
                  <strong>{deleteCandidate.name}</strong> <span className="font-monospace text-muted">({deleteCandidate.equipmentId})</span>
                  <div className="small text-muted">{deleteCandidate.department} &bull; {deleteCandidate.model}</div>
                </div>
                <p className="text-muted small mt-2 mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-0 pt-0 d-flex gap-2 justify-content-end">
                <button className="btn btn-outline-secondary px-3" onClick={() => setDeleteCandidate(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger px-3" onClick={handleConfirmDelete}>
                  Delete Equipment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default EquipmentInventory;
