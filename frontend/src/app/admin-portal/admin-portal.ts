import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-portal.html',
  styleUrl: './admin-portal.css',
})
export class AdminPortal implements OnInit {
  protected readonly adminEmail = 'kkpartners@equameridianholdings.com';
  protected showOnboardingModal = false;
  protected showUnitConfigStep = false;
  protected complexName = '';
  protected unitStart: number | string = '';
  protected unitEnd: number | string = '';
  protected parkingMode: 'fixed' | 'per-unit' = 'fixed';
  protected fixedParkingCount: number | string = '';
  protected onboardingError = '';
  protected onboardingSuccess = '';
  protected unitList: Array<{ unitNumber: number; parkingBays: number | string }> = [];
  protected showSecurityModal = false;
  protected selectedComplexName = '';
  protected securityCompanyName = '';
  protected securityCompanyEmail = '';
  protected securityCompanyTel = '';
  protected cipcReg = '';
  protected contractStart = '';
  protected contractEnd = '';
  protected psiraNumber = '';
  protected securityError = '';
  protected securitySuccess = '';
  protected showAssignModal = false;
  protected selectedCompanyForAssignment: any = null;
  protected assignmentComplexName = '';
  protected assignmentContractStart = '';
  protected assignmentContractEnd = '';
  protected assignmentError = '';
  protected assignmentSuccess = '';
  protected showUnassignModal = false;
  protected unassignmentTarget: any = null;
  protected assignmentTimeoutId: any = null;
  
  // Contract history filters and sorting
  protected contractSearchTerm = '';
  protected contractComplexFilter = '';
  protected contractCompanyFilter = '';
  protected contractStartDateFilter = '';
  protected contractEndDateFilter = '';
  protected sortContractColumn = 'contractEndDate';
  protected sortContractDirection: 'asc' | 'desc' = 'desc';
  protected filteredContractHistory: Array<any> = [];
  
  // Visitor history filters and sorting
  protected visitorSearchTerm = '';
  protected selectedComplexFilter = '';
  protected filterStartDate = '';
  protected filterEndDate = '';
  protected filterStartTime = '';
  protected filterEndTime = '';
  protected timeframeFilter = '';
  protected sortColumn = 'entryTime';
  protected sortDirection: 'asc' | 'desc' = 'desc';
  protected filteredVisitorHistory: Array<any> = [];
  
  protected registeredSecurityCompanies: Array<any> = [
    {
      companyName: 'Guardian Security Services',
      companyEmail: 'info@guardiansecurity.co.za',
      companyTel: '+27 11 123 4567',
      cipcReg: '2023/654321',
      psiraNumber: 'PSA123456',
      assignments: [
        {
          complexName: 'Complex 2925 Fleurhof',
          contractStart: '2024-01-15',
          contractEnd: '2025-01-15',
        },
        {
          complexName: 'Sunset View Estate',
          contractStart: '2024-02-01',
          contractEnd: '2025-01-31',
        },
        {
          complexName: 'Green Park Apartments',
          contractStart: '2024-03-15',
          contractEnd: '2025-03-14',
        },
      ],
    },
    {
      companyName: 'Apex Protection Group',
      companyEmail: 'contact@apexprotection.co.za',
      companyTel: '+27 21 456 7890',
      cipcReg: '2022/789012',
      psiraNumber: 'PSA789012',
      assignments: [
        {
          complexName: 'Meridian Heights',
          contractStart: '2024-03-01',
          contractEnd: '2026-02-28',
        },
      ],
    },
    {
      companyName: 'Elite Security Solutions',
      companyEmail: 'support@elitesecurity.co.za',
      companyTel: '+27 31 234 5678',
      cipcReg: '2023/345678',
      psiraNumber: 'PSA345678',
      assignments: [
        {
          complexName: 'Equa Residences',
          contractStart: '2024-06-01',
          contractEnd: '2025-05-31',
        },
      ],
    },
    {
      companyName: 'Sentinel Watch Services',
      companyEmail: 'admin@sentinelwatch.co.za',
      companyTel: '+27 12 987 6543',
      cipcReg: '2024/111222',
      psiraNumber: 'PSA111222',
      assignments: [],
    },
    {
      companyName: 'SafeGuard Security',
      companyEmail: 'info@safeguardsec.co.za',
      companyTel: '+27 11 555 8888',
      cipcReg: '2023/999888',
      psiraNumber: 'PSA999888',
      assignments: [],
    },
  ];

