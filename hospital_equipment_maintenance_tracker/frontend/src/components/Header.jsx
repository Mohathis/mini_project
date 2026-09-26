import React from 'react';

export function Header({
  activeView,
  formattedDate,
  formattedTime,
  isDarkMode,
  setIsDarkMode,
  showNotifications,
  setShowNotifications,
  notifications = [],
  setNotifications,
  setActiveView,
  setSelectedRequestId,
  currentUser,
  activeRole
}) {
  return (
    <header className="content-header shadow-sm py-3 px-4" style={{ backgroundColor: isDarkMode ? 'var(--bg-secondary)' : '#ffffff', borderBottom: isDarkMode ? '1px solid var(--card-border)' : '1px solid #f1f5f9' }}>
      <div className="d-flex align-items-center gap-3">
        <button className={`btn p-0 border-0 fs-4 ${isDarkMode ? 'text-white' : 'text-dark'}`} style={{ outline: 'none' }}>
          <i className="bi bi-list"></i>
        </button>
        <h3 className="content-header-title text-capitalize fw-bold m-0" style={{ fontSize: '1.45rem', color: isDarkMode ? 'var(--text-main)' : '#0f172a' }}>
          {activeView === 'report_issue' 
            ? 'report issue' 
            : (activeView === 'complaints_history' || activeView === 'history')
              ? 'complaints history' 
              : activeView === 'maintenance_history'
                ? 'equipment maintenance history'
                : activeView}
        </h3>
      </div>

      <div className="d-flex align-items-center gap-4">
        {/* Date & Time display */}
        <div className="d-none d-lg-flex align-items-center gap-4 text-muted small">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar3 text-secondary"></i>
            <span>{formattedDate}</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-clock text-secondary"></i>
            <span>{formattedTime}</span>
          </div>
        </div>


        {/* Notification icon */}
        <div className="position-relative" style={{ zIndex: 1050 }}>
          <div 
            className="cursor-pointer text-muted fs-5 position-relative"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ outline: 'none' }}
          >
            <i className="bi bi-bell"></i>
            {notifications.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" style={{ fontSize: '0.55rem', padding: '0.25em 0.4em' }}>
                {notifications.length}
              </span>
            )}
          </div>

          {showNotifications && (
            <div className="notifications-dropdown card-clean position-absolute shadow-lg p-0" style={{
              top: '40px',
              right: '0px',
              width: '340px',
              maxHeight: '420px',
              overflowY: 'auto',
              border: '1px solid var(--light-border)',
              borderRadius: '12px',
              backgroundColor: '#ffffff'
            }}>
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light" style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                <span className="fw-bold small text-dark">
                  <i className="bi bi-bell-fill me-2 text-primary"></i>
                  Notifications
                  {notifications.length > 0 && (
                    <span className="badge bg-danger ms-2 rounded-pill" style={{ fontSize: '0.6rem' }}>
                      {notifications.length}
                    </span>
                  )}
                </span>
                {notifications.length > 0 && (
                  <button
                    className="btn btn-link btn-sm p-0 text-decoration-none small text-muted font-monospace"
                    style={{ fontSize: '0.72rem' }}
                    onClick={() => {
                      // Dismiss all issues, assigned tasks and repairs
                      const dismissedIssues = JSON.parse(localStorage.getItem('dismissed_issue_notifications') || '[]');
                      const dismissedAssigned = JSON.parse(localStorage.getItem('dismissed_assigned_notifications') || '[]');
                      const dismissedRepairs = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
                      notifications.forEach(n => {
                        if (n.type === 'new_issue') dismissedIssues.push(n._id);
                        else if (n.type === 'assigned_task') dismissedAssigned.push(n._id);
                        else dismissedRepairs.push(n._id);
                      });
                      localStorage.setItem('dismissed_issue_notifications', JSON.stringify(dismissedIssues));
                      localStorage.setItem('dismissed_assigned_notifications', JSON.stringify(dismissedAssigned));
                      localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedRepairs));
                      setNotifications([]);
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted small">
                    <i className="bi bi-bell-slash d-block fs-3 mb-2 text-secondary"></i>
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className="notification-item cursor-pointer"
                      style={{
                        borderLeft: n.type === 'new_issue' ? '3px solid #f97316' : n.type === 'assigned_task' ? '3px solid #3b82f6' : '3px solid #10b981',
                        backgroundColor: n.type === 'new_issue' ? '#fffbf5' : n.type === 'assigned_task' ? '#eff6ff' : '#f0fdf4',
                        borderRadius: '8px',
                        marginBottom: '6px',
                        padding: '10px 12px',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        if (n.type === 'new_issue') {
                          const dismissed = JSON.parse(localStorage.getItem('dismissed_issue_notifications') || '[]');
                          dismissed.push(n._id);
                          localStorage.setItem('dismissed_issue_notifications', JSON.stringify(dismissed));
                        } else if (n.type === 'assigned_task') {
                          const dismissed = JSON.parse(localStorage.getItem('dismissed_assigned_notifications') || '[]');
                          dismissed.push(n._id);
                          localStorage.setItem('dismissed_assigned_notifications', JSON.stringify(dismissed));
                        } else {
                          const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
                          dismissed.push(n._id);
                          localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
                        }
                        setNotifications(prev => prev.filter(item => item._id !== n._id));
                        setShowNotifications(false);
                        if (n.type === 'repair_complete') {
                          setActiveView('complaints_history');
                        } else {
                          setActiveView('maintenance');
                          setSelectedRequestId(n.requestId);
                        }
                      }}
                    >
                      {/* Row 1: badge + timestamp */}
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="d-flex align-items-center gap-1">
                          {n.type === 'new_issue' ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316' }}>
                              🚨 New Issue
                            </span>
                          ) : n.type === 'assigned_task' ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb' }}>
                              👨‍🔧 Assigned To You
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>
                              🔧 Repaired
                            </span>
                          )}
                          <span className="badge ms-1" style={{
                            backgroundColor: n.priority === 'Emergency' ? '#fee2e2' : n.priority === 'High' ? '#fef3c7' : n.priority === 'Medium' ? '#fef9c3' : '#dbeafe',
                            color: n.priority === 'Emergency' ? '#991b1b' : n.priority === 'High' ? '#92400e' : n.priority === 'Medium' ? '#713f12' : '#1e40af',
                            fontSize: '0.6rem'
                          }}>
                            {n.priority}
                          </span>
                        </span>
                        <span className="text-muted font-monospace" style={{ fontSize: '0.6rem' }}>
                          {new Date(n.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Row 2: ticket ID + equipment */}
                      <div className="fw-bold" style={{ fontSize: '0.78rem', color: '#0f172a' }}>
                        {n.requestId} — {n.equipmentName}
                      </div>

                      {/* Row 3: detail */}
                      {n.type === 'new_issue' ? (
                        <p className="m-0 text-wrap" style={{ fontSize: '0.72rem', color: '#78350f', lineHeight: '1.3' }}>
                          Reported by <strong>{n.reportedBy}</strong> ({n.department})
                          <span className="d-block text-muted mt-1">{n.issueDescription?.substring(0, 80)}{n.issueDescription?.length > 80 ? '…' : ''}</span>
                        </p>
                      ) : n.type === 'assigned_task' ? (
                        <p className="m-0 text-wrap" style={{ fontSize: '0.72rem', color: '#1e3a8a', lineHeight: '1.3' }}>
                          Assigned to <strong>{n.assignedTechnician}</strong> for repair.
                          <span className="d-block text-muted mt-1">{n.issueDescription?.substring(0, 80)}{n.issueDescription?.length > 80 ? '…' : ''}</span>
                        </p>
                      ) : (
                        <p className="m-0 text-wrap" style={{ fontSize: '0.72rem', color: '#166534', lineHeight: '1.3' }}>
                          {n.actionTaken?.substring(0, 90)}{n.actionTaken?.length > 90 ? '…' : ''}
                        </p>
                      )}
                      <p className="m-0 text-end" style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '3px' }}>
                        {n.type === 'repair_complete' ? 'Click to view in Complaints History →' : 'Click to view in Complaints →'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile card */}
        <div className="user-profile-badge">
          <div className="text-end">
            <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
              {currentUser?.name}
            </div>
            <div className="text-muted font-monospace" style={{ fontSize: '0.7rem' }}>
              {(activeRole === 'Manager' || activeRole === 'Admin') ? 'Admin' : (activeRole === 'Staff' ? 'Department' : activeRole)}
            </div>
          </div>
          <div
            className="profile-avatar text-white"
            style={{ background: (activeRole === 'Manager' || activeRole === 'Admin') ? '#3b82f6' : activeRole === 'Staff' ? '#a855f7' : '#10b981', fontSize: '0.75rem' }}
          >
            {currentUser?.initials}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
