export interface EmployeeFormDTO {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  position: 'Guard' | 'admin-Guard';
  assignedComplex: string;
  status: 'active' | 'inactive';
}