  protected contractHistory: Array<any> = [
    {
      companyName: 'SecureGuard Services',
      complexName: 'Sunset View Estate',
      contractStartDate: '2024-01-01',
      contractEndDate: '2025-12-31',
      status: 'Ended',
      companyEmail: 'info@secureguard.co.za',
      companyTel: '+27 11 456 7890',
      psiraNumber: 'PSA234567',
    },
    {
      companyName: 'SecureGuard Services',
      complexName: 'Green Valley Complex',
      contractStartDate: '2024-11-20',
      contractEndDate: '2025-11-20',
      status: 'Ended',
      companyEmail: 'info@secureguard.co.za',
      companyTel: '+27 11 456 7890',
      psiraNumber: 'PSA234567',
    },
    {
      companyName: 'Premier Security Group',
      complexName: 'Green Park Apartments',
      contractStartDate: '2024-11-15',
      contractEndDate: '2025-11-15',
      status: 'Ended',
      companyEmail: 'contact@premiersecurity.co.za',
      companyTel: '+27 21 567 8901',
      psiraNumber: 'PSA345678',
    },
    {
      companyName: 'Premier Security Group',
      complexName: 'Riverside Plaza',
      contractStartDate: '2024-10-30',
      contractEndDate: '2025-10-30',
      status: 'Ended',
      companyEmail: 'contact@premiersecurity.co.za',
      companyTel: '+27 21 567 8901',
      psiraNumber: 'PSA345678',
    },
    {
      companyName: 'Guardian Security Services',
      complexName: 'Complex 2925 Fleurhof',
      contractStartDate: '2024-01-15',
      contractEndDate: '2025-01-15',
      status: 'Ended',
      companyEmail: 'info@guardiansecurity.co.za',
      companyTel: '+27 11 123 4567',
      psiraNumber: 'PSA123456',
    },
    {
      companyName: 'Guardian Security Services',
      complexName: 'Parkview Heights',
      contractStartDate: '2024-03-10',
      contractEndDate: '2025-03-10',
      status: 'Ended',
      companyEmail: 'info@guardiansecurity.co.za',
      companyTel: '+27 11 123 4567',
      psiraNumber: 'PSA123456',
    },
    {
      companyName: 'Elite Protection Ltd',
      complexName: 'Meridian Heights',
      contractStartDate: '2023-08-30',
      contractEndDate: '2024-08-30',
      status: 'Ended',
      companyEmail: 'admin@eliteprotection.co.za',
      companyTel: '+27 12 678 9012',
      psiraNumber: 'PSA456789',
    },
    {
      companyName: 'Fortress Security Corp',
      complexName: 'Equa Residences',
      contractStartDate: '2023-06-15',
      contractEndDate: '2024-06-15',
      status: 'Ended',
      companyEmail: 'support@fortresssecurity.co.za',
      companyTel: '+27 31 789 0123',
      psiraNumber: 'PSA567890',
    },
    {
      companyName: 'Fortress Security Corp',
      complexName: 'Crescent Holdings',
      contractStartDate: '2023-07-25',
      contractEndDate: '2024-07-25',
      status: 'Ended',
      companyEmail: 'support@fortresssecurity.co.za',
      companyTel: '+27 31 789 0123',
      psiraNumber: 'PSA567890',
    },
  ];

