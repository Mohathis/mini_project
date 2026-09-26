/**
 * Re-export manager components and utilities from their dedicated modular files.
 */
export { validatePassword, validateDepartmentCode } from '../utils/validation';
export { DepartmentsManager as DepartmentsStub } from './DepartmentsManager';
export { TechniciansManager as TechniciansStub } from './TechniciansManager';
export { StaffManager as StaffStub } from './StaffManager';
export { SettingsManager as SettingsStub } from './SettingsManager';
