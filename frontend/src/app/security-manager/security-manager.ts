import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-security-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security-manager.html',
  styleUrl: './security-manager.css',
})
export class SecurityManager implements OnInit {
  protected readonly securityManagerName = 'Security Manager';
  protected readonly securityManagerEmail = 'security@equasec.com';
  protected assignedComplexes: Array<{
    id: string;
    name: string;
    location: string;
    status: 'active' | 'inactive';
    totalUnits: number;
    employees: number;
    contractStartDate: string;
    contractEndDate: string;
  }> = [];
  protected gatedCommunities: Array<{
    id: string;
    name: string;
    complexId: string;
    status: 'active' | 'inactive';
    totalResidents: number;
    contractStartDate: string;
    contractEndDate: string;
  }> = [];
  protected securityManagers: Array<{
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    position: string;
    profilePicture: string;
    assignedComplexes: string[];
    assignedCommunities: string[];
    status: 'active' | 'inactive';
  }> = [];
  protected employees: Array<{
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    position: 'guard' | 'supervisor' | 'manager';
    assignedComplex: string;
    status: 'active' | 'inactive';
  }> = [];
  protected visitors: Array<{
    id: string;
    name: string;
    surname: string;
    phone: string;
    tenantName: string;
    tenantUnit: string;
    tenantPhone: string;
    visitDate: string;
    complexId: string;
    communityId?: string;
  }> = [];

  protected isEmployeeModalOpen = false;
  protected isComplexDetailModalOpen = false;
  protected isAssignmentModalOpen = false;
  protected isDeleteEmployeeModalOpen = false;
  protected selectedComplex: any = null;
  protected selectedComplexEmployees: any[] = [];
  protected selectedSecurityManager: any = null;
  protected selectedEmployeeToDelete: any = null;

  protected employeeForm = {
    id: '',
    name: '',
    surname: '',
    email: '',
    phone: '',
    position: 'guard' as 'guard' | 'supervisor' | 'manager',
    assignedComplex: '',
    status: 'active' as 'active' | 'inactive',
  };
  protected editingEmployeeId: string | null = null;
  protected employeeError = '';
  protected employeeSuccess = '';

  protected assignmentForm = {
    securityManagerId: '',
    assignedComplexes: [] as string[],
    assignedCommunities: [] as string[],
  };
  protected assignmentError = '';
  protected assignmentSuccess = '';