  protected visitorHistory: Array<any> = [
    {
      visitorName: 'John Mabunda',
      visitorPhone: '+27 82 345 6789',
      unitVisited: 'Unit 245',
      tenantName: 'Sipho',
      tenantSurname: 'Khumalo',
      tenantPhone: '+27 81 123 4567',
      complexName: 'Complex 2925 Fleurhof',
      entryTime: '2026-02-07T09:15:00',
      securityGuard: 'Thabo Ndlovu',
    },
    {
      visitorName: 'Sarah Johnson',
      visitorPhone: '+27 83 456 7890',
      unitVisited: 'Unit 102',
      tenantName: 'Nomsa',
      tenantSurname: 'Dube',
      tenantPhone: '+27 82 987 6543',
      complexName: 'Meridian Heights',
      entryTime: '2026-02-07T11:45:00',
      securityGuard: 'Peter Sithole',
    },
    {
      visitorName: 'Michael Dlamini',
      visitorPhone: '+27 84 567 8901',
      unitVisited: 'Unit 45',
      tenantName: 'Thandiwe',
      tenantSurname: 'Nkosi',
      tenantPhone: '+27 83 222 3344',
      complexName: 'Equa Residences',
      entryTime: '2026-02-07T14:00:00',
      securityGuard: 'John Mokoena',
    },
    {
      visitorName: 'Lisa van der Merwe',
      visitorPhone: '+27 85 678 9012',
      unitVisited: 'Unit 310',
      tenantName: 'Bongani',
      tenantSurname: 'Mthembu',
      tenantPhone: '+27 84 555 7788',
      complexName: 'Complex 2925 Fleurhof',
      entryTime: '2026-02-06T16:30:00',
      securityGuard: 'Thabo Ndlovu',
    },
    {
      visitorName: 'Ahmed Hassan',
      visitorPhone: '+27 86 789 0123',
      unitVisited: 'Unit 205',
      tenantName: 'Precious',
      tenantSurname: 'Ngcobo',
      tenantPhone: '+27 85 444 1199',
      complexName: 'Meridian Heights',
      entryTime: '2026-02-06T10:00:00',
      securityGuard: 'Peter Sithole',
    },
  ];
  protected onboardedComplexes: Array<any> = [
    {
      complexName: 'Complex 2925 Fleurhof',
      unitStart: 101,
      unitEnd: 502,
      parkingMode: 'fixed',
      fixedParkingCount: 2,
    },
    {
      complexName: 'Meridian Heights',
      unitStart: 201,
      unitEnd: 301,
      parkingMode: 'per-unit',
      unitParkingConfig: [
        { unitNumber: 201, parkingBays: 2 },
        { unitNumber: 202, parkingBays: 1 },
        { unitNumber: 203, parkingBays: 3 },
      ],
    },
    {
      complexName: 'Equa Residences',
      unitStart: 1,
      unitEnd: 150,
      parkingMode: 'fixed',
      fixedParkingCount: 1,
    },
    {
      complexName: 'Sunset View Estate',
      unitStart: 301,
      unitEnd: 420,
      parkingMode: 'fixed',
      fixedParkingCount: 2,
    },
    {
      complexName: 'Green Park Apartments',
      unitStart: 1,
      unitEnd: 85,
      parkingMode: 'fixed',
      fixedParkingCount: 1,
    },
  ];

  protected readonly overviewStats = [];

  protected readonly quickActions = [
    { title: 'Onboard Complex', description: 'Set up a new complex with units and parking configuration.', action: 'onboard' },
  ];

  protected readonly recentEvents = [];

