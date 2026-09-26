import React, { useState, useEffect } from 'react';

export const applyAccentTheme = (colorKey) => {
  const root = document.documentElement;
  const map = {
    cyan: { primary: '#0284c7', rgb: '2, 132, 199', cyan: '#00f2fe', blue: '#0284c7' },
    emerald: { primary: '#059669', rgb: '5, 150, 105', cyan: '#34d399', blue: '#10b981' },
    purple: { primary: '#7c3aed', rgb: '124, 58, 237', cyan: '#a78bfa', blue: '#8b5cf6' },
    crimson: { primary: '#e11d48', rgb: '225, 29, 72', cyan: '#fb7185', blue: '#f43f5e' },
    amber: { primary: '#d97706', rgb: '217, 119, 6', cyan: '#fbbf24', blue: '#f59e0b' },
    sapphire: { primary: '#1d4ed8', rgb: '29, 78, 216', cyan: '#60a5fa', blue: '#2563eb' },
    teal: { primary: '#0f766e', rgb: '15, 118, 110', cyan: '#2dd4bf', blue: '#14b8a6' },
    rose: { primary: '#be185d', rgb: '190, 24, 93', cyan: '#f472b6', blue: '#ec4899' },
    jade: { primary: '#15803d', rgb: '21, 128, 61', cyan: '#4ade80', blue: '#22c55e' },
    violet: { primary: '#6d28d9', rgb: '109, 40, 217', cyan: '#c084fc', blue: '#a855f7' },
    orange: { primary: '#ea580c', rgb: '234, 88, 12', cyan: '#fb923c', blue: '#f97316' },
    slate: { primary: '#334155', rgb: '51, 65, 85', cyan: '#94a3b8', blue: '#475569' }
  };

  const theme = map[colorKey] || map.cyan;
  root.style.setProperty('--bs-primary', theme.primary);
  root.style.setProperty('--bs-primary-rgb', theme.rgb);
  root.style.setProperty('--accent-cyan', theme.cyan);
  root.style.setProperty('--accent-blue', theme.blue);
};

export function SettingsManager({ isDarkMode, setIsDarkMode, showAlert, hospitalProfile, setHospitalProfile }) {
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('hospital_profile_settings');
    return saved ? JSON.parse(saved) : (hospitalProfile || {
      name: 'CityCare Hospital',
      phone: '+1 (800) 555-0199',
      email: 'support@citycarehospital.org',
      address: '742 Evergreen Terrace, Medical District',
      icon: 'bi-shield-plus'
    });
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
    if (setHospitalProfile) {
      setHospitalProfile(profile);
    }
    window.dispatchEvent(new Event('storage'));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (showAlert) {
      showAlert('Settings updated successfully! Logo icon and hospital identity updated everywhere.', 'success');
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

                <div className="col-12">
                  <label className="form-label fw-semibold small d-flex justify-content-between align-items-center">
                    <span>Select Hospital Logo Icon</span>
                    <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>Current: <i className={`bi ${profile.icon} text-primary fs-6 ms-1`}></i></span>
                  </label>
                  
                  {/* Select Dropdown */}
                  <select
                    className="form-select form-select-sm mb-2"
                    name="icon"
                    value={profile.icon}
                    onChange={handleChange}
                  >
                    <option value="bi-shield-plus">🛡️ Shield Plus</option>
                    <option value="bi-heart-pulse-fill">🫀 Heart Pulse / Cardiology</option>
                    <option value="bi-hospital-fill">🏥 Hospital Building</option>
                    <option value="bi-stethoscope">🩺 Stethoscope / Medical</option>
                    <option value="bi-activity">⚡ ECG Wave / Diagnostic</option>
                    <option value="bi-crosshair2">⚕️ Medical Cross emblem</option>
                    <option value="bi-plus-circle-fill">➕ Red Cross / Plus</option>
                    <option value="bi-flask">🧪 Laboratory / Bio-Flask</option>
                    <option value="bi-bandaid-fill">🩹 First Aid / Trauma</option>
                    <option value="bi-dna">🧬 DNA / Genetics</option>
                    <option value="bi-capsule">💊 Pharmacy / Therapeutics</option>
                    <option value="bi-droplet-fill">🩸 Blood Drop / Hematology</option>
                    <option value="bi-truck">🚑 Emergency / Ambulance</option>
                    <option value="bi-building-fill-add">🏢 Medical Plaza Center</option>
                    <option value="bi-cpu-fill">💻 Biomedical Equipment Tech</option>
                  </select>

                  {/* Interactive Visual Icon Grid */}
                  <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light bg-opacity-50">
                    {[
                      { id: 'bi-shield-plus', title: 'Shield' },
                      { id: 'bi-heart-pulse-fill', title: 'Pulse' },
                      { id: 'bi-hospital-fill', title: 'Hospital' },
                      { id: 'bi-stethoscope', title: 'Stethoscope' },
                      { id: 'bi-activity', title: 'ECG' },
                      { id: 'bi-crosshair2', title: 'Cross' },
                      { id: 'bi-plus-circle-fill', title: 'Plus' },
                      { id: 'bi-flask', title: 'Lab' },
                      { id: 'bi-bandaid-fill', title: 'Trauma' },
                      { id: 'bi-dna', title: 'Genetics' },
                      { id: 'bi-capsule', title: 'Pharmacy' },
                      { id: 'bi-droplet-fill', title: 'Blood' },
                      { id: 'bi-truck', title: 'Ambulance' },
                      { id: 'bi-building-fill-add', title: 'Plaza' },
                      { id: 'bi-cpu-fill', title: 'Tech' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className={`btn btn-sm ${profile.icon === item.id ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-1 py-1 px-2`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setProfile(prev => ({ ...prev, icon: item.id }))}
                        title={item.title}
                      >
                        <i className={`bi ${item.id}`}></i>
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </div>
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
              <label className="form-label fw-semibold small mb-2 d-block">Select Accent Color Palette</label>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {[
                  { id: 'cyan', label: 'Ocean Cyan', color: '#00f2fe' },
                  { id: 'emerald', label: 'Emerald Health', color: '#10b981' },
                  { id: 'purple', label: 'Royal Amethyst', color: '#8b5cf6' },
                  { id: 'crimson', label: 'Crimson Alert', color: '#f43f5e' },
                  { id: 'amber', label: 'Warm Amber', color: '#f59e0b' },
                  { id: 'sapphire', label: 'Deep Sapphire', color: '#2563eb' },
                  { id: 'teal', label: 'Teal Turquoise', color: '#14b8a6' },
                  { id: 'rose', label: 'Rose Magenta', color: '#ec4899' },
                  { id: 'jade', label: 'Forest Jade', color: '#22c55e' },
                  { id: 'violet', label: 'Electric Violet', color: '#a855f7' },
                  { id: 'orange', label: 'Sunset Orange', color: '#f97316' },
                  { id: 'slate', label: 'Midnight Slate', color: '#64748b' }
                ].map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`btn btn-sm d-flex align-items-center gap-1 ${accentColor === c.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setAccentColor(c.id)}
                    style={{ fontSize: '0.78rem' }}
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
