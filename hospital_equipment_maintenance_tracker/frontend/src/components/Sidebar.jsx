import React from 'react';

export function Sidebar({
  activeRole,
  activeView,
  setActiveView,
  notifications = [],
  currentUser,
  handleLogout,
  hospitalProfile
}) {
  const profile = hospitalProfile || (() => {
    try {
      const saved = localStorage.getItem('hospital_profile_settings');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  })();

  const iconClass = profile?.icon || 'bi-shield-plus';
  const hospitalName = profile?.name || 'Hospital Equipment';
  const hospitalSub = profile?.subtitle || 'Maintenance Tracker';

  const getSidebarActiveCSS = (viewName) => {
    if (activeView !== viewName) return '';
    if (viewName === 'equipment') return 'active-green';
    if (viewName === 'report_issue') return 'active-blue';
    if (viewName === 'maintenance') return 'active-blue';
    if (viewName === 'dashboard' || viewName === 'history' || viewName === 'complaints_history' || viewName === 'maintenance_history') return 'active-purple';
    if (viewName === 'reports') return 'active-orange';
    return 'active-green';
  };

  return (
    <aside className="app-sidebar">
      {/* Faded Background Pattern */}
      <div className="sidebar-bg-overlay"></div>

      <div className="sidebar-header d-flex align-items-center gap-2">
        <span className="text-white fs-4"><i className={`bi ${iconClass}`}></i></span>
        <div style={{ overflow: 'hidden' }}>
          <h1 className="sidebar-brand-title text-truncate m-0" style={{ fontSize: '1.05rem' }}>{hospitalName}</h1>
          <div className="sidebar-brand-subtitle text-truncate" style={{ fontSize: '0.75rem' }}>{hospitalSub}</div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {activeRole !== 'Staff' && (
          <button 
            className={`sidebar-item ${getSidebarActiveCSS('dashboard')}`}
            onClick={() => setActiveView('dashboard')}
          >
            <i className="bi bi-grid-1x2-fill"></i> Dashboard
          </button>
        )}
        {activeRole !== 'Staff' && (
          <button 
            className={`sidebar-item ${getSidebarActiveCSS('equipment')}`}
            onClick={() => setActiveView('equipment')}
          >
            <i className="bi bi-cpu-fill"></i> Equipment
          </button>
        )}
        <button 
          className={`sidebar-item ${getSidebarActiveCSS('report_issue')}`}
          onClick={() => setActiveView('report_issue')}
        >
          <i className="bi bi-exclamation-octagon-fill"></i> Report Issue
        </button>
        <button 
          className={`sidebar-item ${getSidebarActiveCSS('maintenance')}`}
          onClick={() => setActiveView('maintenance')}
          style={{ justifyContent: 'space-between' }}
        >
          <span className="d-flex align-items-center gap-2">
            <i className="bi bi-wrench-adjustable-circle-fill"></i> Complaints
          </span>
          {activeRole !== 'Staff' && notifications.filter(n => n.type === 'new_issue').length > 0 && (
            <span className="badge rounded-pill" style={{ backgroundColor: '#f97316', color: '#fff', fontSize: '0.6rem', minWidth: '18px' }}>
              {notifications.filter(n => n.type === 'new_issue').length}
            </span>
          )}
        </button>
        {/* Complaints History */}
        <button 
          className={`sidebar-item ${getSidebarActiveCSS('complaints_history')} ${(activeView === 'history' || activeView === 'complaints_history') ? 'active-purple' : ''}`}
          onClick={() => setActiveView('complaints_history')}
          style={{ justifyContent: 'space-between' }}
        >
          <span className="d-flex align-items-center gap-2">
            <i className="bi bi-clock-history"></i> Complaints History
          </span>
          {activeRole === 'Staff' && notifications.filter(n => n.type === 'repair_complete').length > 0 && (
            <span className="badge rounded-pill" style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '0.6rem', minWidth: '18px' }}>
              {notifications.filter(n => n.type === 'repair_complete').length}
            </span>
          )}
        </button>

        {/* Maintenance History */}
        {activeRole !== 'Staff' && (
          <button 
            className={`sidebar-item ${getSidebarActiveCSS('maintenance_history')} ${activeView === 'maintenance_history' ? 'active-purple' : ''}`}
            onClick={() => setActiveView('maintenance_history')}
          >
            <i className="bi bi-tools"></i> Maintenance History
          </button>
        )}
        {activeRole !== 'Staff' && (
          <>
            <button 
              className={`sidebar-item ${getSidebarActiveCSS('departments')}`}
              onClick={() => setActiveView('departments')}
            >
              <i className="bi bi-hospital"></i> Departments
            </button>
            <button 
              className={`sidebar-item ${getSidebarActiveCSS('technicians')}`}
              onClick={() => setActiveView('technicians')}
            >
              <i className="bi bi-people-fill"></i> Technicians
            </button>
            <button 
              className={`sidebar-item ${getSidebarActiveCSS('reports')}`}
              onClick={() => setActiveView('reports')}
            >
              <i className="bi bi-file-earmark-bar-graph-fill"></i> Reports
            </button>
            <button 
              className={`sidebar-item ${getSidebarActiveCSS('settings')}`}
              onClick={() => setActiveView('settings')}
            >
              <i className="bi bi-gear-fill"></i> Settings
            </button>
          </>
        )}
      </nav>

      {/* Bottom Sidebar Profile block */}
      <div className="sidebar-footer">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="profile-avatar text-dark bg-white border border-light"
            style={{ fontSize: '0.8rem', fontWeight: 'bold', width: '38px', height: '38px', flexShrink: 0 }}
          >
            {currentUser?.initials || 'AD'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="text-white fw-bold text-truncate" style={{ fontSize: '0.88rem', maxWidth: '160px' }}>
              {currentUser?.name || 'Admin'}
            </div>
            <div className="text-white-50 text-truncate" style={{ fontSize: '0.72rem', maxWidth: '160px' }}>
              {activeRole === 'Manager' ? 'System Administrator' : (activeRole === 'Staff' ? 'Department' : activeRole)}
            </div>
          </div>
        </div>
        <button
          className="btn btn-outline-light w-100 py-1.5 d-flex align-items-center justify-content-center gap-2"
          style={{ fontSize: '0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#ffffff' }}
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-left"></i> Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