  protected get isOnboardingFormValid(): boolean {
    const hasComplexName = this.complexName.trim().length > 0;
    const hasUnitStart = this.unitStart !== '' && this.unitStart !== null;
    const hasUnitEnd = this.unitEnd !== '' && this.unitEnd !== null;
    const unitStartNum = typeof this.unitStart === 'number' ? this.unitStart : parseInt(String(this.unitStart), 10);
    const unitEndNum = typeof this.unitEnd === 'number' ? this.unitEnd : parseInt(String(this.unitEnd), 10);
    const validRange = !isNaN(unitStartNum) && !isNaN(unitEndNum) && unitStartNum <= unitEndNum && hasUnitStart && hasUnitEnd;

    if (this.parkingMode === 'fixed') {
      const parkingNum = typeof this.fixedParkingCount === 'number' ? this.fixedParkingCount : parseInt(String(this.fixedParkingCount), 10);
      const hasFixedParking = this.fixedParkingCount !== '' && this.fixedParkingCount !== null && !isNaN(parkingNum) && parkingNum >= 0;
      return hasComplexName && validRange && hasFixedParking;
    }

    return hasComplexName && validRange;
  }

  protected get allUnitsConfigured(): boolean {
    return this.unitList.every((unit) => {
      const parkingNum = typeof unit.parkingBays === 'string' ? parseInt(unit.parkingBays, 10) : unit.parkingBays;
      return !isNaN(parkingNum) && parkingNum >= 0;
    });
  }

  protected openOnboardingModal(): void {
    this.showOnboardingModal = true;
    this.showUnitConfigStep = false;
    this.resetOnboardingForm();
  }

  protected closeOnboardingModal(): void {
    this.showOnboardingModal = false;
    this.showUnitConfigStep = false;
    this.resetOnboardingForm();
  }

  protected resetOnboardingForm(): void {
    this.complexName = '';
    this.unitStart = '';
    this.unitEnd = '';
    this.parkingMode = 'fixed';
    this.fixedParkingCount = '';
    this.onboardingError = '';
    this.onboardingSuccess = '';
    this.unitList = [];
  }

  protected async submitOnboarding(): Promise<void> {
    this.onboardingError = '';
    this.onboardingSuccess = '';

    if (!this.complexName.trim()) {
      this.onboardingError = 'Complex name is required.';
      return;
    }

    const unitStart = typeof this.unitStart === 'number' ? this.unitStart : parseInt(String(this.unitStart), 10);
    const unitEnd = typeof this.unitEnd === 'number' ? this.unitEnd : parseInt(String(this.unitEnd), 10);

    if (isNaN(unitStart) || isNaN(unitEnd)) {
      this.onboardingError = 'Unit numbers must be valid integers.';
      return;
    }

    if (unitStart > unitEnd) {
      this.onboardingError = 'Start unit must be less than or equal to end unit.';
      return;
    }

    // Fixed mode - submit immediately
    if (this.parkingMode === 'fixed') {
      const fixedCount = typeof this.fixedParkingCount === 'number' ? this.fixedParkingCount : parseInt(String(this.fixedParkingCount), 10);
      if (isNaN(fixedCount) || fixedCount < 0) {
        this.onboardingError = 'Fixed parking count must be a valid non-negative number.';
        return;
      }

      const onboardingData = {
        complexName: this.complexName.trim(),
        unitStart,
        unitEnd,
        parkingMode: 'fixed',
        fixedParkingCount: fixedCount,
      };

      console.log('Onboarding Data (Fixed):', onboardingData);
      this.onboardedComplexes.push(onboardingData);
      this.onboardingSuccess = `Complex "${onboardingData.complexName}" has been onboarded successfully!`;
      
      setTimeout(() => {
        this.closeOnboardingModal();
      }, 2000);
      return;
    }

    // Per-unit mode - show unit configuration
    this.generateUnitList(unitStart, unitEnd);
    this.showUnitConfigStep = true;
  }

  protected generateUnitList(start: number, end: number): void {
    this.unitList = [];
    for (let i = start; i <= end; i++) {
      this.unitList.push({ unitNumber: i, parkingBays: '' });
    }
  }

