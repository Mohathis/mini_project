import React, { useState } from 'react';

const USERS = {
  Admin: { username: 'admin', password: 'admin123', name: 'Admin Manager', initials: 'AM' },
  Technician: { username: 'john', password: 'tech123', name: 'John Mathew', initials: 'JM' },
  Staff: { username: 'nurse', password: 'staff123', name: 'Nurse Joy', initials: 'NJ', department: 'Emergency' },
};
// Backward compatibility alias
USERS.Manager = USERS.Admin;

const ROLE_CONFIG = {
  Admin: {
    icon: 'bi-shield-lock-fill',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.4)',
    label: 'Admin',
    desc: 'Full system access',
  },
  Technician: {
    icon: 'bi-wrench-adjustable-circle-fill',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.4)',
    label: 'Technician',
    desc: 'Equipment & repairs',
  },
  Staff: {
    icon: 'bi-person-badge-fill',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.4)',
    label: 'Department',
    desc: 'Report & check status',
  },
};


export default function Login({ onLogin, departmentsList }) {
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [selectedDepartment, setSelectedDepartment] = useState('Emergency');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const roleConf = ROLE_CONFIG[selectedRole] || ROLE_CONFIG.Admin;

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
    setUsername('');
    setPassword('');
  };

  const fillDemo = () => {
    const u = USERS[selectedRole] || USERS.Admin;
    setUsername(u.username);
    setPassword(u.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const roleToSend = selectedRole === 'Admin' ? 'Manager' : selectedRole;
      const res = await fetch(`http://localhost:5000/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: roleToSend })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin({
          ...data,
          department: data.department || 'Administration'
        });
      } else {
        setError(data.message || 'Invalid username or password.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      setError('Connection to server failed.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated blobs */}
      <div className="login-blob blob-1" />
      <div className="login-blob blob-2" />
      <div className="login-blob blob-3" />

      <div className={`login-card ${shake ? 'login-shake' : ''}`} style={{ '--role-color': roleConf.color, '--role-border': roleConf.border, '--role-bg': roleConf.bg }}>
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo">
            <i className="bi bi-shield-plus" />
          </div>
          <div>
            <h1 className="login-brand-title">HOSPITAL EQUIPMEN</h1>
            <p className="login-brand-sub"> Maintenance Tracker</p>
          </div>
        </div>

        <div className="login-divider" />

        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subheading">Select your role and sign in to continue</p>

        {/* Role Selector */}
        <div className="role-selector">
          {Object.entries(ROLE_CONFIG).map(([role, conf]) => (
            <button
              key={role}
              type="button"
              className={`role-card ${selectedRole === role ? 'role-card-active' : ''}`}
              style={selectedRole === role ? {
                background: conf.bg,
                borderColor: conf.border,
                color: conf.color,
                boxShadow: `0 8px 24px -6px ${conf.color}50, 0 0 0 1px ${conf.border}`,
              } : {}}
              onClick={() => handleRoleSelect(role)}
            >
              <i className={`bi ${conf.icon} role-card-icon`}
                style={selectedRole === role ? { color: conf.color } : {}} />
              <span className="role-card-label">{conf.label}</span>
              <span className="role-card-desc">{conf.desc}</span>
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">

          <div className="login-field">
            <label htmlFor="login-username" className="login-label">
              <i className="bi bi-person-fill me-1" /> Username
            </label>
            <input
              id="login-username"
              type="text"
              className="login-input"
              placeholder={`Enter username`}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">
              <i className="bi bi-lock-fill me-1" /> Password
            </label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? 'bi-eye' : 'bi-eye-slash'}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <i className="bi bi-exclamation-triangle-fill me-2" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            style={{ background: `linear-gradient(135deg, ${roleConf.color}, ${roleConf.color}cc)` }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" /> Signing in...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2" />
                Sign In as {roleConf?.label || selectedRole}
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="demo-creds">
          <div className="demo-creds-header">
            <i className="bi bi-info-circle me-1" />
            Demo Credentials
          </div>
          <div className="demo-creds-row">
            <span className="demo-creds-key">Username:</span>
            <code className="demo-creds-val">{USERS[selectedRole]?.username}</code>
            <span className="demo-creds-key ms-3">Password:</span>
            <code className="demo-creds-val">{USERS[selectedRole]?.password}</code>
            <button type="button" className="demo-fill-btn" onClick={fillDemo}>
              <i className="bi bi-lightning-fill me-1" />Autofill
            </button>
          </div>
        </div>

        <p className="login-footer-text">
          CityCare Hospital &copy; 2026 &mdash; Equipment Tracker v1.0
        </p>
      </div>
    </div>
  );
}