  protected searchTerm = '';
  protected filterStatus: 'all' | 'active' | 'inactive' = 'all';
  protected visitorFilterType: 'all' | 'complex' | 'community' = 'all';
  protected visitorFilterId = '';
  protected visitorStartDate = '';
  protected visitorEndDate = '';

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.loadAssignedComplexes();
    this.loadGatedCommunities();
    this.loadEmployees();
    this.loadSecurityManagers();
    this.loadVisitors();
  }

  private loadAssignedComplexes(): void {
    // Mock data - in real app, fetch from API
    this.assignedComplexes = [
      {
        id: 'complex-1',
        name: 'Complex 2925 Fleurhof',
        location: 'Johannesburg',
        status: 'active',
        totalUnits: 145,
        employees: 8,
        contractStartDate: '2022-09-15',
        contractEndDate: '2026-08-30',
      },
      {
        id: 'complex-2',
        name: 'Greenfield Estate',
        location: 'Pretoria',
        status: 'active',
        totalUnits: 98,
        employees: 6,
        contractStartDate: '2023-02-01',
        contractEndDate: '2028-08-31',
      },
      {
        id: 'complex-3',
        name: 'Sunset Gardens',
        location: 'Cape Town',
        status: 'active',
        totalUnits: 112,
        employees: 7,
        contractStartDate: '2025-01-10',
        contractEndDate: '2029-01-31',
      },
    ];
  }

  private loadGatedCommunities(): void {
    // Mock data
    this.gatedCommunities = [
      {
        id: 'gc-1',
        name: 'North Estate',
        complexId: 'complex-1',
        status: 'active',
        totalResidents: 45,
        contractStartDate: '2023-04-01',
        contractEndDate: '2026-03-31',
      },
      {
        id: 'gc-2',
        name: 'South Pavilion',
        complexId: 'complex-1',
        status: 'active',
        totalResidents: 38,
        contractStartDate: '2024-05-15',
        contractEndDate: '2029-05-15',
      },
      {
        id: 'gc-3',
        name: 'East Wing',
        complexId: 'complex-2',
        status: 'active',
        totalResidents: 28,
        contractStartDate: '2023-12-01',
        contractEndDate: '2027-11-30',
      },
    ];
  }

  private loadEmployees(): void {
    // Mock data
    this.employees = [
      {
        id: 'emp-1',
        name: 'John',
        surname: 'Ndlela',
        email: 'john.ndlela@equasec.com',
        phone: '+27 81 234 5678',
        position: 'supervisor',
        assignedComplex: 'complex-1',
        status: 'active',
      },
      {
        id: 'emp-2',
        name: 'Thabo',
        surname: 'Khumalo',
        email: 'thabo.khumalo@equasec.com',
        phone: '+27 82 345 6789',
        position: 'guard',
        assignedComplex: 'complex-1',
        status: 'active',
      },
      {
        id: 'emp-3',
        name: 'Sipho',
        surname: 'Dlamini',
        email: 'sipho.dlamini@equasec.com',
        phone: '+27 83 456 7890',
        position: 'guard',
        assignedComplex: 'complex-2',
        status: 'active',
      },
      {
        id: 'emp-4',
        name: 'Nomsa',
        surname: 'Mthembu',
        email: 'nomsa.mthembu@equasec.com',
        phone: '+27 84 567 8901',
        position: 'manager',
        assignedComplex: 'complex-3',
        status: 'active',
      },
    ];
  }

  private loadSecurityManagers(): void {
    // Mock data with profile pictures
    this.securityManagers = [
      {
        id: 'sm-1',
        name: 'Mandla',
        surname: 'Sithole',
        email: 'mandla.sithole@equasec.com',
        phone: '+27 81 111 1111',
        position: 'Senior Security Manager',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mandla',
        assignedComplexes: ['complex-1'],
        assignedCommunities: ['gc-1', 'gc-2'],
        status: 'active',
      },
      {
        id: 'sm-2',
        name: 'Lindiwe',
        surname: 'Mkhize',
        email: 'lindiwe.mkhize@equasec.com',
        phone: '+27 82 222 2222',
        position: 'Security Manager',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lindiwe',
        assignedComplexes: ['complex-2'],
        assignedCommunities: ['gc-3'],
        status: 'active',
      },
      {
        id: 'sm-3',
        name: 'Karim',
        surname: 'Hassan',
        email: 'karim.hassan@equasec.com',
        phone: '+27 83 333 3333',
        position: 'Security Manager',
        profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim',
        assignedComplexes: [],
        assignedCommunities: [],
        status: 'active',
      },
    ];
  }

  private loadVisitors(): void {
    // Mock data
    this.visitors = [
      {
        id: 'visit-1',
        name: 'Zanele',
        surname: 'Nkosi',
        phone: '+27 72 111 2222',
        tenantName: 'Nomsa Mthembu',
        tenantUnit: 'Block B, Unit 12',
        tenantPhone: '+27 71 888 1122',
        visitDate: '2026-02-11T10:30:00',
        complexId: 'complex-1',
        communityId: 'gc-1',
      },
      {
        id: 'visit-2',
        name: 'Peter',
        surname: 'Jacobs',
        phone: '+27 72 333 4444',
        tenantName: 'Thandi Moagi',
        tenantUnit: 'Unit 5',
        tenantPhone: '+27 73 444 5599',
        visitDate: '2026-02-11T12:15:00',
        complexId: 'complex-2',
      },
      {
        id: 'visit-3',
        name: 'Ayesha',
        surname: 'Khan',
        phone: '+27 72 555 6666',
        tenantName: 'Sibusiso Hadebe',
        tenantUnit: 'Block C, Unit 4',
        tenantPhone: '+27 74 222 3344',
        visitDate: '2026-02-12T09:00:00',
        complexId: 'complex-1',
        communityId: 'gc-2',
      },
      {
        id: 'visit-4',
        name: 'Sam',
        surname: 'Mokoena',
        phone: '+27 72 777 8888',
        tenantName: 'Lerato Phiri',
        tenantUnit: 'Unit 19',
        tenantPhone: '+27 76 111 7788',
        visitDate: '2026-02-12T18:45:00',
        complexId: 'complex-3',
      },
    ];
  }

  protected openEmployeeModal(): void {
    this.isEmployeeModalOpen = true;
    this.editingEmployeeId = null;
    this.resetEmployeeForm();
    this.employeeError = '';
    this.employeeSuccess = '';
  }

  protected closeEmployeeModal(): void {
    this.isEmployeeModalOpen = false;
    this.resetEmployeeForm();
  }

  protected resetEmployeeForm(): void {
    this.employeeForm = {
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      position: 'guard',
      assignedComplex: '',
      status: 'active',
    };
  }

  protected editEmployee(employee: any): void {
    this.editingEmployeeId = employee.id;
    this.employeeForm = { ...employee };
    this.isEmployeeModalOpen = true;
    this.employeeError = '';
    this.employeeSuccess = '';
  }

  protected openDeleteEmployeeModal(employee: any): void {
    this.selectedEmployeeToDelete = employee;
    this.isDeleteEmployeeModalOpen = true;
  }

  protected closeDeleteEmployeeModal(): void {
    this.isDeleteEmployeeModalOpen = false;
    this.selectedEmployeeToDelete = null;
  }

  protected confirmDeleteEmployee(): void {
    if (!this.selectedEmployeeToDelete) {
      return;
    }

    this.employees = this.employees.filter((e) => e.id !== this.selectedEmployeeToDelete.id);
    this.employeeSuccess = 'Employee deleted successfully!';
    setTimeout(() => (this.employeeSuccess = ''), 3000);
    this.closeDeleteEmployeeModal();
  }

  protected submitEmployeeForm(): void {
    if (!this.employeeForm.name || !this.employeeForm.surname || !this.employeeForm.email || !this.employeeForm.phone) {
      this.employeeError = 'Please fill in all required fields.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.employeeForm.email)) {
      this.employeeError = 'Please enter a valid email address.';
      return;
    }

    if (!/^\+?[\d\s\-()]{10,}$/.test(this.employeeForm.phone)) {
      this.employeeError = 'Please enter a valid phone number.';
      return;
    }

    if (this.editingEmployeeId) {
      const index = this.employees.findIndex((e) => e.id === this.editingEmployeeId);
      if (index !== -1) {
        this.employees[index] = { ...this.employeeForm };
        this.employeeSuccess = 'Employee updated successfully!';
      }
    } else {
      const newEmployee = {
        ...this.employeeForm,
        id: `emp-${Date.now()}`,
      };
      this.employees.push(newEmployee);
      this.employeeSuccess = 'Employee added successfully!';
    }

    this.employeeError = '';
    setTimeout(() => {
      this.closeEmployeeModal();
    }, 1500);
  }

  protected openComplexDetails(complex: any): void {
    this.selectedComplex = complex;
    this.selectedComplexEmployees = this.employees.filter((e) => e.assignedComplex === complex.id);
    this.isComplexDetailModalOpen = true;
  }

  protected closeComplexDetails(): void {
    this.isComplexDetailModalOpen = false;
    this.selectedComplex = null;
    this.selectedComplexEmployees = [];
  }

  protected openAssignmentModal(securityManager: any): void {
    this.selectedSecurityManager = securityManager;
    this.assignmentForm = {
      securityManagerId: securityManager.id,
      assignedComplexes: [...securityManager.assignedComplexes],
      assignedCommunities: [...securityManager.assignedCommunities],
    };
    this.isAssignmentModalOpen = true;
    this.assignmentError = '';
    this.assignmentSuccess = '';
  }

  protected closeAssignmentModal(): void {
    this.isAssignmentModalOpen = false;
    this.selectedSecurityManager = null;
    this.assignmentForm = {
      securityManagerId: '',
      assignedComplexes: [],
      assignedCommunities: [],
    };
  }

  protected toggleComplexAssignment(complexId: string): void {
    const index = this.assignmentForm.assignedComplexes.indexOf(complexId);
    if (index > -1) {
      this.assignmentForm.assignedComplexes.splice(index, 1);
    } else {
      this.assignmentForm.assignedComplexes.push(complexId);
    }
  }

  protected toggleCommunityAssignment(communityId: string): void {
    const index = this.assignmentForm.assignedCommunities.indexOf(communityId);
    if (index > -1) {
      this.assignmentForm.assignedCommunities.splice(index, 1);
    } else {
      this.assignmentForm.assignedCommunities.push(communityId);
    }
  }

  protected submitAssignmentForm(): void {
    const manager = this.securityManagers.find((sm) => sm.id === this.assignmentForm.securityManagerId);
    if (manager) {
      manager.assignedComplexes = [...this.assignmentForm.assignedComplexes];
      manager.assignedCommunities = [...this.assignmentForm.assignedCommunities];
      this.assignmentSuccess = 'Assignment updated successfully!';
      setTimeout(() => {
        this.closeAssignmentModal();
      }, 1500);
    }
  }

  protected getAssignedComplexNames(complexIds: string[]): string {
    return complexIds
      .map((id) => this.assignedComplexes.find((c) => c.id === id)?.name)
      .filter((name) => name)
      .join(', ');
  }

  protected getComplexContractDates(complexId: string): { startDate: string; endDate: string } | null {
    const complex = this.assignedComplexes.find((c) => c.id === complexId);
    if (complex) {
      return { startDate: complex.contractStartDate, endDate: complex.contractEndDate };
    }
    return null;
  }

  protected getCommunityContractDates(communityId: string): { startDate: string; endDate: string } | null {
    const community = this.gatedCommunities.find((gc) => gc.id === communityId);
    if (community) {
      return { startDate: community.contractStartDate, endDate: community.contractEndDate };
    }
    return null;
  }

  protected getContractDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  protected isContractExpiringSoon(endDate: string): boolean {
    return this.getContractDaysRemaining(endDate) <= 90 && this.getContractDaysRemaining(endDate) > 0;
  }

  protected isContractExpired(endDate: string): boolean {
    return this.getContractDaysRemaining(endDate) < 0;
  }

  protected extendContract(type: 'complex' | 'community', id: string, daysToAdd: number): void {
    let item;
    if (type === 'complex') {
      item = this.assignedComplexes.find((c) => c.id === id);
    } else {
      item = this.gatedCommunities.find((gc) => gc.id === id);
    }

    if (item) {
      const currentEnd = new Date(item.contractEndDate);
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + daysToAdd);
      item.contractEndDate = newEnd.toISOString().split('T')[0];
      this.assignmentSuccess = `Contract extended to ${item.contractEndDate}`;
      setTimeout(() => {
        this.assignmentSuccess = '';
      }, 3000);
    }
  }

  protected get filteredEmployees(): any[] {
    return this.employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.surname.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.phone.includes(this.searchTerm);

      const matchesStatus = this.filterStatus === 'all' || emp.status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });
  }

  protected get filteredVisitors(): any[] {
    return this.visitors.filter((visitor) => {
      if (this.visitorStartDate) {
        const startDate = new Date(this.visitorStartDate);
        if (new Date(visitor.visitDate) < startDate) {
          return false;
        }
      }

      if (this.visitorEndDate) {
        const endDate = new Date(this.visitorEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(visitor.visitDate) > endDate) {
          return false;
        }
      }

      if (this.visitorFilterType === 'complex') {
        if (this.visitorFilterId) {
          return visitor.complexId === this.visitorFilterId && !visitor.communityId;
        }
        return !visitor.communityId;
      }

      if (this.visitorFilterType === 'community') {
        if (this.visitorFilterId) {
          return visitor.communityId === this.visitorFilterId;
        }
        return !!visitor.communityId;
      }

      return true;
    });
  }

  protected getComplexName(complexId: string): string {
    return this.assignedComplexes.find((c) => c.id === complexId)?.name || 'Unknown';
  }

  protected getCommunityName(communityId: string | undefined): string {
    if (!communityId) {
      return '';
    }
    return this.gatedCommunities.find((gc) => gc.id === communityId)?.name || 'Unknown';
  }

  protected get activeGuardsCount(): number {
    return this.employees.filter((e) => e.status === 'active').length;
  }

  protected logout(): void {
    this.router.navigate(['/login']);
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }
}
