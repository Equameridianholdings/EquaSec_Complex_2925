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
    units?: string[];
  }> = [];
  protected gatedCommunities: Array<{
    id: string;
    name: string;
    complexId: string;
    status: 'active' | 'inactive';
    totalResidents: number;
    contractStartDate: string;
    contractEndDate: string;
    houses?: string[];
    complexesInCommunity?: Array<{
      id: string;
      name: string;
      units: string[];
    }>;
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
    position: 'Guard' | 'admin-Guard';
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
    communityResidenceType?: 'house' | 'complex';
    communityComplexId?: string;
    vehicle?: {
      make: string;
      model: string;
      reg: string;
      color?: string;
    };
  }> = [];
  protected tenants: Array<{
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    idNumber?: string;
    residenceType: 'complex' | 'community';
    complexId?: string;
    communityId?: string;
    communityResidenceType?: 'house' | 'complex';
    communityComplexId?: string;
    address: string;
    vehicles: Array<{
      make: string;
      model: string;
      reg: string;
      color?: string;
    }>;
    registeredDate: string;
  }> = [];

  protected isEmployeeModalOpen = false;
  protected isComplexDetailModalOpen = false;
  protected isAssignmentModalOpen = false;
  protected isDeleteEmployeeModalOpen = false;
  protected isTenantModalOpen = false;
  protected isDeleteTenantModalOpen = false;
  protected selectedComplex: any = null;
  protected selectedComplexEmployees: any[] = [];
  protected selectedSecurityManager: any = null;
  protected selectedEmployeeToDelete: any = null;
  protected selectedTenantToDelete: any = null;

  protected employeeForm = {
    id: '',
    name: '',
    surname: '',
    email: '',
    phone: '',
    position: 'Guard' as 'Guard' | 'admin-Guard',
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

  protected tenantForm = {
    id: '',
    name: '',
    surname: '',
    email: '',
    phone: '',
    idNumber: '',
    residenceType: 'complex' as 'complex' | 'community',
    complexId: '',
    communityId: '',
    communityResidenceType: 'house' as 'house' | 'complex',
    communityComplexId: '',
    address: '',
    vehicles: [] as Array<{ make: string; model: string; reg: string; color?: string }>,
  };
  protected currentVehicle = {
    make: '',
    model: '',
    reg: '',
    color: '',
  };
  protected editingTenantId: string | null = null;
  protected tenantError = '';
  protected tenantSuccess = '';
  protected tenantSearchTerm = '';
  protected tenantFilterResidenceType: 'all' | 'complex' | 'community' = 'all';
  protected tenantFilterComplexId = '';
  protected tenantFilterCommunityId = '';
  protected tenantFilterCommunityResidenceType: 'all' | 'house' | 'complex' = 'all';
  protected tenantFilterCommunityComplexId = '';

  protected searchTerm = '';
  protected filterStatus: 'all' | 'active' | 'inactive' = 'all';
  protected visitorFilterResidenceType: 'all' | 'complex' | 'community' = 'all';
  protected visitorFilterComplexId = '';
  protected visitorFilterCommunityId = '';
  protected visitorFilterCommunityResidenceType: 'all' | 'house' | 'complex' = 'all';
  protected visitorFilterCommunityComplexId = '';
  protected visitorStartDate = '';
  protected visitorEndDate = '';

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.loadAssignedComplexes();
    this.loadGatedCommunities();
    this.loadEmployees();
    this.loadSecurityManagers();
    this.loadVisitors();
    this.loadTenants();
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
        units: this.generateUnits(145),
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
        units: this.generateUnits(98),
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
        units: this.generateUnits(112),
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
        houses: this.generateHouses(20),
        complexesInCommunity: [
          {
            id: 'gc1-complex-1',
            name: 'North Tower A',
            units: this.generateUnits(15),
          },
          {
            id: 'gc1-complex-2',
            name: 'North Tower B',
            units: this.generateUnits(10),
          },
        ],
      },
      {
        id: 'gc-2',
        name: 'South Pavilion',
        complexId: 'complex-1',
        status: 'active',
        totalResidents: 38,
        contractStartDate: '2024-05-15',
        contractEndDate: '2029-05-15',
        houses: this.generateHouses(30),
        complexesInCommunity: [
          {
            id: 'gc2-complex-1',
            name: 'Pavilion Court',
            units: this.generateUnits(8),
          },
        ],
      },
      {
        id: 'gc-3',
        name: 'East Wing',
        complexId: 'complex-2',
        status: 'active',
        totalResidents: 28,
        contractStartDate: '2023-12-01',
        contractEndDate: '2027-11-30',
        houses: this.generateHouses(28),
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
        position: 'admin-Guard',
        assignedComplex: 'complex-1',
        status: 'active',
      },
      {
        id: 'emp-2',
        name: 'Thabo',
        surname: 'Khumalo',
        email: 'thabo.khumalo@equasec.com',
        phone: '+27 82 345 6789',
        position: 'Guard',
        assignedComplex: 'complex-1',
        status: 'active',
      },
      {
        id: 'emp-3',
        name: 'Sipho',
        surname: 'Dlamini',
        email: 'sipho.dlamini@equasec.com',
        phone: '+27 83 456 7890',
        position: 'Guard',
        assignedComplex: 'complex-2',
        status: 'active',
      },
      {
        id: 'emp-4',
        name: 'Nomsa',
        surname: 'Mthembu',
        email: 'nomsa.mthembu@equasec.com',
        phone: '+27 84 567 8901',
        position: 'admin-Guard',
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
        tenantName: 'Lerato Matsebula',
        tenantUnit: 'North Tower A, Unit 5',
        tenantPhone: '+27 81 333 0187',
        visitDate: '2026-02-11T10:30:00',
        complexId: '',
        communityId: 'gc-1',
        communityResidenceType: 'complex',
        communityComplexId: 'north-tower-a',
        vehicle: {
          make: 'Toyota',
          model: 'Corolla',
          reg: 'ABC 123 GP',
          color: 'Silver',
        },
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
        vehicle: {
          make: 'Honda',
          model: 'Civic',
          reg: 'DEF 456 JH',
          color: 'Black',
        },
      },
      {
        id: 'visit-3',
        name: 'Ayesha',
        surname: 'Khan',
        phone: '+27 72 555 6666',
        tenantName: 'Thabo Dlamini',
        tenantUnit: 'House 25',
        tenantPhone: '+27 84 222 0156',
        visitDate: '2026-02-12T09:00:00',
        complexId: '',
        communityId: 'gc-1',
        communityResidenceType: 'house',
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
        vehicle: {
          make: 'Volkswagen',
          model: 'Polo',
          reg: 'GHI 789 LP',
          color: 'Red',
        },
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
      position: 'Guard',
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
      // Date filtering
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

      // Filter by residence type
      if (this.visitorFilterResidenceType !== 'all') {
        // Determine visitor's residence type
        const visitorResidenceType = visitor.communityId ? 'community' : 'complex';
        if (visitorResidenceType !== this.visitorFilterResidenceType) {
          return false;
        }

        // If filtering by complex
        if (this.visitorFilterResidenceType === 'complex' && this.visitorFilterComplexId) {
          if (visitor.complexId !== this.visitorFilterComplexId) {
            return false;
          }
        }

        // If filtering by gated community
        if (this.visitorFilterResidenceType === 'community') {
          if (this.visitorFilterCommunityId && visitor.communityId !== this.visitorFilterCommunityId) {
            return false;
          }

          // Filter by community residence type (house or complex)
          if (this.visitorFilterCommunityResidenceType !== 'all') {
            if (visitor.communityResidenceType !== this.visitorFilterCommunityResidenceType) {
              return false;
            }

            // If filtering by complex within community
            if (this.visitorFilterCommunityResidenceType === 'complex' && this.visitorFilterCommunityComplexId) {
              if (visitor.communityComplexId !== this.visitorFilterCommunityComplexId) {
                return false;
              }
            }
          }
        }
      }

      return true;
    });
  }

  protected onVisitorFilterResidenceTypeChange(): void {
    this.visitorFilterComplexId = '';
    this.visitorFilterCommunityId = '';
    this.visitorFilterCommunityResidenceType = 'all';
    this.visitorFilterCommunityComplexId = '';
  }

  protected onVisitorFilterCommunityChange(): void {
    this.visitorFilterCommunityResidenceType = 'all';
    this.visitorFilterCommunityComplexId = '';
  }

  protected onVisitorFilterCommunityResidenceTypeChange(): void {
    this.visitorFilterCommunityComplexId = '';
  }

  protected get visitorFilterAvailableCommunityComplexes(): any[] {
    if (!this.visitorFilterCommunityId) return [];
    const community = this.gatedCommunities.find(gc => gc.id === this.visitorFilterCommunityId);
    return community?.complexesInCommunity || [];
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

  protected getTenantLocationPath(tenant: any): string[] {
    const path: string[] = [];

    if (tenant.residenceType === 'complex') {
      // Complex → Unit
      const complexName = this.getComplexName(tenant.complexId);
      path.push(complexName);
      path.push(tenant.address);
    } else if (tenant.residenceType === 'community') {
      // Gated Community → ...
      const communityName = this.getCommunityName(tenant.communityId);
      path.push(communityName);

      if (tenant.communityResidenceType === 'house') {
        // → House Number
        path.push(tenant.address);
      } else if (tenant.communityResidenceType === 'complex') {
        // → Complex → Unit
        const community = this.gatedCommunities.find(gc => gc.id === tenant.communityId);
        const complexInCommunity = community?.complexesInCommunity?.find(c => c.id === tenant.communityComplexId);
        if (complexInCommunity) {
          path.push(complexInCommunity.name);
        }
        path.push(tenant.address);
      }
    }

    return path;
  }

  protected get activeGuardsCount(): number {
    return this.employees.filter((e) => e.status === 'active').length;
  }

  private loadTenants(): void {
    // Mock data - in real app, fetch from API
    this.tenants = [
      {
        id: 'tenant-1',
        name: 'Kamo',
        surname: 'Moloi',
        email: 'kamo.moloi@example.com',
        phone: '+27 82 555 0198',
        idNumber: '9012155123088',
        residenceType: 'complex',
        complexId: 'complex-1',
        address: 'Unit 402',
        vehicles: [
          { make: 'Toyota', model: 'Corolla', reg: 'ABC 123 GP', color: 'Silver' },
          { make: 'Honda', model: 'Civic', reg: 'XYZ 456 GP', color: 'Blue' },
        ],
        registeredDate: '2024-01-15',
      },
      {
        id: 'tenant-2',
        name: 'Sarah',
        surname: 'Nkosi',
        email: 'sarah.nkosi@example.com',
        phone: '+27 83 444 0123',
        idNumber: '8805205234089',
        residenceType: 'complex',
        complexId: 'complex-2',
        address: 'Unit 105',
        vehicles: [],
        registeredDate: '2024-03-20',
      },
      {
        id: 'tenant-3',
        name: 'Thabo',
        surname: 'Dlamini',
        email: 'thabo.dlamini@example.com',
        phone: '+27 84 222 0156',
        idNumber: '7708125234089',
        residenceType: 'community',
        communityId: 'gc-1',
        communityResidenceType: 'house',
        address: 'House 25',
        vehicles: [
          { make: 'BMW', model: 'X3', reg: 'XYZ 789 GP', color: 'Black' },
        ],
        registeredDate: '2024-02-10',
      },
      {
        id: 'tenant-4',
        name: 'Lerato',
        surname: 'Matsebula',
        email: 'lerato.matsebula@example.com',
        phone: '+27 81 333 0187',
        idNumber: '9203155678089',
        residenceType: 'community',
        communityId: 'gc-1',
        communityResidenceType: 'complex',
        communityComplexId: 'north-tower-a',
        address: 'Unit 5',
        vehicles: [
          { make: 'Mercedes-Benz', model: 'C-Class', reg: 'DEF 456 GP', color: 'White' },
          { make: 'Audi', model: 'A4', reg: 'GHI 789 GP', color: 'Gray' },
          { make: 'Volkswagen', model: 'Golf', reg: 'JKL 012 GP', color: 'Red' },
        ],
        registeredDate: '2024-04-05',
      },
    ];
  }

  protected openTenantModal(): void {
    this.isTenantModalOpen = true;
    this.tenantError = '';
    this.tenantSuccess = '';
  }

  protected closeTenantModal(): void {
    this.isTenantModalOpen = false;
    this.resetTenantForm();
  }

  protected editTenant(tenant: any): void {
    this.tenantForm = {
      id: tenant.id,
      name: tenant.name,
      surname: tenant.surname,
      email: tenant.email,
      phone: tenant.phone,
      idNumber: tenant.idNumber || '',
      residenceType: tenant.residenceType,
      complexId: tenant.complexId || '',
      communityId: tenant.communityId || '',
      communityResidenceType: tenant.communityResidenceType || 'house',
      communityComplexId: tenant.communityComplexId || '',
      address: tenant.address,
      vehicles: [...tenant.vehicles],
    };
    this.editingTenantId = tenant.id;
    this.openTenantModal();
  }

  protected submitTenantForm(): void {
    // Validation
    if (!this.tenantForm.name || !this.tenantForm.surname || !this.tenantForm.email || !this.tenantForm.phone || !this.tenantForm.address) {
      this.tenantError = 'Please fill in all required fields.';
      return;
    }

    if (this.tenantForm.residenceType === 'complex' && !this.tenantForm.complexId) {
      this.tenantError = 'Please select a complex.';
      return;
    }

    if (this.tenantForm.residenceType === 'community' && !this.tenantForm.communityId) {
      this.tenantError = 'Please select a gated community.';
      return;
    }

    if (this.tenantForm.residenceType === 'community' && this.tenantForm.communityResidenceType === 'complex' && !this.tenantForm.communityComplexId) {
      this.tenantError = 'Please select a complex within the gated community.';
      return;
    }

    const tenantData = {
      id: this.editingTenantId || `tenant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: this.tenantForm.name.trim(),
      surname: this.tenantForm.surname.trim(),
      email: this.tenantForm.email.trim(),
      phone: this.tenantForm.phone.trim(),
      idNumber: this.tenantForm.idNumber.trim() || undefined,
      residenceType: this.tenantForm.residenceType,
      complexId: this.tenantForm.residenceType === 'complex' ? this.tenantForm.complexId : undefined,
      communityId: this.tenantForm.residenceType === 'community' ? this.tenantForm.communityId : undefined,
      communityResidenceType: this.tenantForm.residenceType === 'community' ? this.tenantForm.communityResidenceType : undefined,
      communityComplexId: this.tenantForm.residenceType === 'community' && this.tenantForm.communityResidenceType === 'complex' ? this.tenantForm.communityComplexId : undefined,
      address: this.tenantForm.address.trim(),
      vehicles: this.tenantForm.vehicles,
      registeredDate: this.editingTenantId
        ? this.tenants.find((t) => t.id === this.editingTenantId)?.registeredDate || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };

    if (this.editingTenantId) {
      const index = this.tenants.findIndex((t) => t.id === this.editingTenantId);
      if (index > -1) {
        this.tenants[index] = tenantData;
      }
      this.tenantSuccess = 'Tenant updated successfully!';
    } else {
      this.tenants.push(tenantData);
      this.tenantSuccess = 'Tenant registered successfully!';
    }

    setTimeout(() => {
      this.closeTenantModal();
    }, 1500);
  }

  protected openDeleteTenantModal(tenant: any): void {
    this.selectedTenantToDelete = tenant;
    this.isDeleteTenantModalOpen = true;
  }

  protected closeDeleteTenantModal(): void {
    this.isDeleteTenantModalOpen = false;
    this.selectedTenantToDelete = null;
  }

  protected confirmDeleteTenant(): void {
    if (this.selectedTenantToDelete) {
      this.tenants = this.tenants.filter((t) => t.id !== this.selectedTenantToDelete.id);
      this.closeDeleteTenantModal();
    }
  }

  protected addVehicle(): void {
    // Validate current vehicle
    if (!this.currentVehicle.make || !this.currentVehicle.model || !this.currentVehicle.reg) {
      this.tenantError = 'Please fill in vehicle make, model, and registration number.';
      return;
    }

    // Check for duplicate registration
    if (this.tenantForm.vehicles.some(v => v.reg === this.currentVehicle.reg)) {
      this.tenantError = 'A vehicle with this registration number is already added.';
      return;
    }

    // Add vehicle to the list
    this.tenantForm.vehicles.push({
      make: this.currentVehicle.make.trim(),
      model: this.currentVehicle.model.trim(),
      reg: this.currentVehicle.reg.trim(),
      color: this.currentVehicle.color.trim() || undefined,
    });

    // Reset current vehicle form
    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };
    this.tenantError = '';
  }

  protected removeVehicle(index: number): void {
    this.tenantForm.vehicles.splice(index, 1);
  }

  protected onResidenceTypeChange(): void {
    // Clear residence fields when switching type
    this.tenantForm.complexId = '';
    this.tenantForm.communityId = '';
    this.tenantForm.address = '';
  }

  protected onComplexChange(): void {
    // Clear address when complex changes
    this.tenantForm.address = '';
  }

  protected onCommunityChange(): void {
    // Clear all community-related fields when community changes
    this.tenantForm.communityResidenceType = 'house';
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityResidenceTypeChange(): void {
    // Clear fields when switching between house and complex in community
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityComplexChange(): void {
    // Clear unit when complex in community changes
    this.tenantForm.address = '';
  }

  private resetTenantForm(): void {
    this.tenantForm = {
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      idNumber: '',
      residenceType: 'complex',
      complexId: '',
      communityId: '',
      communityResidenceType: 'house',
      communityComplexId: '',
      address: '',
      vehicles: [],
    };
    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };
    this.editingTenantId = null;
    this.tenantError = '';
    this.tenantSuccess = '';
  }

  private generateUnits(count: number): string[] {
    const units: string[] = [];
    for (let i = 1; i <= count; i++) {
      units.push(`Unit ${i}`);
    }
    return units;
  }

  private generateHouses(count: number): string[] {
    const houses: string[] = [];
    for (let i = 1; i <= count; i++) {
      houses.push(`House ${i}`);
    }
    return houses;
  }

  protected get availableUnits(): string[] {
    if (!this.tenantForm.complexId) {
      return [];
    }
    const complex = this.assignedComplexes.find(c => c.id === this.tenantForm.complexId);
    return complex?.units || [];
  }

  protected get availableHouses(): string[] {
    if (!this.tenantForm.communityId) {
      return [];
    }
    const community = this.gatedCommunities.find(gc => gc.id === this.tenantForm.communityId);
    return community?.houses || [];
  }

  protected get availableCommunityComplexes(): Array<{ id: string; name: string; units: string[] }> {
    if (!this.tenantForm.communityId) {
      return [];
    }
    const community = this.gatedCommunities.find(gc => gc.id === this.tenantForm.communityId);
    return community?.complexesInCommunity || [];
  }

  protected get availableCommunityUnits(): string[] {
    if (!this.tenantForm.communityComplexId) {
      return [];
    }
    const community = this.gatedCommunities.find(gc => gc.id === this.tenantForm.communityId);
    const complex = community?.complexesInCommunity?.find(c => c.id === this.tenantForm.communityComplexId);
    return complex?.units || [];
  }

  protected get filteredTenants(): any[] {
    return this.tenants.filter((tenant) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(this.tenantSearchTerm.toLowerCase()) ||
        tenant.surname.toLowerCase().includes(this.tenantSearchTerm.toLowerCase()) ||
        tenant.address.toLowerCase().includes(this.tenantSearchTerm.toLowerCase()) ||
        tenant.phone.includes(this.tenantSearchTerm);

      // Filter by residence type
      if (this.tenantFilterResidenceType !== 'all') {
        if (tenant.residenceType !== this.tenantFilterResidenceType) {
          return false;
        }

        // If filtering by complex
        if (this.tenantFilterResidenceType === 'complex' && this.tenantFilterComplexId) {
          if (tenant.complexId !== this.tenantFilterComplexId) {
            return false;
          }
        }

        // If filtering by gated community
        if (this.tenantFilterResidenceType === 'community') {
          if (this.tenantFilterCommunityId && tenant.communityId !== this.tenantFilterCommunityId) {
            return false;
          }

          // Filter by community residence type (house or complex)
          if (this.tenantFilterCommunityResidenceType !== 'all') {
            if (tenant.communityResidenceType !== this.tenantFilterCommunityResidenceType) {
              return false;
            }

            // If filtering by complex within community
            if (this.tenantFilterCommunityResidenceType === 'complex' && this.tenantFilterCommunityComplexId) {
              if (tenant.communityComplexId !== this.tenantFilterCommunityComplexId) {
                return false;
              }
            }
          }
        }
      }

      return matchesSearch;
    });
  }

  protected onFilterResidenceTypeChange(): void {
    this.tenantFilterComplexId = '';
    this.tenantFilterCommunityId = '';
    this.tenantFilterCommunityResidenceType = 'all';
    this.tenantFilterCommunityComplexId = '';
  }

  protected onFilterCommunityChange(): void {
    this.tenantFilterCommunityResidenceType = 'all';
    this.tenantFilterCommunityComplexId = '';
  }

  protected onFilterCommunityResidenceTypeChange(): void {
    this.tenantFilterCommunityComplexId = '';
  }

  protected get filterAvailableCommunityComplexes(): any[] {
    if (!this.tenantFilterCommunityId) return [];
    const community = this.gatedCommunities.find(gc => gc.id === this.tenantFilterCommunityId);
    return community?.complexesInCommunity || [];
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
