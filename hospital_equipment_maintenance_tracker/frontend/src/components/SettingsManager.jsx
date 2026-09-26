import React, { useState, useEffect } from 'react';

export const applyAccentTheme = (colorKey) => {
  const root = document.documentElement;
  const map = {
    cyan: { primary: '#0284c7', rgb: '2, 132, 199', cyan: '#00f2fe', blue: '#0284c7' },
    emerald: { primary: '#059669', rgb: '5, 150, 105', cyan: '#34d399', blue: '#10b981' },
    purple: { primary: '#7c3aed', rgb: '124, 58, 237', cyan: '#a78bfa', blue: '#8b5cf6' },
    crimson: { primary: '#e11d48', rgb: '225, 29, 72', cyan: '#fb7185', blue: '#f43f5e' },
    amber: { primary: '#d97706', rgb: '217, 119, 6', cyan: '#fbbf24', blue: '#f59e0b' },
  };

  const theme = map[colorKey] || map.cyan;
  root.style.setProperty('--bs-primary', theme.primary);
  root.style.setProperty('--bs-primary-rgb', theme.rgb);
  root.style.setProperty('--accent-cyan', theme.cyan);
  root.style.setProperty('--accent-blue', theme.blue);
};

export function SettingsManager({ isDarkMode, setIsDarkMode, showAlert }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('hospital_profile_settings');
    return saved ? JSON.parse(saved) : {
      name: 'CityCare Hospital',
      phone: '+1 (800) 555-0199',
      email: 'support@citycarehospital.org',
      address: '742 Evergreen Terrace, Medical District',
      icon: 'bi-shield-plus'
    };
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('hospital_accent_color') || 'cyan';
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    applyAccentTheme(accentColor);
  }, [accentColor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('hospital_profile_settings', JSON.stringify(profile));
    localStorage.setItem('hospital_accent_color', accentColor);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (showAlert) {
      showAlert('Settings updated successfully! Generated reports will now reflect these details.', 'success');
    }
  };

  return (
    <div className="card-clean fade-in">
      <h4 className="fw-bold mb-4">
        <i className="bi bi-gear-fill me-2 text-primary"></i>System Settings
      </h4>

      {savedSuccess && (
        <div className="alert alert-success alert-dismissible fade show mb-4 border-0 shadow-sm" role="alert">
          <i className="bi bi-check-circle-fill me-2"></i>
          Settings saved successfully! Generated reports will now reflect your updated hospital identity.
          <button type="button" className="btn-close" onClick={() => setSavedSuccess(false)}></button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="row g-4">
          
          {/* Card 1: Hospital Profile Settings */}
          <div className="col-md-7">
            <div className="p-4 border rounded bg-white text-dark shadow-sm">
              <h5 className="fw-bold mb-2">
                <i className="bi bi-hospital me-2 text-primary"></i>Hospital Profile & Report Identity
              </h5>
              <p className="text-muted small mb-3">
                Configure hospital name, logo icon, and contact information displayed on generated equipment reports.
              </p>

              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label fw-semibold small">Hospital Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. CityCare Hospital"
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold small">Report Logo Icon</label>
                  <select
                    className="form-select form-select-sm"
                    name="icon"
                    value={profile.icon}
                    onChange={handleChange}
                  >
                    <option value="bi-shield-plus">Shield Plus</option>
                    <option value="bi-heart-pulse-fill">Heart Pulse</option>
                    <option value="bi-hospital-fill">Hospital</option>
                    <option value="bi-activity">ECG Wave</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Contact Phone Number</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    placeholder="+1 (800) 555-0199"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold small">Support Email</label>
                  <input
                    type="email"
                    className="form-control form-control-sm"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    placeholder="support@hospital.org"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold small">Facility Address</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    name="address"
                    value={profile.address}
                    onChange={handleChange}
                    placeholder="742 Evergreen Terrace, Medical District"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: UI Theme & Mode Settings */}
          <div className="col-md-5">
            <div className="p-4 border rounded bg-white text-dark shadow-sm">
              <h5 className="fw-bold mb-2">
                <i className="bi bi-palette me-2 text-primary"></i>UI Theme & Accent Options
              </h5>
              <p className="text-muted small mb-3">
                Toggle interface contrast and select your preferred primary accent color.
              </p>

              {/* Light / Dark Mode switch */}
              {setIsDarkMode && (
                <div className="d-flex align-items-center justify-content-between p-3 rounded border bg-light mb-3">
                  <div>
                    <h6 className="fw-bold m-0 small">
                      <i className={`bi ${isDarkMode ? 'bi-moon-fill text-primary' : 'bi-sun-fill text-warning'} me-2`}></i>
                      Theme Mode ({isDarkMode ? 'Dark' : 'Light'})
                    </h6>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>Toggle background contrast</span>
                  </div>
                  <div className="form-check form-switch fs-5 mb-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      role="switch"
                      checked={!!isDarkMode}
                      onChange={(e) => setIsDarkMode(e.target.checked)}
                    />
                  </div>
                </div>
              )}

              {/* Accent Color Selection */}
              <label className="form-label fw-semibold small mb-2 d-block">Select Accent Color</label>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'cyan', label: 'Cyan', color: '#00f2fe' },
                  { id: 'emerald', label: 'Emerald', color: '#10b981' },
                  { id: 'purple', label: 'Purple', color: '#8b5cf6' },
                  { id: 'crimson', label: 'Crimson', color: '#f43f5e' },
                  { id: 'amber', label: 'Amber', color: '#f59e0b' }
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-1 ${accentColor === c.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAccentColor(c.id)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color, display: 'inline-block' }}></span>
                    {c.label}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Submit Action */}
          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-primary btn-sm px-4 fw-bold">
              <i className="bi bi-save me-1"></i> Save Settings
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

export default SettingsManager;
