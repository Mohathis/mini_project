/**
 * Utility functions for validation across forms
 */

export function validatePassword(password) {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[02468]/.test(password)) {
    return "Password must include at least one even number (0, 2, 4, 6, or 8).";
  }
  return null;
}

export function validateDepartmentCode(code, departments = [], currentDeptId = null) {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return 'Department code is required.';
  }
  const clean = code.trim().toUpperCase();
  if (clean.length < 2) {
    return 'Department code must be at least 2 characters long.';
  }
  if (clean.length > 10) {
    return 'Department code cannot exceed 10 characters.';
  }
  if (!/^[A-Za-z0-9-_]+$/.test(clean)) {
    return 'Department code can only contain letters, numbers, and hyphens.';
  }
  const duplicate = departments.find(d => {
    const isSelf = currentDeptId && ((d._id || '').toString() === currentDeptId.toString());
    if (isSelf || d.isDeleted) return false;
    return d.code && d.code.trim().toUpperCase() === clean;
  });
  if (duplicate) {
    return `Department code "${clean}" is already assigned to "${duplicate.name}". Each department must have a unique code.`;
  }
  return null;
}
