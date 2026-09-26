import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EquipmentInventory from './components/EquipmentInventory';
import MaintenanceRequests from './components/MaintenanceRequests';
import ServiceHistoryList from './components/ServiceHistoryList';
import Reports from './components/Reports';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DepartmentsManager from './components/DepartmentsManager';
import TechniciansManager from './components/TechniciansManager';
import StaffManager from './components/StaffManager';
import SettingsManager from './components/SettingsManager';

export const API_URL = 'http://localhost:5000/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRole, setActiveRole] = useState('Technician'); // Manager, Technician, Staff
  const [staffDepartment, setStaffDepartment] = useState('Emergency');
  const [activeView, setActiveView] = useState('dashboard');
  const [alert, setAlert] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [techniciansList, setTechniciansList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartmentsList(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`);
      if (res.ok) {
        const data = await res.json();
        setTechniciansList(data.filter(u => u.role === 'Technician'));
        setStaffList(data.filter(u => u.role === 'Staff'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, [isLoggedIn]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    if (user.department) {
      setStaffDepartment(user.department);
    }
    setIsLoggedIn(true);
    setActiveView(user.role === 'Staff' ? 'report_issue' : 'dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveView('dashboard');
    setAlert(null);
  };

  // Auto-clear alert after 6 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Fetch notifications for completed maintenance requests (Staff) and new pending issues (Manager/Technician)
  const fetchNotifications = async () => {
    if (!isLoggedIn) return;
    try {
      const [reqRes, histRes] = await Promise.all([
        fetch(`${API_URL}/requests`),
        fetch(`${API_URL}/requests/history/all`)
      ]);
      const data = reqRes.ok ? await reqRes.json() : [];
      const histData = histRes.ok ? await histRes.json() : [];
      const allNotifs = [];

      if (activeRole === 'Staff') {
        const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
        const deptLower = (staffDepartment || '').toLowerCase().trim();
        const userNameLower = (currentUser?.name || '').toLowerCase().trim();

        // From history records (completed tickets)
        histData.forEach(h => {
          const isDeptMatch = (h.department || '').toLowerCase().trim() === deptLower;
          const isReporterMatch = (h.reportedBy || '').toLowerCase().trim() === userNameLower;
          if ((isDeptMatch || isReporterMatch) && !dismissed.includes(h._id)) {
            allNotifs.push({
              _id: h._id,
              type: 'repair_complete',
              requestId: h.requestId,
              equipmentName: h.equipmentName || h.equipmentId,
              priority: h.priority || 'Medium',
              actionTaken: h.actionTaken,
              updatedAt: h.completedAt || h.createdAt
            });
          }
        });
      } else {
        const dismissedIssues = JSON.parse(localStorage.getItem('dismissed_issue_notifications') || '[]');
        const dismissedAssigned = JSON.parse(localStorage.getItem('dismissed_assigned_notifications') || '[]');
        const techNameLower = (currentUser?.name || '').toLowerCase().trim();

        data.forEach(r => {
          if (r.status === 'Pending' && !dismissedIssues.includes(r._id)) {
            allNotifs.push({
              _id: r._id,
              type: 'new_issue',
              requestId: r.requestId,
              equipmentName: r.equipmentName || r.equipmentId,
              priority: r.priority,
              reportedBy: r.reportedBy,
              department: r.department,
              issueDescription: r.issueDescription,
              updatedAt: r.createdAt
            });
          }
          if (activeRole === 'Technician' && r.status === 'In Progress' && r.assignedTechnician && r.assignedTechnician.toLowerCase().trim() === techNameLower && !dismissedAssigned.includes(r._id)) {
            allNotifs.push({
              _id: r._id,
              type: 'assigned_task',
              requestId: r.requestId,
              equipmentName: r.equipmentName || r.equipmentId,
              priority: r.priority,
              assignedTechnician: r.assignedTechnician,
              issueDescription: r.issueDescription,
              updatedAt: r.updatedAt || r.createdAt
            });
          }
        });
      }

      // Sort newest first
      allNotifs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setNotifications(allNotifs);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeRole, staffDepartment]);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} departmentsList={departmentsList} />;
  }

  // Format current date and time matching design
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    weekday: 'long'
  });

  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className={isDarkMode ? "dark-theme-wrapper" : "light-theme-wrapper"}>
      <div className="app-layout">
        
        {/* Modular Sidebar Component */}
        <Sidebar 
          activeRole={activeRole}
          activeView={activeView}
          setActiveView={setActiveView}
          notifications={notifications}
          currentUser={currentUser}
          handleLogout={handleLogout}
        />

        {/* Content Side */}
        <main className="app-content">
          
          {/* Modular Header Component */}
          <Header 
            activeView={activeView}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notifications={notifications}
            setNotifications={setNotifications}
            setActiveView={setActiveView}
            setSelectedRequestId={setSelectedRequestId}
            currentUser={currentUser}
            activeRole={activeRole}
          />

          {/* System Alerts */}
          {alert && (
            <div className="m-3 fade-in">
              <div className={`alert alert-${alert.type} alert-dismissible fade show shadow-sm border-0`} role="alert">
                <strong>
                  {alert.type === 'danger' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                  {alert.type === 'info' && <i className="bi bi-info-circle-fill me-2"></i>}
                  {alert.type === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
                </strong>
                {alert.message}
                <button type="button" className="btn-close" onClick={() => setAlert(null)}></button>
              </div>
            </div>
          )}

          {/* Primary View Container */}
          <div className="p-4 flex-grow-1">
            {activeView === 'dashboard' && (
              <Dashboard activeRole={activeRole} onNavigate={setActiveView} currentUser={currentUser} showAlert={showAlert} />
            )}
            {activeView === 'equipment' && (
              <EquipmentInventory 
                activeRole={activeRole} 
                staffDepartment={staffDepartment} 
                showAlert={showAlert} 
                departmentsList={departmentsList} 
              />
            )}
            {activeView === 'report_issue' && (
              <MaintenanceRequests 
                activeRole={activeRole} 
                forceMode="report" 
                staffDepartment={staffDepartment} 
                showAlert={showAlert} 
                onNavigate={setActiveView} 
                currentUser={currentUser}
                departmentsList={departmentsList}
                techniciansList={techniciansList}
              />
            )}
            {activeView === 'maintenance' && (
              <MaintenanceRequests 
                activeRole={activeRole} 
                forceMode="workorder" 
                staffDepartment={staffDepartment} 
                showAlert={showAlert} 
                onNavigate={setActiveView} 
                currentUser={currentUser}
                initialRequestId={selectedRequestId}
                clearInitialRequestId={() => setSelectedRequestId(null)}
                departmentsList={departmentsList}
                techniciansList={techniciansList}
              />
            )}
            {(activeView === 'complaints_history' || activeView === 'history') && (
              <ServiceHistoryList 
                activeRole={activeRole} 
                staffDepartment={staffDepartment} 
                currentUser={currentUser} 
                viewMode="complaints"
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'maintenance_history' && (
              <ServiceHistoryList 
                activeRole={activeRole} 
                staffDepartment={staffDepartment} 
                currentUser={currentUser} 
                viewMode="maintenance"
                onNavigate={setActiveView}
              />
            )}
            {activeView === 'technicians' && (
              <TechniciansManager 
                activeRole={activeRole} 
                techniciansList={techniciansList} 
                onRefresh={fetchUsers} 
                showAlert={showAlert} 
              />
            )}
            {activeView === 'departments' && (
              <DepartmentsManager 
                activeRole={activeRole} 
                departmentsList={departmentsList} 
                onRefresh={fetchDepartments} 
                showAlert={showAlert} 
              />
            )}
            {activeView === 'reports' && activeRole !== 'Staff' && (
              <Reports />
            )}
            {activeView === 'settings' && (
              <SettingsManager 
                isDarkMode={isDarkMode} 
                setIsDarkMode={setIsDarkMode} 
                showAlert={showAlert} 
              />
            )}
          </div>

          {/* Footer */}
          <footer className="py-3 px-4 mt-auto border-top text-muted" style={{ backgroundColor: isDarkMode ? 'var(--bg-secondary)' : '#ffffff', borderTopColor: isDarkMode ? 'var(--card-border)' : '#f1f5f9', fontSize: '0.85rem' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>CityCare Hospital Equipment Tracker &copy; 2026</div>
              <div className="small font-monospace">
                Server: {API_URL} | Database: <span className="text-success"><i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }}></i> Operational</span>
              </div>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}

export default App;