  protected async confirmUnitConfiguration(): Promise<void> {
    this.onboardingError = '';

    if (!this.allUnitsConfigured) {
      this.onboardingError = 'All units must have a parking bay count assigned.';
      return;
    }

    const unitStart = typeof this.unitStart === 'number' ? this.unitStart : parseInt(String(this.unitStart), 10);
    const unitEnd = typeof this.unitEnd === 'number' ? this.unitEnd : parseInt(String(this.unitEnd), 10);

    const finalData = {
      complexName: this.complexName.trim(),
      unitStart,
      unitEnd,
      parkingMode: 'per-unit',
      unitParkingConfig: this.unitList.map((unit) => ({
        unitNumber: unit.unitNumber,
        parkingBays: typeof unit.parkingBays === 'string' ? parseInt(unit.parkingBays, 10) : unit.parkingBays,
      })),
    };

    console.log('Final Onboarding Data:', finalData);
    this.onboardedComplexes.push(finalData);
    this.onboardingSuccess = `Complex "${finalData.complexName}" has been onboarded successfully with per-unit parking configuration!`;

    setTimeout(() => {
      this.closeOnboardingModal();
    }, 2000);
  }

  protected backToBasicConfig(): void {
    this.showUnitConfigStep = false;
    this.onboardingError = '';
  }

