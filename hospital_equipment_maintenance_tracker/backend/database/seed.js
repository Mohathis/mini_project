import Admin from '../models/Admin.js';
import Department from '../models/Department.js';
import Technician from '../models/Technician.js';
import Equipment from '../models/Equipment.js';
import Complaint from '../models/Complaint.js';
import Maintenance from '../models/Maintenance.js';
import Report from '../models/Report.js';

// Also import legacy models for backwards compatibility
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import ServiceHistory from '../models/ServiceHistory.js';
import User from '../models/User.js';

export async function seedDatabase() {
  try {
    // 1. Seed Admins
    const adminCount = await Admin.countDocuments({});
    if (adminCount === 0) {
      console.log('Seeding initial Admins...');
      await Admin.create([
        { admin_name: 'admin', password: 'admin123' },
        { admin_name: 'manager', password: 'manager123' }
      ]);
    }

    // 2. Seed Departments
    const departmentCount = await Department.countDocuments({});
    if (departmentCount === 0) {
      console.log('Seeding initial Departments...');
      const seedDepts = [
        { department_name: 'Emergency', dept_code: 'ER', dept_head: 'Dr. Sarah Connor', total_equipment: 12, status: 'Active' },
        { department_name: 'ICU', dept_code: 'ICU', dept_head: 'Dr. John Miller', total_equipment: 8, status: 'Active' },
        { department_name: 'Radiology', dept_code: 'RAD', dept_head: 'Dr. Elena Vance', total_equipment: 5, status: 'Active' },
        { department_name: 'Laboratory', dept_code: 'LAB', dept_head: 'Dr. Alex Mercer', total_equipment: 10, status: 'Active' },
        { department_name: 'Pharmacy', dept_code: 'PHAR', dept_head: 'Dr. Gregory House', total_equipment: 4, status: 'Active' },
        { department_name: 'OPD', dept_code: 'OPD', dept_head: 'Dr. Stephen Strange', total_equipment: 6, status: 'Active' },
        { department_name: 'Administration', dept_code: 'ADM', dept_head: 'Dr. Bruce Banner', total_equipment: 15, status: 'Active' }
      ];
      await Department.create(seedDepts);
    }

    // 3. Seed Technicians
    const techCount = await Technician.countDocuments({});
    if (techCount === 0) {
      console.log('Seeding initial Technicians...');
      await Technician.create([
        { technician_name: 'John Mathew', specialization: 'Ventilators & ICU Gear', phone: '+1-555-0192', status: 'Active' },
        { technician_name: 'Robert Downey', specialization: 'Radiology & Imaging', phone: '+1-555-0144', status: 'On Shift' },
        { technician_name: 'Sarah Jenkins', specialization: 'IT & Electronic Systems', phone: '+1-555-0188', status: 'Active' }
      ]);
    }

    // 4. Seed Equipment
    const equipmentCount = await Equipment.countDocuments({});
    if (equipmentCount === 0) {
      console.log('Seeding initial Equipment...');
      await Equipment.create([
        {
          equipmentId: "EQ-1001",
          equipment_id: "EQ-1001",
          name: "Defibrillator Mindray D3",
          equipment_name: "Defibrillator Mindray D3",
          category: "Medical",
          department: "Emergency",
          location: "ER Room 2",
          model: "BeneHeart D3",
          serialNumber: "SN-9823984",
          manufacturer: "Mindray",
          installationDate: new Date("2024-03-12"),
          warrantyExpiration: new Date("2027-03-12"),
          status: "Operational",
          nextPreventiveMaintenance: new Date("2026-07-15")
        },
        {
          equipmentId: "EQ-1002",
          equipment_id: "EQ-1002",
          name: "HP LaserJet Pro Printer",
          equipment_name: "HP LaserJet Pro Printer",
          category: "IT",
          department: "Pharmacy",
          location: "Main Counter",
          model: "M404dn",
          serialNumber: "SN-PH88231",
          manufacturer: "HP",
          installationDate: new Date("2023-08-20"),
          warrantyExpiration: new Date("2025-08-20"),
          status: "Broken",
          nextPreventiveMaintenance: new Date("2026-06-10")
        },
        {
          equipmentId: "EQ-1003",
          equipment_id: "EQ-1003",
          name: "Sysmex Hematology Analyzer",
          equipment_name: "Sysmex Hematology Analyzer",
          category: "Medical",
          department: "Laboratory",
          location: "Lab Desk 1",
          model: "XN-350",
          serialNumber: "SN-SYS2298",
          manufacturer: "Sysmex",
          installationDate: new Date("2023-01-10"),
          warrantyExpiration: new Date("2026-01-10"),
          status: "Operational",
          nextPreventiveMaintenance: new Date("2026-07-02")
        },
        {
          equipmentId: "EQ-1004",
          equipment_id: "EQ-1004",
          name: "Cisco 24-Port Network Switch",
          equipment_name: "Cisco 24-Port Network Switch",
          category: "IT",
          department: "Administration",
          location: "Server Room B",
          model: "Catalyst 2960",
          serialNumber: "SN-CS87654",
          manufacturer: "Cisco Systems",
          installationDate: new Date("2022-05-15"),
          warrantyExpiration: new Date("2027-05-15"),
          status: "Operational",
          nextPreventiveMaintenance: new Date("2026-11-15")
        },
        {
          equipmentId: "EQ-1005",
          equipment_id: "EQ-1005",
          name: "GE Ultrasound Logiq E9",
          equipment_name: "GE Ultrasound Logiq E9",
          category: "Medical",
          department: "Radiology",
          location: "Scanning Room 1",
          model: "Logiq E9",
          serialNumber: "SN-GE90123",
          manufacturer: "GE Healthcare",
          installationDate: new Date("2021-11-30"),
          warrantyExpiration: new Date("2026-11-30"),
          status: "Under Maintenance",
          nextPreventiveMaintenance: new Date("2026-07-10")
        }
      ]);
    }

    // 5. Seed Complaints
    const complaintCount = await Complaint.countDocuments({});
    if (complaintCount === 0) {
      console.log('Seeding initial Complaints...');
      await Complaint.create([
        {
          equipment_id: "EQ-1002",
          department_id: "Pharmacy",
          technician_id: "",
          staff_name: "Dr. Sarah Connor",
          description: "Printer rollers jammed and burning odor emitted when warming up.",
          priority: "High",
          status: "Pending",
          complaint_date: new Date()
        },
        {
          equipment_id: "EQ-1005",
          department_id: "Radiology",
          technician_id: "Robert Downey",
          staff_name: "Alex Mercer",
          description: "Screen flickering intermittently during abdomen scans.",
          priority: "Medium",
          status: "In Progress",
          complaint_date: new Date()
        }
      ]);
    }

    // 6. Seed Maintenance
    const maintenanceCount = await Maintenance.countDocuments({});
    if (maintenanceCount === 0) {
      console.log('Seeding initial Maintenance records...');
      await Maintenance.create([
        {
          technician_id: "John Mathew",
          equipment_id: "EQ-1001",
          maintenance_id: "MAINT-1001",
          schedule_date: new Date("2026-05-10"),
          issue_date: new Date("2026-05-10"),
          cost: 320,
          maintenance_status: "Completed",
          remarks: "Replaced internal battery backup and calibrated electrical discharge output."
        }
      ]);
    }

    // 7. Seed Reports
    const reportCount = await Report.countDocuments({});
    if (reportCount === 0) {
      console.log('Seeding initial Reports...');
      await Report.create([
        {
          report_type: "Monthly Equipment Maintenance Audit",
          generated_date: new Date(),
          generated_by: "Admin Manager"
        }
      ]);
    }

    // Seed Legacy Users if empty
    const userCount = await User.countDocuments({});
    if (userCount === 0) {
      await User.create([
        { username: 'admin', password: 'admin123', name: 'Admin Manager', initials: 'AM', role: 'Manager' },
        { username: 'john', password: 'tech123', name: 'John Mathew', initials: 'JM', role: 'Technician', specialty: 'Ventilators, ECG & ICU Gear' },
        { username: 'nurse', password: 'staff123', name: 'Nurse Joy', initials: 'NJ', role: 'Staff', department: 'Emergency' }
      ]);
    }

    // Seed Legacy Maintenance Requests if empty
    const legacyReqCount = await MaintenanceRequest.countDocuments({});
    if (legacyReqCount === 0) {
      await MaintenanceRequest.create([
        {
          requestId: "MR-2001",
          equipmentId: "EQ-1002",
          issueDescription: "Printer rollers jammed and burning odor emitted when warming up.",
          priority: "High",
          reportedBy: "Dr. Sarah Connor",
          department: "Pharmacy",
          status: "Pending",
          assignedTechnician: "",
          targetCompletionDate: null,
          managerNotes: ""
        }
      ]);
    }

    console.log('All 7 MongoDB collections successfully seeded.');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
