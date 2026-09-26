import React from 'react';

export function SettingsManager() {
  return (
    <div className="card-clean fade-in">
      <h4 className="fw-bold mb-4"><i className="bi bi-gear-fill me-2 text-primary"></i>System Settings</h4>
      <div className="row g-4">
        <div className="col-md-4">
          <div className="p-3 border rounded bg-white">
            <h5 className="fw-bold mb-2">System Config</h5>
            <p className="text-muted small">Update maintenance schedules, default alert offsets, and diagnostic categories.</p>
            <button className="btn btn-sm btn-outline-primary">Open Config</button>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 border rounded bg-white">
            <h5 className="fw-bold mb-2">API & Integration</h5>
            <p className="text-muted small">Configure webhooks and REST integrations with external hospital logistics software.</p>
            <button className="btn btn-sm btn-outline-primary">API Settings</button>
          </div>
        </div>
        <div className="col-md-4">
          <div className="p-3 border rounded bg-white">
            <h5 className="fw-bold mb-2">Backup & Recovery</h5>
            <p className="text-muted small">Trigger localized database downloads or sync current equipment snapshots manually.</p>
            <button className="btn btn-sm btn-outline-danger">Run Backup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsManager;