  protected handleActionClick(action?: string): void {
    if (action === 'onboard') {
      this.openOnboardingModal();
    }
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected openSecurityModal(complexName: string): void {
    this.selectedComplexName = complexName;
    this.showSecurityModal = true;
    this.resetSecurityForm();
  }

  protected closeSecurityModal(): void {
    this.showSecurityModal = false;
    this.resetSecurityForm();
  }

  protected resetSecurityForm(): void {
    this.securityCompanyName = '';
    this.securityCompanyEmail = '';
    this.securityCompanyTel = '';
    this.cipcReg = '';
    this.contractStart = '';
    this.contractEnd = '';
    this.psiraNumber = '';
    this.securityError = '';
    this.securitySuccess = '';
  }

  protected async submitSecurityCompany(): Promise<void> {
    this.securityError = '';
    this.securitySuccess = '';

    if (!this.securityCompanyName.trim()) {
      this.securityError = 'Company name is required.';
      return;
    }

    if (!this.securityCompanyEmail.trim()) {
      this.securityError = 'Company email is required.';
      return;
    }

    if (!this.securityCompanyTel.trim()) {
      this.securityError = 'Company telephone number is required.';
      return;
    }

    if (!this.cipcReg.trim()) {
      this.securityError = 'CIPC registration number is required.';
      return;
    }

    if (!this.contractStart) {
      this.securityError = 'Contract start date is required.';
      return;
    }

    if (!this.contractEnd) {
      this.securityError = 'Contract end date is required.';
      return;
    }

    if (!this.psiraNumber.trim()) {
      this.securityError = 'PSIRA number is required.';
      return;
    }

    // Check if company already exists
    const existingCompany = this.registeredSecurityCompanies.find(
      company => company.companyName === this.securityCompanyName.trim()
    );

    if (existingCompany) {
      // Company exists, add assignment to existing company
      if (!existingCompany.assignments) {
        existingCompany.assignments = [];
      }
      
      const existingAssignment = existingCompany.assignments.find(
        (a: any) => a.complexName === this.selectedComplexName
      );
      
      if (existingAssignment) {
        this.securityError = 'This company is already assigned to this complex.';
        return;
      }
      
      existingCompany.assignments.push({
        complexName: this.selectedComplexName,
        contractStart: this.contractStart,
        contractEnd: this.contractEnd,
      });
      
      this.securitySuccess = `Security company "${existingCompany.companyName}" has been assigned to ${this.selectedComplexName}!`;
    } else {
      // New company, create with assignments array
      const securityData = {
        companyName: this.securityCompanyName.trim(),
        companyEmail: this.securityCompanyEmail.trim(),
        companyTel: this.securityCompanyTel.trim(),
        cipcReg: this.cipcReg.trim(),
        psiraNumber: this.psiraNumber.trim(),
        assignments: [
          {
            complexName: this.selectedComplexName,
            contractStart: this.contractStart,
            contractEnd: this.contractEnd,
          },
        ],
      };

      console.log('Security Company Registration:', securityData);
      this.registeredSecurityCompanies.push(securityData);
      this.securitySuccess = `Security company "${securityData.companyName}" has been registered for ${this.selectedComplexName}!`;
    }

    setTimeout(() => {
      this.closeSecurityModal();
    }, 2000);
  }

  protected get unassignedComplexes(): Array<any> {
    const assignedComplexNames = new Set<string>();
    
    this.registeredSecurityCompanies.forEach(company => {
      if (company.assignments) {
        company.assignments.forEach((assignment: any) => {
          assignedComplexNames.add(assignment.complexName);
        });
      }
    });
    
    return this.onboardedComplexes.filter(
      complex => !assignedComplexNames.has(complex.complexName)
    );
  }

  protected get activeContractsCount(): number {
    return this.registeredSecurityCompanies.reduce((count, company) => {
      return count + (company.assignments ? company.assignments.length : 0);
    }, 0);
  }

  protected isComplexAssigned(complexName: string): boolean {
    return this.registeredSecurityCompanies.some(company => 
      company.assignments && company.assignments.some((a: any) => a.complexName === complexName)
    );
  }

  protected openAssignModal(company: any): void {
    // Clear any pending timeouts
    if (this.assignmentTimeoutId) {
      clearTimeout(this.assignmentTimeoutId);
      this.assignmentTimeoutId = null;
    }
    this.selectedCompanyForAssignment = company;
    this.showAssignModal = true;
    this.resetAssignmentForm();
  }

  protected closeAssignModal(): void {
    // Clear any pending timeouts
    if (this.assignmentTimeoutId) {
      clearTimeout(this.assignmentTimeoutId);
      this.assignmentTimeoutId = null;
    }
    this.showAssignModal = false;
    this.selectedCompanyForAssignment = null;
    this.resetAssignmentForm();
  }

  protected resetAssignmentForm(): void {
    this.assignmentComplexName = '';
    this.assignmentContractStart = '';
    this.assignmentContractEnd = '';
    this.assignmentError = '';
    this.assignmentSuccess = '';
  }

  protected async submitAssignment(): Promise<void> {
    this.assignmentError = '';
    this.assignmentSuccess = '';

    if (!this.assignmentComplexName) {
      this.assignmentError = 'Please select a complex.';
      return;
    }

    if (!this.assignmentContractStart) {
      this.assignmentError = 'Contract start date is required.';
      return;
    }

    if (!this.assignmentContractEnd) {
      this.assignmentError = 'Contract end date is required.';
      return;
    }

    // Update the company with assignment details
    if (this.selectedCompanyForAssignment) {
      // Initialize assignments array if it doesn't exist
      if (!this.selectedCompanyForAssignment.assignments) {
        this.selectedCompanyForAssignment.assignments = [];
      }
      
      // Check if already assigned to this complex
      const existingAssignment = this.selectedCompanyForAssignment.assignments.find(
        (a: any) => a.complexName === this.assignmentComplexName
      );
      
      if (existingAssignment) {
        this.assignmentError = 'This company is already assigned to this complex.';
        return;
      }
      
      // Add new assignment
      this.selectedCompanyForAssignment.assignments.push({
        complexName: this.assignmentComplexName,
        contractStart: this.assignmentContractStart,
        contractEnd: this.assignmentContractEnd,
      });
    }

    console.log('Company Assignment:', {
      company: this.selectedCompanyForAssignment?.companyName,
      complex: this.assignmentComplexName,
      contractStart: this.assignmentContractStart,
      contractEnd: this.assignmentContractEnd,
    });

    this.assignmentSuccess = `${this.selectedCompanyForAssignment?.companyName} has been assigned to ${this.assignmentComplexName}!`;

    // Clear any previous timeouts
    if (this.assignmentTimeoutId) {
      clearTimeout(this.assignmentTimeoutId);
    }

    // Close modal after showing success
    this.assignmentTimeoutId = setTimeout(() => {
      this.closeAssignModal();
      this.assignmentTimeoutId = null;
    }, 1500);
  }

  protected unassignCompanyFromComplex(company: any, assignment: any): void {
    this.unassignmentTarget = { company, assignment };
    this.showUnassignModal = true;
  }

  protected closeUnassignModal(): void {
    this.showUnassignModal = false;
    this.unassignmentTarget = null;
  }

  protected confirmUnassignment(): void {
    if (this.unassignmentTarget) {
      const { company, assignment } = this.unassignmentTarget;
      const index = company.assignments.indexOf(assignment);
      if (index > -1) {
        company.assignments.splice(index, 1);
      }
      console.log('Company unassigned from complex:', company.companyName, assignment.complexName);
      this.closeUnassignModal();
    }
  }

  protected calculateDuration(entryTime: string, exitTime: string): string {
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    const diffMs = exit.getTime() - entry.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  ngOnInit(): void {
    this.filteredVisitorHistory = [...this.visitorHistory];
    this.sortVisitors('entryTime');
    this.filteredContractHistory = [...this.contractHistory];
    this.sortContracts('contractEndDate');
  }

  protected filterVisitors(): void {
    let filtered = [...this.visitorHistory];

    // Apply search filter
    if (this.visitorSearchTerm.trim()) {
      const searchLower = this.visitorSearchTerm.toLowerCase();
      filtered = filtered.filter(visit =>
        visit.visitorName.toLowerCase().includes(searchLower) ||
        visit.visitorPhone.includes(searchLower) ||
        visit.unitVisited.toLowerCase().includes(searchLower) ||
        visit.tenantName.toLowerCase().includes(searchLower) ||
        visit.tenantSurname.toLowerCase().includes(searchLower) ||
        visit.tenantPhone.includes(searchLower) ||
        visit.complexName.toLowerCase().includes(searchLower) ||
        visit.securityGuard.toLowerCase().includes(searchLower)
      );
    }

    // Apply complex filter
    if (this.selectedComplexFilter) {
      filtered = filtered.filter(visit => visit.complexName === this.selectedComplexFilter);
    }

    // Apply date range filter
    if (this.filterStartDate) {
      const startDate = new Date(this.filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(visit => new Date(visit.entryTime) >= startDate);
    }

    if (this.filterEndDate) {
      const endDate = new Date(this.filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(visit => new Date(visit.entryTime) <= endDate);
    }

    // Apply time window filter
    if (this.filterStartTime || this.filterEndTime) {
      filtered = filtered.filter(visit => {
        const entry = new Date(visit.entryTime);
        const entryMinutes = entry.getHours() * 60 + entry.getMinutes();
        const startMinutes = this.filterStartTime
          ? this.parseTimeToMinutes(this.filterStartTime)
          : null;
        const endMinutes = this.filterEndTime
          ? this.parseTimeToMinutes(this.filterEndTime)
          : null;

        if (startMinutes !== null && entryMinutes < startMinutes) {
          return false;
        }
        if (endMinutes !== null && entryMinutes > endMinutes) {
          return false;
        }

        return true;
      });
    }

    this.filteredVisitorHistory = filtered;
    this.applySorting();
  }

  protected applyTimeframeFilter(): void {
    if (!this.timeframeFilter) {
      return;
    }

    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);

    switch (this.timeframeFilter) {
      case 'today':
        break;
      case 'last7':
        startDate.setDate(today.getDate() - 6);
        break;
      case 'last30':
        startDate.setDate(today.getDate() - 29);
        break;
      case 'thisMonth': {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      }
      case 'lastMonth': {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      }
      default:
        return;
    }

    this.filterStartDate = this.formatDateInput(startDate);
    this.filterEndDate = this.formatDateInput(endDate);
    this.filterStartTime = '';
    this.filterEndTime = '';
    this.filterVisitors();
  }

  protected onCustomDateChange(): void {
    this.timeframeFilter = '';
    this.filterVisitors();
  }

  protected openTimePicker(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || typeof (input as any).showPicker !== 'function') {
      return;
    }
    (input as any).showPicker();
  }

  private parseTimeToMinutes(timeValue: string): number {
    const [hours, minutes] = timeValue.split(':').map(value => parseInt(value, 10));
    return hours * 60 + minutes;
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  protected sortVisitors(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySorting();
  }

  private applySorting(): void {
    this.filteredVisitorHistory.sort((a, b) => {
      let aValue = a[this.sortColumn];
      let bValue = b[this.sortColumn];

      // Handle date/time sorting
      if (this.sortColumn === 'entryTime' || this.sortColumn === 'exitTime') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        // String comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  protected getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return '⇅';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  protected clearFilters(): void {
    this.visitorSearchTerm = '';
    this.selectedComplexFilter = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterStartTime = '';
    this.filterEndTime = '';
    this.timeframeFilter = '';
    this.filterVisitors();
  }

  protected filterContracts(): void {
    let filtered = [...this.contractHistory];

    // Apply search filter
    if (this.contractSearchTerm.trim()) {
      const searchLower = this.contractSearchTerm.toLowerCase();
      filtered = filtered.filter(contract =>
        contract.companyName.toLowerCase().includes(searchLower) ||
        contract.complexName.toLowerCase().includes(searchLower) ||
        contract.companyEmail.toLowerCase().includes(searchLower) ||
        contract.companyTel.includes(searchLower) ||
        contract.psiraNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply complex filter
    if (this.contractComplexFilter) {
      filtered = filtered.filter(contract => contract.complexName === this.contractComplexFilter);
    }

    // Apply company filter
    if (this.contractCompanyFilter) {
      filtered = filtered.filter(contract => contract.companyName === this.contractCompanyFilter);
    }

    // Apply contract start date filter
    if (this.contractStartDateFilter) {
      const startDate = new Date(this.contractStartDateFilter);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(contract => new Date(contract.contractStartDate) >= startDate);
    }

    // Apply contract end date filter
    if (this.contractEndDateFilter) {
      const endDate = new Date(this.contractEndDateFilter);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(contract => new Date(contract.contractEndDate) <= endDate);
    }

    this.filteredContractHistory = filtered;
    this.applyContractSorting();
  }

  protected sortContracts(column: string): void {
    if (this.sortContractColumn === column) {
      this.sortContractDirection = this.sortContractDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortContractColumn = column;
      this.sortContractDirection = 'asc';
    }
    this.applyContractSorting();
  }

  private applyContractSorting(): void {
    this.filteredContractHistory.sort((a, b) => {
      let aValue = a[this.sortContractColumn];
      let bValue = b[this.sortContractColumn];

      // Handle date sorting
      if (this.sortContractColumn === 'contractStartDate' || this.sortContractColumn === 'contractEndDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        // String comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return this.sortContractDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortContractDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  protected getContractSortIcon(column: string): string {
    if (this.sortContractColumn !== column) {
      return '⇅';
    }
    return this.sortContractDirection === 'asc' ? '↑' : '↓';
  }

  protected clearContractFilters(): void {
    this.contractSearchTerm = '';
    this.contractComplexFilter = '';
    this.contractCompanyFilter = '';
    this.contractStartDateFilter = '';
    this.contractEndDateFilter = '';
    this.filterContracts();
  }

  protected get uniqueContractComplexes(): string[] {
    return Array.from(new Set(this.contractHistory.map(c => c.complexName))).sort();
  }

  protected get uniqueContractCompanies(): string[] {
    return Array.from(new Set(this.contractHistory.map(c => c.companyName))).sort();
  }
}
