import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';
import { ResponseBody } from '../interfaces/ResponseBody';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeFormDTO } from '../interfaces/forms/employeeFormDTO';
import { ManagerAssignmentFormDTO } from '../interfaces/forms/managerAssignmentFormDTO';
import { TenantFormDTO } from '../interfaces/forms/tenantFormDTO';
import { VehicleFormDTO } from '../interfaces/forms/vehicleFormDTO';

@Component({
  selector: 'app-security-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security-manager.html',
  styleUrl: './security-manager.css',
})
export class SecurityManager implements OnInit {
  protected securityManagerName = 'Security Manager';
  protected securityManagerEmail = 'security@equasec.com';
  private currentManagerEmail = '';
  private managerSecurityCompanyId = '';
  private managerSecurityCompanyName = '';
  private contractedComplexNames = new Set<string>();
  private contractedCommunityNames = new Set<string>();
  private complexContractDates = new Map<string, { startDate: string; endDate: string }>();
  private communityContractDates = new Map<string, { startDate: string; endDate: string }>();
  private complexContractDisplayNames = new Map<string, string>();
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
    assignedComplexes: string[];
    assignedCommunities: string[];
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
    locationPath: string[];
  }> = [];

  protected isEmployeeModalOpen = false;
  protected isComplexDetailModalOpen = false;
  protected isAssignmentModalOpen = false;
  protected isDeleteEmployeeModalOpen = false;
  protected isTenantModalOpen = false;
  protected isDeleteTenantModalOpen = false;
  protected selectedComplex: any = null;
  protected selectedComplexEmployees: any[] = [];
  protected selectedComplexDaysRemaining = 0;
  protected selectedComplexContractExpiringSoon = false;
  protected selectedComplexContractExpired = false;
  protected selectedSecurityManager: any = null;
  protected selectedEmployeeToDelete: any = null;
  protected selectedTenantToDelete: any = null;

  protected employeeForm: EmployeeFormDTO = {
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

  protected assignmentForm: ManagerAssignmentFormDTO = {
    securityManagerId: '',
    assignedComplexes: [] as string[],
    assignedCommunities: [] as string[],
  };
  protected assignmentError = '';
  protected assignmentSuccess = '';

  protected tenantForm: TenantFormDTO = {
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
    vehicles: [] as VehicleFormDTO[],
  };
  protected currentVehicle: VehicleFormDTO = {
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

  protected sosAlerts: Array<{
    id: string;
    date: string;
    guardName: string;
    guardPhone: string;
    stationType: 'complex' | 'gated' | 'unknown';
    stationName: string;
    complexName: string;
    gatedCommunityName: string;
    address: string;
  }> = [];
  protected sosSearchTerm = '';
  protected sosFilterSourceType: 'all' | 'complex' | 'gated' = 'all';

  private filteredEmployeesCache: any[] = [];
  private filteredEmployeesKey = '';
  private filteredVisitorsCache: any[] = [];
  private filteredVisitorsKey = '';
  private filteredTenantsCache: any[] = [];
  private filteredTenantsKey = '';
  private visitorCommunityComplexesCache: any[] = [];
  private visitorCommunityComplexesKey = '';
  private tenantCommunityComplexesFilterCache: any[] = [];
  private tenantCommunityComplexesFilterKey = '';
  private availableTenantResidenceTypesCache: Array<{ value: 'complex' | 'community'; label: string }> = [];
  private availableTenantResidenceTypesKey = '';
  private availableCommunityResidenceTypesCache: Array<'house' | 'complex'> = [];
  private availableCommunityResidenceTypesKey = '';
  private availableUnitsCache: string[] = [];
  private availableUnitsKey = '';
  private availableHousesCache: string[] = [];
  private availableHousesKey = '';
  private availableCommunityComplexesCache: Array<{ id: string; name: string; units: string[] }> = [];
  private availableCommunityComplexesKey = '';
  private availableCommunityUnitsCache: string[] = [];
  private availableCommunityUnitsKey = '';

  constructor(
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly storage: StorageService,
  ) {}

  ngOnInit(): void {
    this.hydrateFromStoredUser();
    this.loadCurrentUser();
    this.loadVisitors();
    this.loadSosAlerts();
  }

  private hydrateFromStoredUser(): void {
    const rawUser =
      this.storage?.getItem?.('current-user') ??
      (typeof window !== 'undefined' ? window.localStorage.getItem('current-user') : null);
    if (!rawUser) {
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      this.securityManagerName = `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() || this.securityManagerName;
      this.securityManagerEmail = user?.emailAddress ?? this.securityManagerEmail;
      this.currentManagerEmail = user?.emailAddress ?? this.currentManagerEmail;
      this.managerSecurityCompanyId = user?.securityCompany?._id ?? '';
      this.managerSecurityCompanyName = user?.securityCompany?.name ?? '';
      this.loadCompanyContracts();
    } catch {
      return;
    }
  }

  private normalizeName(value: string | undefined | null): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private applyCompanyContracts(company: any): void {
    this.contractedComplexNames.clear();
    this.contractedCommunityNames.clear();
    this.complexContractDates.clear();
    this.communityContractDates.clear();
    this.complexContractDisplayNames.clear();

    const contracts = company?.contract ?? [];
    for (const contract of contracts) {
      const complexName = this.normalizeName(contract?.complex?.name ?? contract?.complexName);
      const communityName = this.normalizeName(contract?.gatedCommunityName);
      const startDate = this.formatDateValue(contract?.contractStartDate ?? contract?.contractStart);
      const endDate = this.formatDateValue(contract?.contractEndDate ?? contract?.contractEnd);

      if (complexName) {
        this.contractedComplexNames.add(complexName);
        this.complexContractDates.set(complexName, { startDate, endDate });
        this.complexContractDisplayNames.set(complexName, (contract?.complex?.name ?? contract?.complexName ?? '').trim());
      }

      if (communityName) {
        this.contractedCommunityNames.add(communityName);
        this.communityContractDates.set(communityName, { startDate, endDate });
      }
    }
  }

  private formatDateValue(dateValue: unknown): string {
    if (!dateValue) {
      return '';
    }

    const parsed = new Date(String(dateValue));
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().split('T')[0];
  }

  private loadCompanyContracts(): void {
    const loadFromCompanyList = (): void => {
      this.dataService.get<any[]>('securityCompany').subscribe({
        next: (companies) => {
          const company = (companies ?? []).find((item) => {
            const managerEmailMatch =
              this.currentManagerEmail &&
              this.normalizeName(item?.managerEmail) === this.normalizeName(this.currentManagerEmail);
            const companyNameMatch =
              this.managerSecurityCompanyName &&
              this.normalizeName(item?.name) === this.normalizeName(this.managerSecurityCompanyName);

            return Boolean(managerEmailMatch || companyNameMatch);
          });

          this.applyCompanyContracts(company);
          this.loadAssignedComplexes();
          this.loadGatedCommunities();
          this.loadUsers();
        },
        error: () => {
          this.assignedComplexes = [];
          this.gatedCommunities = [];
        },
      });
    };

    if (this.managerSecurityCompanyId) {
      this.dataService.get<any>(`securityCompany/${this.managerSecurityCompanyId}`).subscribe({
        next: (company) => {
          this.applyCompanyContracts(company);
          this.loadAssignedComplexes();
          this.loadGatedCommunities();
          this.loadUsers();
        },
        error: () => {
          loadFromCompanyList();
        },
      });
      return;
    }

    if (!this.managerSecurityCompanyName && !this.currentManagerEmail) {
      this.assignedComplexes = [];
      this.gatedCommunities = [];
      return;
    }

    loadFromCompanyList();
  }

  private loadCurrentUser(): void {
    this.dataService.get<any>('user/current').subscribe({
      next: (user) => {
        if (!user) {
          this.assignedComplexes = [];
          this.gatedCommunities = [];
          return;
        }
        this.securityManagerName = `${user.name ?? ''} ${user.surname ?? ''}`.trim() || this.securityManagerName;
        this.securityManagerEmail = user.emailAddress ?? this.securityManagerEmail;
        this.currentManagerEmail = user.emailAddress ?? this.currentManagerEmail;
        this.managerSecurityCompanyId = user.securityCompany?._id ?? '';
        this.managerSecurityCompanyName = user.securityCompany?.name ?? '';
        this.loadCompanyContracts();
      },
      error: () => {
        this.assignedComplexes = [];
        this.gatedCommunities = [];
      },
    });
  }

  private loadAssignedComplexes(): void {
    this.dataService.get<any[]>('complex').subscribe({
      next: (complexes) => {
        const mappedComplexes = (complexes || [])
          .filter((complex) => {
            const complexName = this.normalizeName(complex?.name);
            const communityName = this.normalizeName(complex?.gatedCommunityName);
            return this.contractedComplexNames.has(complexName) || this.contractedCommunityNames.has(communityName);
          })
          .map((complex) => {
            const contractDates =
              this.complexContractDates.get(this.normalizeName(complex?.name)) ??
              this.communityContractDates.get(this.normalizeName(complex?.gatedCommunityName));
            return {
              id: complex._id ?? complex.id ?? '',
              name: complex.name ?? '',
              location: complex.address ?? '',
              status: 'active' as 'active' | 'inactive',
              totalUnits: complex.numberOfUnits ?? 0,
              employees: 0,
              contractStartDate: contractDates?.startDate ?? '',
              contractEndDate: contractDates?.endDate ?? '',
              units: this.generateUnits(complex.numberOfUnits ?? 0),
            };
          });

        const existingKeys = new Set(mappedComplexes.map((complex) => this.normalizeName(complex.name)));
        const missingFromContracts = Array.from(this.contractedComplexNames)
          .filter((contractedName) => !existingKeys.has(contractedName))
          .map((contractedName) => {
            const contractDates = this.complexContractDates.get(contractedName);
            const displayName = this.complexContractDisplayNames.get(contractedName) || contractedName;
            return {
              id: `contract-${contractedName}`,
              name: displayName,
              location: 'Assigned by contract',
              status: 'active' as 'active' | 'inactive',
              totalUnits: 0,
              employees: 0,
              contractStartDate: contractDates?.startDate ?? '',
              contractEndDate: contractDates?.endDate ?? '',
              units: [],
            };
          });

        this.assignedComplexes = [...mappedComplexes, ...missingFromContracts];
        this.refreshTenantLocationPaths();
      },
      error: () => {
        this.assignedComplexes = [];
        this.refreshTenantLocationPaths();
      },
    });
  }

  private loadGatedCommunities(): void {
    this.dataService.get<any[]>('gatedCommunity').subscribe({
      next: (communities) => {
        this.gatedCommunities = (communities || [])
          .filter((community) => {
            const communityName = this.normalizeName(community?.name);
            const communityComplexes = Array.isArray(community?.complexes)
              ? community.complexes.map((name: string) => this.normalizeName(name))
              : [];

            const linkedByComplex = communityComplexes.some((name: string) => this.contractedComplexNames.has(name));
            return this.contractedCommunityNames.has(communityName) || linkedByComplex;
          })
          .map((community) => {
            const contractDates = this.communityContractDates.get(this.normalizeName(community?.name));
            return {
              id: community._id ?? community.id ?? '',
              name: community.name ?? '',
              complexId: community.complexId ?? '',
              status: 'active' as 'active' | 'inactive',
              totalResidents: community.numberOfHouses ?? 0,
              contractStartDate: contractDates?.startDate ?? '',
              contractEndDate: contractDates?.endDate ?? '',
              houses: this.generateHouses(community.numberOfHouses ?? 0),
              complexesInCommunity: [],
            };
          });
        this.refreshTenantLocationPaths();
      },
      error: () => {
        this.gatedCommunities = [];
        this.refreshTenantLocationPaths();
      },
    });
  }
  private loadUsers(): void {
    this.dataService.get<any>('user').subscribe({
      next: (response) => {
        const users = Array.isArray(response) ? response : response?.payload ?? [];

        const belongsToCurrentSecurityCompany = (user: any): boolean => {
          const userCompanyId = user?.securityCompany?._id ? String(user.securityCompany._id) : '';
          const userCompanyName = this.normalizeName(user?.securityCompany?.name);

          const byId = this.managerSecurityCompanyId && userCompanyId === this.managerSecurityCompanyId;
          const byName = this.managerSecurityCompanyName && userCompanyName === this.normalizeName(this.managerSecurityCompanyName);

          return Boolean(byId || byName);
        };

        const hasContractAccessForCompany = (user: any): boolean => {
          if (this.contractedComplexNames.size === 0 && this.contractedCommunityNames.size === 0) {
            return true;
          }

          const employeeContracts = Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
          const assignedComplexIdsInScope = new Set(this.assignedComplexes.map((complex) => String(complex.id)));
          const assignedCommunityIdsInScope = new Set(this.gatedCommunities.map((community) => String(community.id)));
          const assignedCommunityNamesInScope = new Set(this.gatedCommunities.map((community) => this.normalizeName(community.name)));

          if (employeeContracts.length > 0) {
            return employeeContracts.some((contract: any) => {
              const contractCompanyId = contract?.securityCompany?._id ? String(contract.securityCompany._id) : '';
              const contractCompanyName = this.normalizeName(contract?.securityCompany?.name);
              const contractAssignedComplexes = Array.isArray(contract?.assignedComplexes)
                ? contract.assignedComplexes.map((value: unknown) => String(value ?? '').trim()).filter((value: string) => value.length > 0)
                : [];
              const contractAssignedCommunities = Array.isArray(contract?.assignedCommunities)
                ? contract.assignedCommunities.map((value: unknown) => String(value ?? '').trim()).filter((value: string) => value.length > 0)
                : [];

              const contractMatchesCompany =
                (this.managerSecurityCompanyId && contractCompanyId === this.managerSecurityCompanyId) ||
                (this.managerSecurityCompanyName && contractCompanyName === this.normalizeName(this.managerSecurityCompanyName));

              if (!contractMatchesCompany) {
                return false;
              }

              if (contractAssignedComplexes.length === 0 && contractAssignedCommunities.length === 0) {
                return true;
              }

              const hasComplexInScope = contractAssignedComplexes.some((complexId: string) => assignedComplexIdsInScope.has(complexId));
              const hasCommunityInScope = contractAssignedCommunities.some((community: string) => {
                const normalized = this.normalizeName(community);
                return assignedCommunityIdsInScope.has(community) || assignedCommunityNamesInScope.has(normalized);
              });

              return hasComplexInScope || hasCommunityInScope;
            });
          }

          const userComplexName = this.normalizeName(user?.complex?.name);
          if (this.contractedComplexNames.has(userComplexName)) {
            return true;
          }

          const userComplexId = user?.complex?._id ? String(user.complex._id) : '';
          if (userComplexId && this.assignedComplexes.some((complex) => complex.id === userComplexId)) {
            return true;
          }

          return false;
        };

        const resolveEmployeeStatusForCompany = (user: any): 'active' | 'inactive' => {
          const employeeContracts = Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
          const currentContract = employeeContracts.find((contract: any) => {
            const contractCompanyId = contract?.securityCompany?._id ? String(contract.securityCompany._id) : '';
            const contractCompanyName = this.normalizeName(contract?.securityCompany?.name);
            return (
              (this.managerSecurityCompanyId && contractCompanyId === this.managerSecurityCompanyId) ||
              (this.managerSecurityCompanyName && contractCompanyName === this.normalizeName(this.managerSecurityCompanyName))
            );
          });

          if (currentContract?.status === 'inactive') {
            return 'inactive';
          }

          if (currentContract?.status === 'active') {
            return 'active';
          }

          return user?.movedOut ? 'inactive' : 'active';
        };

        this.employees = users
          .filter((user: any) => this.hasRole(user, 'security'))
          .filter((user: any) => belongsToCurrentSecurityCompany(user))
          .filter((user: any) => hasContractAccessForCompany(user))
          .map((user: any) => {
            const assignedComplexes = Array.isArray(user?.assignedComplexes)
              ? user.assignedComplexes.filter((value: unknown) => typeof value === 'string' && value.length > 0)
              : (user?.complex?._id ? [String(user.complex._id)] : []);

            const assignedCommunities = Array.isArray(user?.assignedCommunities)
              ? user.assignedCommunities.filter((value: unknown) => typeof value === 'string' && value.length > 0)
              : [];

            return {
              id: user._id ?? '',
              name: user.name ?? '',
              surname: user.surname ?? '',
              email: user.emailAddress ?? '',
              phone: user.cellNumber ?? '',
              position: this.hasRole(user, 'admin') ? 'admin-Guard' : 'Guard',
              assignedComplex: assignedComplexes[0] ?? '',
              assignedComplexes,
              assignedCommunities,
              status: resolveEmployeeStatusForCompany(user),
            };
          });

        this.securityManagers = users
          .filter((user: any) => this.hasRole(user, 'security'))
          .filter((user: any) => belongsToCurrentSecurityCompany(user))
          .filter((user: any) => hasContractAccessForCompany(user))
          .map((user: any) => {
            const assignedComplexes = Array.isArray(user?.assignedComplexes)
              ? user.assignedComplexes.filter((value: unknown) => typeof value === 'string' && value.length > 0)
              : (user?.complex?._id ? [String(user.complex._id)] : []);

            const assignedCommunities = Array.isArray(user?.assignedCommunities)
              ? user.assignedCommunities.filter((value: unknown) => typeof value === 'string' && value.length > 0)
              : [];

            return {
              id: user._id ?? '',
              name: user.name ?? '',
              surname: user.surname ?? '',
              email: user.emailAddress ?? '',
              phone: user.cellNumber ?? '',
              position: this.hasRole(user, 'admin') ? 'admin-Guard' : 'Guard',
              profilePicture: user.profilePhoto ?? '',
              assignedComplexes,
              assignedCommunities,
              status: resolveEmployeeStatusForCompany(user),
            };
          });

        this.tenants = users
          .filter((user: any) => this.hasRole(user, 'tenant'))
          .filter((user: any) => {
            const userResidenceType: 'complex' | 'community' =
              user?.residenceType === 'community' || user?.residenceType === 'complex'
                ? user.residenceType
                : (user?.communityId ? 'community' : 'complex');

            const assignedComplexIds = new Set(this.assignedComplexes.map((complex) => String(complex.id)));
            const assignedCommunityIds = new Set(this.gatedCommunities.map((community) => String(community.id)));

            const userComplexId = String(user?.complex?._id ?? '');
            const userCommunityId = String(user?.communityId ?? '');
            const userCommunityComplexId = String(user?.communityComplexId ?? '');

            if (userResidenceType === 'complex') {
              return userComplexId ? assignedComplexIds.has(userComplexId) : false;
            }

            if (userCommunityId && assignedCommunityIds.has(userCommunityId)) {
              return true;
            }

            if (userCommunityComplexId && assignedComplexIds.has(userCommunityComplexId)) {
              return true;
            }

            return userComplexId ? assignedComplexIds.has(userComplexId) : false;
          })
          .map((user: any) => {
            const mappedResidenceType: 'complex' | 'community' =
              user?.residenceType === 'community' || user?.residenceType === 'complex'
                ? user.residenceType
                : (user?.communityId ? 'community' : 'complex');

            const mappedCommunityResidenceType: 'house' | 'complex' =
              user?.communityResidenceType === 'complex' ? 'complex' : 'house';

            return {
              id: user._id ?? '',
              name: user.name ?? '',
              surname: user.surname ?? '',
              email: user.emailAddress ?? '',
              phone: user.cellNumber ?? '',
              idNumber: user.idNumber ?? '',
              residenceType: mappedResidenceType,
              complexId: mappedResidenceType === 'complex' ? (user.complex?._id ?? '') : '',
              communityId: mappedResidenceType === 'community' ? (user.communityId ?? '') : '',
              communityResidenceType: mappedResidenceType === 'community' ? mappedCommunityResidenceType : undefined,
              communityComplexId:
                mappedResidenceType === 'community' && mappedCommunityResidenceType === 'complex'
                  ? (user.communityComplexId ?? user.complex?._id ?? '')
                  : '',
              address: user.address ?? '',
              vehicles: Array.isArray(user.vehicles)
                ? user.vehicles.map((vehicle: any) => ({
                    make: vehicle?.make ?? '',
                    model: vehicle?.model ?? '',
                    reg: vehicle?.reg ?? '',
                    color: vehicle?.color ?? '',
                  }))
                : [],
              registeredDate: new Date().toISOString().split('T')[0],
              locationPath: [],
            };
          });

        this.refreshTenantLocationPaths();
      },
      error: () => {
        this.employees = [];
        this.securityManagers = [];
        this.tenants = [];
      },
    });
  }

  private hasRole(user: any, role: string): boolean {
    const type = user?.type;
    if (Array.isArray(type)) {
      return type.includes(role);
    }
    if (typeof type === 'string') {
      return type.includes(role);
    }
    return false;
  }

  private loadVisitors(): void {
    this.dataService.get<any[]>('logs').subscribe({
      next: (logs) => {
        this.visitors = (logs || []).map((log) => {
          const visitor = log.visitor ?? {};
          const tenant = visitor.user ?? {};
          return {
            id: visitor._id ?? '',
            name: visitor.name ?? '',
            surname: visitor.surname ?? '',
            phone: visitor.contact ?? '',
            tenantName: `${tenant.name ?? ''} ${tenant.surname ?? ''}`.trim(),
            tenantUnit: tenant.unit ?? '',
            tenantPhone: tenant.cellNumber ?? '',
            visitDate: log.date ?? '',
            complexId: tenant.complex?._id ?? '',
            vehicle: visitor.vehicle
              ? {
                  make: visitor.vehicle.make ?? '',
                  model: visitor.vehicle.model ?? '',
                  reg: visitor.vehicle.registerationNumber ?? visitor.vehicle.registration ?? '',
                  color: visitor.vehicle.color ?? '',
                }
              : undefined,
          };
        });
      },
      error: () => {
        this.visitors = [];
      },
    });
  }

  private loadSosAlerts(): void {
    this.dataService.get<any>('sos').subscribe({
      next: (response) => {
        const items = Array.isArray(response) ? response : response?.payload ?? [];

        this.sosAlerts = (items || [])
          .map((item: any) => {
            const guard = item?.guard ?? {};
            const station = item?.station ?? {};
            const rawType = String(station?.type ?? '').toLowerCase();
            const stationType: 'complex' | 'gated' | 'unknown' =
              rawType === 'complex' || rawType === 'gated'
                ? rawType
                : 'unknown';

            return {
              id: String(item?._id ?? ''),
              date: String(item?.date ?? ''),
              guardName: `${guard?.name ?? ''} ${guard?.surname ?? ''}`.trim() || 'Unknown Guard',
              guardPhone: String(guard?.cellNumber ?? ''),
              stationType,
              stationName: String(station?.name ?? ''),
              complexName: String(station?.complexName ?? ''),
              gatedCommunityName: String(station?.gatedCommunityName ?? ''),
              address: String(station?.complexAddress ?? ''),
            };
          })
          .sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      error: () => {
        this.sosAlerts = [];
      },
    });
  }

  protected get filteredSosAlerts(): any[] {
    const query = this.sosSearchTerm.trim().toLowerCase();

    return this.sosAlerts.filter((alert) => {
      const matchesType = this.sosFilterSourceType === 'all' || alert.stationType === this.sosFilterSourceType;
      if (!matchesType) {
        return false;
      }

      if (!query) {
        return true;
      }

      const sourceText = this.getSosSourceDisplay(alert).toLowerCase();
      const addressText = this.getSosAddressDisplay(alert).toLowerCase();
      return (
        alert.guardName.toLowerCase().includes(query) ||
        alert.guardPhone.toLowerCase().includes(query) ||
        sourceText.includes(query) ||
        addressText.includes(query)
      );
    });
  }

  protected getSosSourceDisplay(alert: any): string {
    const complexName = String(alert?.complexName ?? '').trim();
    const gatedCommunityName = String(alert?.gatedCommunityName ?? '').trim();

    if (gatedCommunityName && complexName) {
      return `${gatedCommunityName} - ${complexName}`;
    }

    if (alert.stationType === 'complex') {
      return complexName || alert.stationName || 'Complex';
    }

    if (alert.stationType === 'gated') {
      return gatedCommunityName || alert.stationName || 'Gated Community';
    }

    return complexName || gatedCommunityName || alert.stationName || 'Unknown';
  }

  protected getSosAddressDisplay(alert: any): string {
    return alert.address || 'Address not available';
  }

  protected isSosRecent(alertDate: string): boolean {
    const alertTime = new Date(alertDate).getTime();
    if (Number.isNaN(alertTime)) {
      return false;
    }

    const now = Date.now();
    const ageMs = now - alertTime;
    return ageMs >= 0 && ageMs <= 15 * 60 * 1000;
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

    this.dataService.delete<ResponseBody>(`user/security-employee/${this.selectedEmployeeToDelete.id}`).subscribe({
      next: () => {
        this.employees = this.employees.filter((e) => e.id !== this.selectedEmployeeToDelete.id);
        this.employeeSuccess = 'Employee deleted successfully!';
        setTimeout(() => (this.employeeSuccess = ''), 3000);
        this.closeDeleteEmployeeModal();
      },
      error: (error) => {
        this.employeeError = error?.error?.message || 'Unable to delete employee.';
      },
    });
  }

  protected submitEmployeeForm(): void {
    if (!this.employeeForm.name || !this.employeeForm.surname || !this.employeeForm.email || !this.employeeForm.phone) {
      this.employeeError = 'Please fill in all required fields.';
      return;
    }

    this.employeeForm.phone = this.employeeForm.phone.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.employeeForm.email)) {
      this.employeeError = 'Please enter a valid email address.';
      return;
    }

    if (!/^0\d{9}$/.test(this.employeeForm.phone)) {
      this.employeeError = 'Phone number must be 10 digits and start with 0.';
      return;
    }

    if (this.editingEmployeeId) {
      const assignedComplexId = this.employeeForm.assignedComplex || '';
      const assignedComplexName = this.assignedComplexes.find((complex) => complex.id === assignedComplexId)?.name || '';
      const assignedCommunityName =
        this.gatedCommunities.find((community) => this.normalizeName(this.getComplexName(community.complexId)) === this.normalizeName(assignedComplexName))?.name || '';

      const payload = {
        name: this.employeeForm.name.trim(),
        surname: this.employeeForm.surname.trim(),
        emailAddress: this.employeeForm.email.trim().toLowerCase(),
        cellNumber: this.employeeForm.phone.trim(),
        position: this.employeeForm.position,
        status: this.employeeForm.status,
        assignedComplexId,
        assignedComplexName,
        assignedGatedCommunityName: assignedCommunityName,
      };

      this.dataService.put<ResponseBody>(`user/security-employee/${this.editingEmployeeId}`, payload).subscribe({
        next: (response) => {
          const updatedUser = response?.payload;
          const index = this.employees.findIndex((employee) => employee.id === this.editingEmployeeId);
          if (index !== -1) {
            this.employees[index] = {
              id: updatedUser?._id ?? this.editingEmployeeId,
              name: updatedUser?.name ?? this.employeeForm.name,
              surname: updatedUser?.surname ?? this.employeeForm.surname,
              email: updatedUser?.emailAddress ?? this.employeeForm.email,
              phone: updatedUser?.cellNumber ?? this.employeeForm.phone,
              position: this.employeeForm.position,
              assignedComplex: updatedUser?.complex?._id ?? assignedComplexId,
              assignedComplexes: [updatedUser?.complex?._id ?? assignedComplexId].filter((value) => Boolean(value)),
              assignedCommunities: [],
              status: this.employeeForm.status,
            };
          }

          this.employeeSuccess = 'Employee updated successfully!';
          this.employeeError = '';
          setTimeout(() => {
            this.closeEmployeeModal();
          }, 1500);
        },
        error: (error) => {
          this.employeeError = error?.error?.message || 'Unable to update employee.';
        },
      });
      return;
    } else {
      const defaultComplex = this.assignedComplexes[0];
      const assignedComplexId = this.employeeForm.assignedComplex || defaultComplex?.id || '';
      const assignedComplexName = this.assignedComplexes.find((complex) => complex.id === assignedComplexId)?.name || '';
      const assignedCommunityName =
        this.gatedCommunities.find((community) => this.normalizeName(this.getComplexName(community.complexId)) === this.normalizeName(assignedComplexName))?.name || '';

      const payload = {
        name: this.employeeForm.name.trim(),
        surname: this.employeeForm.surname.trim(),
        emailAddress: this.employeeForm.email.trim().toLowerCase(),
        cellNumber: this.employeeForm.phone.trim(),
        position: this.employeeForm.position,
        status: this.employeeForm.status,
        assignedComplexId,
        assignedComplexName,
        assignedGatedCommunityName: assignedCommunityName,
        contractStartDate: new Date().toISOString().split('T')[0],
      };

      this.dataService.post<ResponseBody>('user/security-employee', payload).subscribe({
        next: (response) => {
          const createdUser = response?.payload?.user;
          if (!createdUser) {
            this.employeeError = 'Unable to add employee.';
            return;
          }

          const newEmployee = {
            id: createdUser._id ?? `emp-${Date.now()}`,
            name: createdUser.name ?? this.employeeForm.name,
            surname: createdUser.surname ?? this.employeeForm.surname,
            email: createdUser.emailAddress ?? this.employeeForm.email,
            phone: createdUser.cellNumber ?? this.employeeForm.phone,
            position: this.employeeForm.position,
            assignedComplex: createdUser.complex?._id ?? assignedComplexId,
            assignedComplexes: [createdUser.complex?._id ?? assignedComplexId].filter((value) => Boolean(value)),
            assignedCommunities: [],
            status: this.employeeForm.status,
          };

          this.employees.push(newEmployee);
          const temporaryPin = response?.payload?.temporaryPin;
          this.employeeSuccess = temporaryPin
            ? `Employee added successfully! Temporary PIN: ${temporaryPin}`
            : 'Employee added successfully!';
          this.employeeError = '';
          setTimeout(() => {
            this.closeEmployeeModal();
          }, 1500);
        },
        error: (error) => {
          this.employeeError = error?.error?.message || 'Unable to add employee.';
        },
      });
      return;
    }

    this.employeeError = '';
    setTimeout(() => {
      this.closeEmployeeModal();
    }, 1500);
  }
  protected openComplexDetails(complex: any): void {
    this.selectedComplex = complex;
    this.selectedComplexEmployees = this.employees.filter((employee) => {
      const assignedComplexes = Array.isArray(employee.assignedComplexes) ? employee.assignedComplexes : [];
      return assignedComplexes.includes(complex.id) || employee.assignedComplex === complex.id;
    });
    this.updateSelectedComplexContractState(complex?.contractEndDate);
    this.isComplexDetailModalOpen = true;
  }

  protected openGatedCommunityDetails(community: any): void {
    this.selectedComplex = {
      id: community.id,
      name: community.name,
      location: this.getComplexName(community.complexId),
      status: community.status,
      totalUnits: community.totalResidents,
      contractStartDate: community.contractStartDate,
      contractEndDate: community.contractEndDate,
    };
    this.selectedComplexEmployees = this.employees.filter((employee) => {
      const assignedCommunities = Array.isArray(employee.assignedCommunities) ? employee.assignedCommunities : [];
      const assignedComplexes = Array.isArray(employee.assignedComplexes) ? employee.assignedComplexes : [];
      const communityComplexId = String(community?.complexId ?? '').trim();

      return (
        assignedCommunities.includes(community.id) ||
        (communityComplexId.length > 0 && (
          assignedComplexes.includes(communityComplexId) ||
          employee.assignedComplex === communityComplexId
        ))
      );
    });
    this.updateSelectedComplexContractState(community?.contractEndDate);
    this.isComplexDetailModalOpen = true;
  }

  protected closeComplexDetails(): void {
    this.isComplexDetailModalOpen = false;
    this.selectedComplex = null;
    this.selectedComplexEmployees = [];
    this.selectedComplexDaysRemaining = 0;
    this.selectedComplexContractExpiringSoon = false;
    this.selectedComplexContractExpired = false;
  }

  private updateSelectedComplexContractState(endDate: string): void {
    this.selectedComplexDaysRemaining = this.getContractDaysRemaining(endDate);
    this.selectedComplexContractExpiringSoon = this.selectedComplexDaysRemaining <= 90 && this.selectedComplexDaysRemaining > 0;
    this.selectedComplexContractExpired = this.selectedComplexDaysRemaining < 0;
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
    if (!manager) {
      this.assignmentError = 'Selected guard was not found.';
      return;
    }

    const payload = {
      assignedComplexes: [...this.assignmentForm.assignedComplexes],
      assignedCommunities: [...this.assignmentForm.assignedCommunities],
    };

    this.dataService.put<ResponseBody>(`user/security-assignment/${manager.id}`, payload).subscribe({
      next: () => {
        manager.assignedComplexes = [...payload.assignedComplexes];
        manager.assignedCommunities = [...payload.assignedCommunities];

        const employeeIndex = this.employees.findIndex((employee) => employee.id === manager.id);
        if (employeeIndex > -1) {
          this.employees[employeeIndex] = {
            ...this.employees[employeeIndex],
            assignedComplexes: [...payload.assignedComplexes],
            assignedCommunities: [...payload.assignedCommunities],
            assignedComplex: payload.assignedComplexes[0] ?? '',
          };
        }

        this.assignmentSuccess = 'Assignment updated successfully!';
        this.assignmentError = '';
        setTimeout(() => {
          this.closeAssignmentModal();
        }, 1500);
      },
      error: (error: HttpErrorResponse) => {
        this.assignmentError = error?.error?.message || 'Unable to save assignment.';
      },
    });
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
    const key = `${this.searchTerm}|${this.filterStatus}|${this.employees.length}`;
    if (this.filteredEmployeesKey === key) {
      return this.filteredEmployeesCache;
    }

    this.filteredEmployeesCache = this.employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.surname.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.phone.includes(this.searchTerm);

      const matchesStatus = this.filterStatus === 'all' || emp.status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });

    this.filteredEmployeesKey = key;
    return this.filteredEmployeesCache;
  }

  protected get filteredVisitors(): any[] {
    const key = `${this.visitorStartDate}|${this.visitorEndDate}|${this.visitorFilterResidenceType}|${this.visitorFilterComplexId}|${this.visitorFilterCommunityId}|${this.visitorFilterCommunityResidenceType}|${this.visitorFilterCommunityComplexId}|${this.visitors.length}`;
    if (this.filteredVisitorsKey === key) {
      return this.filteredVisitorsCache;
    }

    this.filteredVisitorsCache = this.visitors.filter((visitor) => {
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

    this.filteredVisitorsKey = key;
    return this.filteredVisitorsCache;
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
    const key = `${this.visitorFilterCommunityId}|${this.gatedCommunities.length}`;
    if (this.visitorCommunityComplexesKey === key) {
      return this.visitorCommunityComplexesCache;
    }

    if (!this.visitorFilterCommunityId) {
      this.visitorCommunityComplexesCache = [];
      this.visitorCommunityComplexesKey = key;
      return this.visitorCommunityComplexesCache;
    }
    const community = this.gatedCommunities.find(gc => gc.id === this.visitorFilterCommunityId);
    this.visitorCommunityComplexesCache = community?.complexesInCommunity || [];
    this.visitorCommunityComplexesKey = key;
    return this.visitorCommunityComplexesCache;
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

  private buildTenantLocationPath(tenant: any): string[] {
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

  private refreshTenantLocationPaths(): void {
    this.tenants = this.tenants.map((tenant: any) => ({
      ...tenant,
      locationPath: this.buildTenantLocationPath(tenant),
    }));
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
    ].map((tenant: any) => ({
      ...tenant,
      locationPath: this.buildTenantLocationPath(tenant),
    }));
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

    this.tenantForm.phone = this.tenantForm.phone.trim();

    if (!/^0\d{9}$/.test(this.tenantForm.phone)) {
      this.tenantError = 'Phone number must be 10 digits and start with 0.';
      return;
    }

    const allowedResidenceTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!allowedResidenceTypes.includes(this.tenantForm.residenceType)) {
      this.tenantError = 'Selected residence type is not available for your assigned sites.';
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

    if (this.tenantForm.residenceType === 'community' && !this.availableCommunityResidenceTypes.includes(this.tenantForm.communityResidenceType)) {
      this.tenantError = 'Selected community residence type is not available.';
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
        ? this.tenants.find((t: any) => t.id === this.editingTenantId)?.registeredDate || new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };

    const normalizedTenantEmail = tenantData.email.trim().toLowerCase();

    const selectedComplexForTenant =
      tenantData.residenceType === 'complex'
        ? this.assignedComplexes.find((complex) => complex.id === tenantData.complexId)
        : this.availableCommunityComplexes.find((complex) => complex.id === tenantData.communityComplexId);

    const payload = {
      name: tenantData.name,
      surname: tenantData.surname,
      emailAddress: normalizedTenantEmail,
      cellNumber: tenantData.phone,
      idNumber: tenantData.idNumber,
      address: tenantData.address,
      residenceType: tenantData.residenceType,
      complexId: tenantData.residenceType === 'complex' ? tenantData.complexId : tenantData.communityComplexId,
      complexName: selectedComplexForTenant?.name ?? '',
      communityId: tenantData.communityId,
      communityResidenceType: tenantData.communityResidenceType,
      communityComplexId: tenantData.communityComplexId,
      vehicles: tenantData.vehicles,
    };

    if (this.editingTenantId) {
      this.dataService.put<ResponseBody>(`user/tenant/${this.editingTenantId}`, payload).subscribe({
        next: (response: ResponseBody) => {
          const updatedUser = response?.payload?.user;
          const updatedTenant = {
            ...tenantData,
            id: updatedUser?._id ?? this.editingTenantId,
            email: updatedUser?.emailAddress ?? tenantData.email,
            phone: updatedUser?.cellNumber ?? tenantData.phone,
            locationPath: this.buildTenantLocationPath(tenantData),
          };

          const index = this.tenants.findIndex((t: any) => t.id === this.editingTenantId);
          if (index > -1) {
            this.tenants[index] = updatedTenant;
          }

          this.tenantSuccess = 'Tenant updated successfully!';
          setTimeout(() => {
            this.closeTenantModal();
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.tenantError = error?.error?.message || 'Unable to update tenant.';
        },
      });
      return;
    } else {
      const existingTenant = this.tenants.find((tenant: any) => tenant.email?.trim().toLowerCase() === normalizedTenantEmail);
      if (existingTenant) {
        this.tenantError = 'A tenant with this email already exists. Open Edit to update the tenant.';
        return;
      }

      this.dataService.post<ResponseBody>('user/tenant', payload).subscribe({
        next: (response) => {
          const createdUser = response?.payload?.user;
          const mappedTenant = {
            ...tenantData,
            id: createdUser?._id ?? tenantData.id,
            email: createdUser?.emailAddress ?? tenantData.email,
            phone: createdUser?.cellNumber ?? tenantData.phone,
            locationPath: this.buildTenantLocationPath(tenantData),
          };

          this.tenants.push(mappedTenant);
          const temporaryPin = response?.payload?.temporaryPin;
          this.tenantSuccess = temporaryPin
            ? `Tenant registered successfully! Temporary PIN: ${temporaryPin}`
            : 'Tenant registered successfully!';

          setTimeout(() => {
            this.closeTenantModal();
          }, 1500);
        },
        error: (error) => {
          this.tenantError = error?.error?.message || 'Unable to register tenant.';
        },
      });
      return;
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
      const tenantId = this.selectedTenantToDelete.id;
      this.dataService.delete<ResponseBody>(`user/tenant/${tenantId}`).subscribe({
        next: () => {
          this.tenants = this.tenants.filter((t: any) => t.id !== tenantId);
          this.closeDeleteTenantModal();
        },
        error: (error) => {
          this.tenantError = error?.error?.message || 'Unable to delete tenant.';
          this.closeDeleteTenantModal();
        },
      });
    }
  }

  protected addVehicle(): void {
    // Validate current vehicle
    if (!this.currentVehicle.make || !this.currentVehicle.model || !this.currentVehicle.reg) {
      this.tenantError = 'Please fill in vehicle make, model, and registration number.';
      return;
    }

    // Check for duplicate registration
    if (this.tenantForm.vehicles.some((v: any) => v.reg === this.currentVehicle.reg)) {
      this.tenantError = 'A vehicle with this registration number is already added.';
      return;
    }

    // Add vehicle to the list
    this.tenantForm.vehicles.push({
      make: this.currentVehicle.make.trim(),
      model: this.currentVehicle.model.trim(),
      reg: this.currentVehicle.reg.trim(),
      color: this.currentVehicle.color.trim(),
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
    const availableTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!availableTypes.includes(this.tenantForm.residenceType)) {
      this.tenantForm.residenceType = availableTypes[0] as 'complex' | 'community';
    }

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
    const availableTypes = this.availableCommunityResidenceTypes;
    this.tenantForm.communityResidenceType =
      availableTypes.includes('house')
        ? 'house'
        : (availableTypes[0] ?? 'house');
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
    const defaultResidenceType: 'complex' | 'community' =
      this.assignedComplexes.length > 0
        ? 'complex'
        : (this.gatedCommunities.length > 0 ? 'community' : 'complex');

    this.tenantForm = {
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      idNumber: '',
      residenceType: defaultResidenceType,
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

  protected get availableTenantResidenceTypes(): Array<{ value: 'complex' | 'community'; label: string }> {
    const key = `${this.assignedComplexes.length}|${this.gatedCommunities.length}`;
    if (this.availableTenantResidenceTypesKey === key) {
      return this.availableTenantResidenceTypesCache;
    }

    const types: Array<{ value: 'complex' | 'community'; label: string }> = [];

    if (this.assignedComplexes.length > 0) {
      types.push({ value: 'complex', label: 'Complex/Apartment' });
    }

    if (this.gatedCommunities.length > 0) {
      types.push({ value: 'community', label: 'Gated Community' });
    }

    this.availableTenantResidenceTypesCache = types;
    this.availableTenantResidenceTypesKey = key;
    return this.availableTenantResidenceTypesCache;
  }

  protected get availableCommunityResidenceTypes(): Array<'house' | 'complex'> {
    const key = `${this.tenantForm.communityId}|${this.gatedCommunities.length}`;
    if (this.availableCommunityResidenceTypesKey === key) {
      return this.availableCommunityResidenceTypesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    const community = this.gatedCommunities.find((gc: any) => gc.id === this.tenantForm.communityId);
    if (!community) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    const types: Array<'house' | 'complex'> = [];
    if ((community.houses?.length ?? 0) > 0) {
      types.push('house');
    }
    if ((community.complexesInCommunity?.length ?? 0) > 0) {
      types.push('complex');
    }

    this.availableCommunityResidenceTypesCache = types.length > 0 ? types : ['house'];
    this.availableCommunityResidenceTypesKey = key;
    return this.availableCommunityResidenceTypesCache;
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
    const key = `${this.tenantForm.complexId}|${this.assignedComplexes.length}`;
    if (this.availableUnitsKey === key) {
      return this.availableUnitsCache;
    }

    if (!this.tenantForm.complexId) {
      this.availableUnitsCache = [];
      this.availableUnitsKey = key;
      return this.availableUnitsCache;
    }
    const complex = this.assignedComplexes.find((c: any) => c.id === this.tenantForm.complexId);
    this.availableUnitsCache = complex?.units || [];
    this.availableUnitsKey = key;
    return this.availableUnitsCache;
  }

  protected get availableHouses(): string[] {
    const key = `${this.tenantForm.communityId}|${this.gatedCommunities.length}`;
    if (this.availableHousesKey === key) {
      return this.availableHousesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableHousesCache = [];
      this.availableHousesKey = key;
      return this.availableHousesCache;
    }
    const community = this.gatedCommunities.find((gc: any) => gc.id === this.tenantForm.communityId);
    this.availableHousesCache = community?.houses || [];
    this.availableHousesKey = key;
    return this.availableHousesCache;
  }

  protected get availableCommunityComplexes(): Array<{ id: string; name: string; units: string[] }> {
    const key = `${this.tenantForm.communityId}|${this.gatedCommunities.length}`;
    if (this.availableCommunityComplexesKey === key) {
      return this.availableCommunityComplexesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityComplexesCache = [];
      this.availableCommunityComplexesKey = key;
      return this.availableCommunityComplexesCache;
    }
    const community = this.gatedCommunities.find((gc: any) => gc.id === this.tenantForm.communityId);
    this.availableCommunityComplexesCache = community?.complexesInCommunity || [];
    this.availableCommunityComplexesKey = key;
    return this.availableCommunityComplexesCache;
  }

  protected get availableCommunityUnits(): string[] {
    const key = `${this.tenantForm.communityId}|${this.tenantForm.communityComplexId}|${this.gatedCommunities.length}`;
    if (this.availableCommunityUnitsKey === key) {
      return this.availableCommunityUnitsCache;
    }

    if (!this.tenantForm.communityComplexId) {
      this.availableCommunityUnitsCache = [];
      this.availableCommunityUnitsKey = key;
      return this.availableCommunityUnitsCache;
    }
    const community = this.gatedCommunities.find((gc: any) => gc.id === this.tenantForm.communityId);
    const complex = community?.complexesInCommunity?.find((c: any) => c.id === this.tenantForm.communityComplexId);
    this.availableCommunityUnitsCache = complex?.units || [];
    this.availableCommunityUnitsKey = key;
    return this.availableCommunityUnitsCache;
  }

  protected get filteredTenants(): any[] {
    const key = `${this.tenantSearchTerm}|${this.tenantFilterResidenceType}|${this.tenantFilterComplexId}|${this.tenantFilterCommunityId}|${this.tenantFilterCommunityResidenceType}|${this.tenantFilterCommunityComplexId}|${this.tenants.length}`;
    if (this.filteredTenantsKey === key) {
      return this.filteredTenantsCache;
    }

    this.filteredTenantsCache = this.tenants.filter((tenant: any) => {
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

    this.filteredTenantsKey = key;
    return this.filteredTenantsCache;
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
    const key = `${this.tenantFilterCommunityId}|${this.gatedCommunities.length}`;
    if (this.tenantCommunityComplexesFilterKey === key) {
      return this.tenantCommunityComplexesFilterCache;
    }

    if (!this.tenantFilterCommunityId) {
      this.tenantCommunityComplexesFilterCache = [];
      this.tenantCommunityComplexesFilterKey = key;
      return this.tenantCommunityComplexesFilterCache;
    }
    const community = this.gatedCommunities.find(gc => gc.id === this.tenantFilterCommunityId);
    this.tenantCommunityComplexesFilterCache = community?.complexesInCommunity || [];
    this.tenantCommunityComplexesFilterKey = key;
    return this.tenantCommunityComplexesFilterCache;
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
