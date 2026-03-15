import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
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
import { Loader } from '../components/loader/loader';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { logDTO } from '../interfaces/logDTO';
import { complexDTO } from '../interfaces/complexDTO';

@Component({
  selector: 'app-security-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader],
  templateUrl: './security-manager.html',
  styleUrl: './security-manager.css',
})
export class SecurityManager implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  protected securityManagerName = 'Security Manager';
  protected securityManagerEmail = 'security@equasec.com';
  private currentManagerEmail = '';
  private managerSecurityCompanyId = '';
  private managerSecurityCompanyName = '';
  protected companySosOptedIn = false;
  protected companySosOptinUpdating = false;
  private contractedComplexNames = new Set<string>();
  private contractedCommunityNames = new Set<string>();
  private complexContractDates = new Map<string, { startDate: string; endDate: string }>();
  private communityContractDates = new Map<string, { startDate: string; endDate: string }>();
  private complexContractDisplayNames = new Map<string, string>();
  private companyEmployeeAssignmentUserIds = new Set<string>();
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
  protected employeeSubmitting = false;

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
  protected tenantSubmitting = false;
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
  private availableTenantResidenceTypesCache: Array<{
    value: 'complex' | 'community';
    label: string;
  }> = [];
  private availableTenantResidenceTypesKey = '';
  private availableCommunityResidenceTypesCache: Array<'house' | 'complex'> = [];
  private availableCommunityResidenceTypesKey = '';
  private availableUnitsCache: string[] = [];
  private availableUnitsKey = '';
  private availableHousesCache: string[] = [];
  private availableHousesKey = '';
  private availableCommunityComplexesCache: Array<{ id: string; name: string; units: string[] }> =
    [];
  private availableCommunityComplexesKey = '';
  private availableCommunityUnitsCache: string[] = [];
  private availableCommunityUnitsKey = '';
  private usersLoadPending: any[] | null = null;
  private assignedComplexesLoaded = false;
  private gatedCommunitiesLoaded = false;

  constructor(
    private readonly router: Router,
    private readonly dataService: DataService,
    private readonly storage: StorageService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  private refreshView(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

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
      this.securityManagerName =
        `${user?.name} ${user?.surname}`.trim() || this.securityManagerName;
      this.securityManagerEmail = user?.emailAddress ?? this.securityManagerEmail;
      this.currentManagerEmail = user?.emailAddress ?? this.currentManagerEmail;
      this.managerSecurityCompanyId = user?.securityCompany?._id;
      this.managerSecurityCompanyName = user?.securityCompany?.name;
      if (typeof user?.securityCompany?.sosOptin === 'boolean') {
        this.companySosOptedIn = Boolean(user.securityCompany.sosOptin);
      }
      this.loadCompanyContracts();
    } catch {
      return;
    }
  }

  private normalizeName(value: string): string {
    return value;
  }

  private applyCompanyContracts(company: any): void {
    this.contractedComplexNames.clear();
    this.contractedCommunityNames.clear();
    this.complexContractDates.clear();
    this.communityContractDates.clear();
    this.complexContractDisplayNames.clear();
    this.companyEmployeeAssignmentUserIds.clear();

    if (company?._id || company?.id) {
      this.managerSecurityCompanyId = String(company._id ?? company.id);
    }
    if (company?.name) {
      this.managerSecurityCompanyName = String(company.name);
    }
    this.companySosOptedIn = Boolean(company?.sosOptin);

    const employeeAssignments = Array.isArray(company?.employeeAssignments)
      ? company.employeeAssignments
      : [];
    for (const assignment of employeeAssignments) {
      const userId = String(assignment?.userId).trim();
      if (userId) {
        this.companyEmployeeAssignmentUserIds.add(userId);
      }
    }

    const contracts = company?.contract ?? [];
    for (const contract of contracts) {
      const complexName = this.normalizeName(contract?.complex?.name ?? contract?.complexName);
      const communityName = this.normalizeName(contract?.gatedCommunityName);
      const startDate = this.formatDateValue(
        contract?.contractStartDate ?? contract?.contractStart,
      );
      const endDate = this.formatDateValue(contract?.contractEndDate ?? contract?.contractEnd);

      if (complexName) {
        this.contractedComplexNames.add(complexName);
        this.complexContractDates.set(complexName, { startDate, endDate });
        this.complexContractDisplayNames.set(
          complexName,
          (contract?.complex?.name ?? contract?.complexName).trim(),
        );
      }

      if (communityName) {
        this.contractedCommunityNames.add(communityName);
        this.communityContractDates.set(communityName, { startDate, endDate });
      }
    }
  }

  protected toggleCompanySosOptin(): void {
    if (this.companySosOptinUpdating) {
      return;
    }

    const companyId = String(this.managerSecurityCompanyId).trim();
    if (!companyId) {
      this._snackBar.open('No linked security company found.', 'close', {
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      return;
    }

    const nextSosOptin = !this.companySosOptedIn;
    this.companySosOptinUpdating = true;

    this.dataService
      .put<any>(`securityCompany/${companyId}`, { sosOptin: nextSosOptin })
      .subscribe({
        next: (response) => {
          const persistedOptin = response?.payload?.sosOptin;
          this.companySosOptedIn =
            typeof persistedOptin === 'boolean' ? Boolean(persistedOptin) : nextSosOptin;
          this.companySosOptinUpdating = false;

          this._snackBar.open(
            this.companySosOptedIn ? 'SOS opt-in enabled.' : 'SOS opt-in disabled.',
            'close',
            {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            },
          );
        },
        error: (error) => {
          this.companySosOptinUpdating = false;
          this._snackBar.open(error?.error?.message ?? 'Unable to update SOS opt-in.', 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
        },
      });
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
    this.submitting.update(() => true);
    const initializeDashboardLoads = (): void => {
      this.usersLoadPending = null;
      this.assignedComplexesLoaded = false;
      this.gatedCommunitiesLoaded = false;
      this.loadAssignedComplexes();
      this.loadGatedCommunities();
      this.loadUsers();
    };

    const loadFromCompanyList = (): void => {
      this.dataService.get<any[]>('securityCompany').subscribe({
        next: (companies) => {
          const company = (companies ?? []).find((item) => {
            const managerEmailMatch =
              this.currentManagerEmail &&
              this.normalizeName(item?.managerEmail) ===
                this.normalizeName(this.currentManagerEmail);
            const companyNameMatch =
              this.managerSecurityCompanyName &&
              this.normalizeName(item?.name) ===
                this.normalizeName(this.managerSecurityCompanyName);
            return Boolean(managerEmailMatch || companyNameMatch);
          });

          this.applyCompanyContracts(company);
          initializeDashboardLoads();
        },
        error: (error) => {
          this.assignedComplexes = [];
          this.gatedCommunities = [];
          this.employees = [];
          this.securityManagers = [];
          this.tenants = [];
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
        },
      });
    };

    if (this.managerSecurityCompanyId) {
      this.dataService.get<any>(`securityCompany/${this.managerSecurityCompanyId}`).subscribe({
        next: (company) => {
          this.applyCompanyContracts(company);
          initializeDashboardLoads();
        },
        error: () => {
          loadFromCompanyList();
        },
      });
      this.submitting.update(() => false);
      return;
    }

    if (!this.managerSecurityCompanyName && !this.currentManagerEmail) {
      this.assignedComplexes = [];
      this.gatedCommunities = [];
      this.submitting.update(() => false);
      return;
    }

    loadFromCompanyList();
    this.submitting.update(() => false);
  }

  private loadCurrentUser(): void {
    this.submitting.update(() => true);
    this.dataService.get<any>('user/current').subscribe({
      next: (user) => {
        const resolvedUser = user?.payload?.user ?? user?.payload ?? user;
        if (!resolvedUser) {
          this.assignedComplexes = [];
          this.gatedCommunities = [];
          this.submitting.update(() => false);
          return;
        }

        const resolvedName = `${resolvedUser.name} ${resolvedUser.surname}`.trim();
        const resolvedEmail = resolvedUser.emailAddress;
        const resolvedCompanyId = resolvedUser.securityCompany?._id;
        const resolvedCompanyName = resolvedUser.securityCompany?.name;
        const resolvedCompanySosOptin = resolvedUser.securityCompany?.sosOptin;

        this.securityManagerName = resolvedName || this.securityManagerName;
        this.securityManagerEmail = resolvedEmail || this.securityManagerEmail;
        this.currentManagerEmail = resolvedEmail || this.currentManagerEmail;
        this.managerSecurityCompanyId = resolvedCompanyId || this.managerSecurityCompanyId;
        this.managerSecurityCompanyName = resolvedCompanyName || this.managerSecurityCompanyName;
        if (typeof resolvedCompanySosOptin === 'boolean') {
          this.companySosOptedIn = Boolean(resolvedCompanySosOptin);
        }

        this.loadCompanyContracts();
      },
      error: (error) => {
        this.assignedComplexes = [];
        this.gatedCommunities = [];
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
    this.submitting.update(() => false);
  }

  private loadAssignedComplexes(): void {
    this.submitting.update(() => true);
    this.dataService.get<ResponseBody>('complex').subscribe({
      next: (res) => {
        const complexes = res.payload as complexDTO[]
        const mappedComplexes = (complexes || [])
          .filter((complex) => {
            const complexName = this.normalizeName(complex?.name);
            const communityName = this.normalizeName(complex?.gatedCommunityName as string);
            return (
              this.contractedComplexNames.has(complexName) ||
              this.contractedCommunityNames.has(communityName)
            );
          })
          .map((complex) => {
            const contractDates =
              this.complexContractDates.get(this.normalizeName(complex?.name)) ??
              this.communityContractDates.get(this.normalizeName(complex?.gatedCommunityName as string));
            return {
              id: complex._id as string,
              name: complex.name,
              location: complex.address,
              status: 'active' as 'active' | 'inactive',
              totalUnits: complex.numberOfUnits ?? 0,
              employees: 0,
              contractStartDate: contractDates?.startDate as string,
              contractEndDate: contractDates?.endDate as string,
              units: this.generateUnits(complex.numberOfUnits ?? 0),
            };
          });

        const existingKeys = new Set(
          mappedComplexes.map((complex) => this.normalizeName(complex.name)),
        );
        const missingFromContracts = Array.from(this.contractedComplexNames)
          .filter((contractedName) => !existingKeys.has(contractedName))
          .map((contractedName) => {
            const contractDates = this.complexContractDates.get(contractedName);
            const displayName =
              this.complexContractDisplayNames.get(contractedName) || contractedName;
            return {
              id: `contract-${contractedName}`,
              name: displayName,
              location: 'Assigned by contract',
              status: 'active' as 'active' | 'inactive',
              totalUnits: 0,
              employees: 0,
              contractStartDate: contractDates?.startDate as string,
              contractEndDate: contractDates?.endDate as string,
              units: [],
            };
          });

        this.assignedComplexes = [...mappedComplexes, ...missingFromContracts];
        this.assignedComplexesLoaded = true;
        this.refreshTenantLocationPaths();
        this.tryBuildDashboardUsers();
        this.submitting.update(() => false);
        this.refreshView();
      },
      error: (error) => {
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.assignedComplexes = [];
        this.assignedComplexesLoaded = true;
        this.refreshTenantLocationPaths();
        this.tryBuildDashboardUsers();
        this.refreshView();
      },
    });
  }

  private loadGatedCommunities(): void {
    this.submitting.update(() => true);
    this.dataService.get<any[]>('gatedCommunity').subscribe({
      next: (communities) => {
        this.gatedCommunities = (communities || [])
          .filter((community) => {
            const communityName = community?.name as string;
            const communityComplexes = Array.isArray(community?.complexes)
              ? community.complexes.map((name: string) => name)
              : [];

            const linkedByComplex = communityComplexes.some((name: string) =>
              this.contractedComplexNames.has(name),
            );
            return this.contractedCommunityNames.has(communityName) || linkedByComplex;
          })
          .map((community) => {
            const contractDates = this.communityContractDates.get(
              community?.name as string,
            );
            return {
              id: community._id ?? community.id,
              name: community.name,
              complexId: community.complexId,
              status: 'active' as 'active' | 'inactive',
              totalResidents: community.numberOfHouses ?? 0,
              contractStartDate: contractDates?.startDate as string,
              contractEndDate: contractDates?.endDate as string,
              houses: this.generateHouses(community.numberOfHouses ?? 0),
              complexesInCommunity: [],
            };
          });
        this.gatedCommunitiesLoaded = true;
        this.refreshTenantLocationPaths();
        this.tryBuildDashboardUsers();
        this.submitting.update(() => false);
        this.refreshView();
      },
      error: (error) => {
        this.gatedCommunities = [];
        this.gatedCommunitiesLoaded = true;
        this.refreshTenantLocationPaths();
        this.tryBuildDashboardUsers();
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.refreshView();
      },
    });
  }
  private loadUsers(): void {
    this.submitting.update(() => true);
    this.dataService.get<any>('user').subscribe({
      next: (response) => {
        const users = Array.isArray(response) ? response : (response?.payload ?? []);

        const applyUsersWithUnitLocations = (baseUsers: any[]): void => {
          this.dataService.get<any[]>('unit').subscribe({
            next: (unitsResponse) => {
              const units = Array.isArray(unitsResponse)
                ? unitsResponse
                : Array.isArray((unitsResponse as { payload?: unknown })?.payload)
                  ? ((unitsResponse as { payload?: any[] }).payload ?? [])
                  : [];

              const tenantLocationByUserId = new Map<
                string,
                {
                  complexId: string;
                  gatedCommunityId: string;
                  houseNumber: string;
                  unit: string;
                }
              >();

              for (const unit of units) {
                const complexId = String(unit?.complex?._id ?? unit?.complex?.id).trim();
                const gatedCommunityId = String(
                  unit?.gatedCommunity?._id ?? unit?.gatedCommunity?.id,
                ).trim();
                const unitNumber = String(unit?.number).trim();

                const linkedUsers = Array.isArray(unit?.users) ? unit.users : [];
                for (const linkedUser of linkedUsers) {
                  const linkedUserId = String(
                    linkedUser && typeof linkedUser === 'object'
                      ? ((linkedUser as any)?._id ?? (linkedUser as any)?.id)
                      : (linkedUser),
                  ).trim();

                  if (!linkedUserId) {
                    continue;
                  }

                  const previous = tenantLocationByUserId.get(linkedUserId);
                  const unitValue = unitNumber || previous?.unit || '';
                  const houseNumberValue = (!complexId && unitNumber) || previous?.houseNumber || '';

                  tenantLocationByUserId.set(linkedUserId, {
                    complexId: complexId || previous?.complexId || '',
                    gatedCommunityId: gatedCommunityId || previous?.gatedCommunityId || '',
                    houseNumber: houseNumberValue,
                    unit: unitValue,
                  });
                }
              }

              const usersWithUnitLocations = baseUsers.map((user: any) => {
                const userId = String(user?._id ?? user?.id).trim();
                const linkedTenantLocation = userId ? tenantLocationByUserId.get(userId) : null;

                if (!linkedTenantLocation) {
                  return user;
                }

                const isCommunityLinked = Boolean(linkedTenantLocation.gatedCommunityId);
                const isCommunityComplex =
                  isCommunityLinked && Boolean(linkedTenantLocation.complexId);

                return {
                  ...user,
                  residenceType: isCommunityLinked ? 'community' : 'complex',
                  complex: linkedTenantLocation.complexId
                    ? {
                        ...(user?.complex ?? {}),
                        _id: linkedTenantLocation.complexId,
                        id: linkedTenantLocation.complexId,
                      }
                    : user?.complex,
                  communityId: isCommunityLinked
                    ? linkedTenantLocation.gatedCommunityId
                    : (user?.communityId),
                  gatedCommunity: isCommunityLinked
                    ? {
                        ...(user?.gatedCommunity ?? {}),
                        _id: linkedTenantLocation.gatedCommunityId,
                        id: linkedTenantLocation.gatedCommunityId,
                      }
                    : user?.gatedCommunity,
                  communityResidenceType: isCommunityLinked
                    ? (isCommunityComplex ? 'complex' : 'house')
                    : user?.communityResidenceType,
                  communityComplexId: isCommunityComplex
                    ? linkedTenantLocation.complexId
                    : (user?.communityComplexId),
                  address:
                    linkedTenantLocation.unit ||
                    linkedTenantLocation.houseNumber ||
                    String(user?.address),
                  unit: linkedTenantLocation.unit || String(user?.unit),
                  houseNumber:
                    linkedTenantLocation.houseNumber || String(user?.houseNumber),
                };
              });

              this.usersLoadPending = usersWithUnitLocations;
              this.tryBuildDashboardUsers();
            },
            error: (error) => {
              this.usersLoadPending = baseUsers;
              this.tryBuildDashboardUsers();
              this._snackBar.open(error.error.message, 'close', {
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
              });
            },
          });
        };

        this.dataService.get<any[]>('vehicle').subscribe({
          next: (vehiclesResponse) => {
            const vehicles = Array.isArray(vehiclesResponse)
              ? vehiclesResponse
              : Array.isArray((vehiclesResponse as { payload?: unknown })?.payload)
                ? ((vehiclesResponse as { payload?: any[] }).payload ?? [])
                : [];
            const vehiclesByUserId = new Map<string, any[]>();

            for (const vehicle of vehicles) {
              const linkedUserId = String(vehicle?.user?._id).trim();
              if (!linkedUserId) {
                continue;
              }

              const mappedVehicle = {
                color: String(vehicle?.color),
                make: String(vehicle?.make),
                model: String(vehicle?.model),
                reg: String(
                  vehicle?.reg ?? vehicle?.registerationNumber ?? vehicle?.registrationNumber,
                ),
              };

              const existing = vehiclesByUserId.get(linkedUserId) ?? [];
              existing.push(mappedVehicle);
              vehiclesByUserId.set(linkedUserId, existing);
            }

            const mergedUsers = users.map((user: any) => {
              const userId = String(user?._id).trim();
              const linkedVehicles = userId ? (vehiclesByUserId.get(userId) ?? []) : [];

              return {
                ...user,
                vehicles:
                  linkedVehicles.length > 0
                    ? linkedVehicles
                    : Array.isArray(user?.vehicles)
                      ? user.vehicles
                      : [],
              };
            });

            applyUsersWithUnitLocations(mergedUsers);
          },
          error: (error) => {
            applyUsersWithUnitLocations(users);
            this._snackBar.open(error.error.message, 'close', {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            });
          },
        });
        this.submitting.update(() => false);
      },
      error: (error) => {
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.usersLoadPending = [];
        this.tryBuildDashboardUsers();
      },
    });
  }

  private tryBuildDashboardUsers(): void {
    if (
      !this.assignedComplexesLoaded ||
      !this.gatedCommunitiesLoaded ||
      this.usersLoadPending === null
    ) {
      return;
    }

    const users = this.usersLoadPending;
    this.usersLoadPending = null;

    const belongsToCurrentSecurityCompany = (user: any): boolean => {
      const userCompanyId = user?.securityCompany?._id ? String(user.securityCompany._id) : '';
      const userCompanyName = this.normalizeName(user?.securityCompany?.name);

      const byId = this.managerSecurityCompanyId && userCompanyId === this.managerSecurityCompanyId;
      const byName =
        this.managerSecurityCompanyName &&
        userCompanyName === this.normalizeName(this.managerSecurityCompanyName);

      return Boolean(byId || byName);
    };

    const hasContractAccessForCompany = (user: any): boolean => {
      if (this.contractedComplexNames.size === 0 && this.contractedCommunityNames.size === 0) {
        return true;
      }

      const isSecurityUser = this.hasRole(user, 'security');
      const inCurrentCompany = belongsToCurrentSecurityCompany(user);

      const employeeContracts = Array.isArray(user?.employeeContracts)
        ? user.employeeContracts
        : [];
      const assignedComplexIdsInScope = new Set(
        this.assignedComplexes.map((complex) => String(complex.id)),
      );
      const assignedCommunityIdsInScope = new Set(
        this.gatedCommunities.map((community) => String(community.id)),
      );
      const assignedCommunityNamesInScope = new Set(
        this.gatedCommunities.map((community) => this.normalizeName(community.name)),
      );

      if (employeeContracts.length > 0) {
        return employeeContracts.some((contract: any) => {
          const contractCompanyId = contract?.securityCompany?._id
            ? String(contract.securityCompany._id)
            : '';
          const contractCompanyName = this.normalizeName(contract?.securityCompany?.name);
          const contractAssignedComplexes = Array.isArray(contract?.assignedComplexes)
            ? contract.assignedComplexes
                .map((value: unknown) => String(value).trim())
                .filter((value: string) => value.length > 0)
            : [];
          const contractAssignedCommunities = Array.isArray(contract?.assignedCommunities)
            ? contract.assignedCommunities
                .map((value: unknown) => String(value).trim())
                .filter((value: string) => value.length > 0)
            : [];

          const contractMatchesCompany =
            (this.managerSecurityCompanyId &&
              contractCompanyId === this.managerSecurityCompanyId) ||
            (this.managerSecurityCompanyName &&
              contractCompanyName === this.normalizeName(this.managerSecurityCompanyName));

          if (!contractMatchesCompany) {
            return false;
          }

          if (contractAssignedComplexes.length === 0 && contractAssignedCommunities.length === 0) {
            return true;
          }

          const hasComplexInScope = contractAssignedComplexes.some((complexId: string) =>
            assignedComplexIdsInScope.has(complexId),
          );
          const hasCommunityInScope = contractAssignedCommunities.some((community: string) => {
            const normalized = this.normalizeName(community);
            return (
              assignedCommunityIdsInScope.has(community) ||
              assignedCommunityNamesInScope.has(normalized)
            );
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

      if (isSecurityUser && inCurrentCompany) {
        return true;
      }

      return false;
    };

    const resolveEmployeeStatusForCompany = (user: any): 'active' | 'inactive' => {
      const employeeContracts = Array.isArray(user?.employeeContracts)
        ? user.employeeContracts
        : [];
      const currentContract = employeeContracts.find((contract: any) => {
        const contractCompanyId = contract?.securityCompany?._id
          ? String(contract.securityCompany._id)
          : '';
        const contractCompanyName = this.normalizeName(contract?.securityCompany?.name);
        return (
          (this.managerSecurityCompanyId && contractCompanyId === this.managerSecurityCompanyId) ||
          (this.managerSecurityCompanyName &&
            contractCompanyName === this.normalizeName(this.managerSecurityCompanyName))
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

    const isVisibleSecurityUser = (user: any): boolean => {
      const userId = String(user?._id).trim();
      const linkedByAssignment =
        userId.length > 0 && this.companyEmployeeAssignmentUserIds.has(userId);
      return (
        linkedByAssignment ||
        belongsToCurrentSecurityCompany(user) ||
        hasContractAccessForCompany(user)
      );
    };

    this.employees = users
      .filter((user: any) => this.hasRole(user, 'security'))
      .filter((user: any) => isVisibleSecurityUser(user))
      .map((user: any) => {
        const assignedComplexes = Array.isArray(user?.assignedComplexes)
          ? user.assignedComplexes.filter(
              (value: unknown) => typeof value === 'string' && value.length > 0,
            )
          : user?.complex?._id
            ? [String(user.complex._id)]
            : [];

        const assignedCommunities = Array.isArray(user?.assignedCommunities)
          ? user.assignedCommunities.filter(
              (value: unknown) => typeof value === 'string' && value.length > 0,
            )
          : [];

        return {
          id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.emailAddress,
          phone: user.cellNumber,
          position: this.hasRole(user, 'admin') ? 'admin-Guard' : 'Guard',
          assignedComplex: assignedComplexes[0],
          assignedComplexes,
          assignedCommunities,
          status: resolveEmployeeStatusForCompany(user),
        };
      });

    this.securityManagers = users
      .filter((user: any) => this.hasRole(user, 'security'))
      .filter((user: any) => isVisibleSecurityUser(user))
      .map((user: any) => {
        const assignedComplexes = Array.isArray(user?.assignedComplexes)
          ? user.assignedComplexes.filter(
              (value: unknown) => typeof value === 'string' && value.length > 0,
            )
          : user?.complex?._id
            ? [String(user.complex._id)]
            : [];

        const assignedCommunities = Array.isArray(user?.assignedCommunities)
          ? user.assignedCommunities.filter(
              (value: unknown) => typeof value === 'string' && value.length > 0,
            )
          : [];

        return {
          id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.emailAddress,
          phone: user.cellNumber,
          position: this.hasRole(user, 'admin') ? 'admin-Guard' : 'Guard',
          profilePicture: user.profilePhoto,
          assignedComplexes,
          assignedCommunities,
          status: resolveEmployeeStatusForCompany(user),
        };
      });

    const isTenantLikeUser = (user: any): boolean => {
      if (this.hasRole(user, 'tenant') || this.hasRole(user, 'user')) {
        return true;
      }

      if (
        this.hasRole(user, 'security') ||
        this.hasRole(user, 'manager') ||
        this.hasRole(user, 'admin')
      ) {
        return false;
      }

      const hasResidenceMarker =
        String(user?.residenceType).trim().length > 0 ||
        String(user?.communityId).trim().length > 0 ||
        String(user?.communityComplexId).trim().length > 0 ||
        String(user?.address).trim().length > 0 ||
        Boolean(user?.complex?._id);

      return hasResidenceMarker;
    };

    this.tenants = users
      .filter((user: any) => isTenantLikeUser(user))
      .filter((user: any) => {
        const explicitTenantRole = this.hasRole(user, 'tenant') || this.hasRole(user, 'user');
        const hasEmbeddedLocation =
          Boolean(user?.complex?._id) ||
          String(user?.communityId).trim().length > 0 ||
          String(user?.communityComplexId).trim().length > 0 ||
          String(user?.address).trim().length > 0;

        if (belongsToCurrentSecurityCompany(user)) {
          return true;
        }

        if (explicitTenantRole && !hasEmbeddedLocation) {
          return true;
        }

        const userResidenceType: 'complex' | 'community' =
          user?.residenceType === 'community' || user?.residenceType === 'complex'
            ? user.residenceType
            : user?.communityId
              ? 'community'
              : 'complex';

        const assignedComplexIds = new Set(
          this.assignedComplexes.map((complex) => String(complex.id)),
        );
        const assignedCommunityIds = new Set(
          this.gatedCommunities.map((community) => String(community.id)),
        );

        const userComplexId = String(user?.complex?._id);
        const userCommunityId = String(user?.communityId);
        const userCommunityComplexId = String(user?.communityComplexId);

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
            : user?.communityId
              ? 'community'
              : 'complex';

        const mappedCommunityResidenceType: 'house' | 'complex' =
          user?.communityResidenceType === 'complex' ? 'complex' : 'house';

        return {
          id: user._id,
          name: user.name,
          surname: user.surname,
          email: user.emailAddress,
          phone: user.cellNumber,
          idNumber: user.idNumber,
          residenceType: mappedResidenceType,
          complexId:
            mappedResidenceType === 'complex'
              ? String(user.complex?._id ?? user.complex?.id)
              : '',
          communityId:
            mappedResidenceType === 'community'
              ? String(user.communityId ?? user.gatedCommunity?._id ?? user.gatedCommunity?.id)
              : '',
          communityResidenceType:
            mappedResidenceType === 'community' ? mappedCommunityResidenceType : undefined,
          communityComplexId:
            mappedResidenceType === 'community' && mappedCommunityResidenceType === 'complex'
              ? String(user.communityComplexId ?? user.complex?._id ?? user.complex?.id)
              : '',
          address: user.address,
          vehicles: Array.isArray(user.vehicles)
            ? user.vehicles.map((vehicle: any) => ({
                make: vehicle?.make,
                model: vehicle?.model,
                reg: vehicle?.reg,
                color: vehicle?.color,
              }))
            : [],
          registeredDate: new Date().toISOString().split('T')[0],
          locationPath: [],
        };
      });

    this.refreshTenantLocationPaths();
    this.refreshView();
  }

  private hasRole(user: any, role: string): boolean {
    const normalizedRole = this.normalizeName(role);

    const type = user?.type;
    if (Array.isArray(type)) {
      return type
        .map((entry: unknown) => this.normalizeName(String(entry)))
        .some((entry: string) => entry === normalizedRole || entry.includes(normalizedRole));
    }
    if (typeof type === 'string') {
      const normalizedType = this.normalizeName(type);
      return normalizedType === normalizedRole || normalizedType.includes(normalizedRole);
    }
    return false;
  }

  protected getPersonInitials(name: string, surname?: string): string {
    const first = String(name).trim().charAt(0);
    const second = String(surname).trim().charAt(0);
    const initials = `${first}${second}`.trim().toUpperCase();
    return initials || 'NA';
  }

  protected onManagerImageError(manager: any): void {
    if (manager) {
      manager.profilePicture = '';
    }
  }

  private loadVisitors(): void {
    this.submitting.update(() => true);
    this.dataService.get<ResponseBody>('logs').subscribe({
      next: (res) => {
        const logs = res.payload as logDTO[];
        this.visitors = (logs || []).map((log) => {
          const visitor = log.visitor;
          return {
            id: visitor._id as string,
            name: visitor.name,
            surname: visitor.surname,
            phone: visitor.contact,
            tenantName: `${visitor.destination?.users[0]?.name} ${visitor.destination?.users[0]?.surname}`.trim(),
            tenantUnit: `unit ${visitor.destination?.number}`,
            tenantPhone: visitor.destination?.users[0]?.cellNumber as string,
            visitDate: log.date.toLocaleString(),
            complexId: log.guard.complex?._id as string,
            vehicle: visitor.vehicle
              ? {
                  make: visitor.vehicle.make,
                  model: visitor.vehicle.model,
                  reg: visitor.vehicle?.registrationNumber,
                  color: visitor.vehicle.color,
                }
              : undefined,
          };
        });
        this.submitting.update(() => false);
      },
      error: (error) => {
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.visitors = [];
      },
    });
  }

  private loadSosAlerts(): void {
    this.submitting.update(() => true);
    this.dataService.get<any>('sos').subscribe({
      next: (response) => {
        const items = Array.isArray(response) ? response : (response?.payload ?? []);

        this.sosAlerts = (items || [])
          .map((item: any) => {
            const guard = item?.guard ?? {};
            const station = item?.station ?? {};
            const rawType = String(station?.type).toLowerCase();
            const stationType: 'complex' | 'gated' | 'unknown' =
              rawType === 'complex' || rawType === 'gated' ? rawType : 'unknown';

            return {
              id: String(item?._id),
              date: String(item?.date),
              guardName: `${guard?.name} ${guard?.surname}`.trim() || 'Unknown Guard',
              guardPhone: String(guard?.cellNumber),
              stationType,
              stationName: String(station?.name),
              complexName: String(station?.complexName),
              gatedCommunityName: String(station?.gatedCommunityName),
              address: String(station?.complexAddress),
            };
          })
          .sort(
            (a: { date: string }, b: { date: string }) =>
              new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        this.submitting.update(() => false);
      },
      error: (error) => {
        this._snackBar.open(error.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.sosAlerts = [];
      },
    });
  }

  protected get filteredSosAlerts(): any[] {
    const query = this.sosSearchTerm.trim().toLowerCase();

    return this.sosAlerts.filter((alert) => {
      const matchesType =
        this.sosFilterSourceType === 'all' || alert.stationType === this.sosFilterSourceType;
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
    const complexName = String(alert?.complexName).trim();
    const gatedCommunityName = String(alert?.gatedCommunityName).trim();

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
    this.employeeSubmitting = false;
  }

  protected closeEmployeeModal(): void {
    this.isEmployeeModalOpen = false;
    this.resetEmployeeForm();
    this.employeeSubmitting = false;
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
    this.submitting.update(() => true);
    if (!this.selectedEmployeeToDelete) {
      this.submitting.update(() => false);
      return;
    }

    this.dataService
      .delete<ResponseBody>(`user/security-employee/${this.selectedEmployeeToDelete.id}`)
      .subscribe({
        next: (res) => {
          this.employees = this.employees.filter((e) => e.id !== this.selectedEmployeeToDelete.id);
          this._snackBar.open(res.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          setTimeout(() => {
            this.submitting.update(() => false);
          }, 3000);
          this.closeDeleteEmployeeModal();
        },
        error: (error) => {
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
        },
      });
  }

  protected submitEmployeeForm(): void {
    if (this.employeeSubmitting) {
      return;
    }

    this.employeeSubmitting = true;
    this.employeeError = '';
    this.employeeSuccess = this.editingEmployeeId ? 'Updating employee...' : 'Adding employee...';
    this.submitting.update(() => true);
    if (
      !this.employeeForm.name ||
      !this.employeeForm.surname ||
      !this.employeeForm.email ||
      !this.employeeForm.phone ||
      !this.employeeForm.position
    ) {
      this.employeeError = 'Please fill in all required fields.';
      this.employeeSuccess = '';
      this.employeeSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    this.employeeForm.phone = this.employeeForm.phone.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.employeeForm.email)) {
      this.employeeError = 'Please enter a valid email address.';
      this.employeeSuccess = '';
      this.employeeSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (!/^0\d{9}$/.test(this.employeeForm.phone)) {
      this.employeeError = 'Phone number must be 10 digits and start with 0.';
      this.employeeSuccess = '';
      this.employeeSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (this.editingEmployeeId) {
      const assignedComplexId = this.employeeForm.assignedComplex || '';
      const assignedComplexName =
        this.assignedComplexes.find((complex) => complex.id === assignedComplexId)?.name || '';
      const assignedCommunityName =
        this.gatedCommunities.find(
          (community) =>
            this.normalizeName(this.getComplexName(community.complexId)) ===
            this.normalizeName(assignedComplexName),
        )?.name || '';

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

      this.dataService
        .put<ResponseBody>(`user/security-employee/${this.editingEmployeeId}`, payload)
        .subscribe({
          next: (response) => {
            const updatedUser = response?.payload;
            const index = this.employees.findIndex(
              (employee) => employee.id === this.editingEmployeeId,
            );
            if (index !== -1) {
              this.employees[index] = {
                id: updatedUser?._id ?? this.editingEmployeeId,
                name: updatedUser?.name ?? this.employeeForm.name,
                surname: updatedUser?.surname ?? this.employeeForm.surname,
                email: updatedUser?.emailAddress ?? this.employeeForm.email,
                phone: updatedUser?.cellNumber ?? this.employeeForm.phone,
                position: this.employeeForm.position,
                assignedComplex: updatedUser?.complex?._id ?? assignedComplexId,
                assignedComplexes: [updatedUser?.complex?._id ?? assignedComplexId].filter(
                  (value) => Boolean(value),
                ),
                assignedCommunities: [],
                status: this.employeeForm.status,
              };
            }

            this._snackBar.open(response.message, 'close', {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            });
            this.employeeSuccess = response.message;
            setTimeout(() => {
              this.employeeSubmitting = false;
              this.submitting.update(() => false);
              this.closeEmployeeModal();
            }, 1500);
          },
          error: (error) => {
            this.employeeSuccess = '';
            this.employeeError = error?.error?.message ?? 'Unable to update employee.';
            this._snackBar.open(error.error.message, 'close', {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            });
            this.employeeSubmitting = false;
            this.submitting.update(() => false);
          },
        });
      return;
    } else {
      const defaultComplex = this.assignedComplexes[0];
      const assignedComplexId = this.employeeForm.assignedComplex || defaultComplex?.id || '';
      const assignedComplexName =
        this.assignedComplexes.find((complex) => complex.id === assignedComplexId)?.name || '';
      const assignedCommunityName =
        this.gatedCommunities.find(
          (community) =>
            this.normalizeName(this.getComplexName(community.complexId)) ===
            this.normalizeName(assignedComplexName),
        )?.name || '';

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
            this.employeeSuccess = '';
            this.employeeSubmitting = false;
            this.submitting.update(() => false);
            return;
          }

          const emailSent = response?.payload?.emailSent !== false;
          const successMessage = emailSent
            ? `${response.message} Login credentials were sent by email.`
            : `${response.message} Employee created, but credentials email was not confirmed.`;

          const newEmployee = {
            id: createdUser._id ?? `emp-${Date.now()}`,
            name: createdUser.name ?? this.employeeForm.name,
            surname: createdUser.surname ?? this.employeeForm.surname,
            email: createdUser.emailAddress ?? this.employeeForm.email,
            phone: createdUser.cellNumber ?? this.employeeForm.phone,
            position: this.employeeForm.position,
            assignedComplex: createdUser.complex?._id ?? assignedComplexId,
            assignedComplexes: [createdUser.complex?._id ?? assignedComplexId].filter((value) =>
              Boolean(value),
            ),
            assignedCommunities: [],
            status: this.employeeForm.status,
          };

          this.employees.push(newEmployee);
          this._snackBar.open(successMessage, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.employeeSuccess = successMessage;
          setTimeout(() => {
            this.employeeSubmitting = false;
            this.submitting.update(() => false);
            this.closeEmployeeModal();
          }, 1500);
        },
        error: (error) => {
          this.employeeSuccess = '';
          this.employeeError = error?.error?.message ?? 'Unable to add employee.';
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.employeeSubmitting = false;
          this.submitting.update(() => false);
        },
      });
      return;
    }
  }

  protected openComplexDetails(complex: any): void {
    this.selectedComplex = complex;
    this.selectedComplexEmployees = this.employees.filter((employee) => {
      const assignedComplexes = Array.isArray(employee.assignedComplexes)
        ? employee.assignedComplexes
        : [];
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
      const assignedCommunities = Array.isArray(employee.assignedCommunities)
        ? employee.assignedCommunities
        : [];
      const assignedComplexes = Array.isArray(employee.assignedComplexes)
        ? employee.assignedComplexes
        : [];
      const communityComplexId = String(community?.complexId).trim();

      return (
        assignedCommunities.includes(community.id) ||
        (communityComplexId.length > 0 &&
          (assignedComplexes.includes(communityComplexId) ||
            employee.assignedComplex === communityComplexId))
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
    this.selectedComplexContractExpiringSoon =
      this.selectedComplexDaysRemaining <= 90 && this.selectedComplexDaysRemaining > 0;
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
    this.submitting.update(() => true);
    const manager = this.securityManagers.find(
      (sm) => sm.id === this.assignmentForm.securityManagerId,
    );
    if (!manager) {
      this.assignmentError = 'Selected guard was not found.';
      this.submitting.update(() => false);
      return;
    }

    const payload = {
      assignedComplexes: [...this.assignmentForm.assignedComplexes],
      assignedCommunities: [...this.assignmentForm.assignedCommunities],
    };

    this.dataService
      .put<ResponseBody>(`user/security-assignment/${manager.id}`, payload)
      .subscribe({
        next: (res) => {
          manager.assignedComplexes = [...payload.assignedComplexes];
          manager.assignedCommunities = [...payload.assignedCommunities];

          const employeeIndex = this.employees.findIndex((employee) => employee.id === manager.id);
          if (employeeIndex > -1) {
            this.employees[employeeIndex] = {
              ...this.employees[employeeIndex],
              assignedComplexes: [...payload.assignedComplexes],
              assignedCommunities: [...payload.assignedCommunities],
              assignedComplex: payload.assignedComplexes[0],
            };
          }

          this._snackBar.open(res.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          setTimeout(() => {
            this.submitting.update(() => false);
            this.closeAssignmentModal();
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
        },
      });
  }

  protected getAssignedComplexNames(complexIds: string[]): string {
    return complexIds
      .map((id) => this.assignedComplexes.find((c) => c.id === id)?.name)
      .filter((name) => name)
      .join(', ');
  }

  protected getComplexContractDates(
    complexId: string,
  ): { startDate: string; endDate: string } | null {
    const complex = this.assignedComplexes.find((c) => c.id === complexId);
    if (complex) {
      return { startDate: complex.contractStartDate, endDate: complex.contractEndDate };
    }
    return null;
  }

  protected getCommunityContractDates(
    communityId: string,
  ): { startDate: string; endDate: string } | null {
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
    return (
      this.getContractDaysRemaining(endDate) <= 90 && this.getContractDaysRemaining(endDate) > 0
    );
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
    const employeesIdentity = this.employees
      .map((emp) => `${emp.id}:${emp.status}:${emp.assignedComplex}`)
      .join('|');
    const key = `${this.searchTerm}|${this.filterStatus}|${employeesIdentity}`;
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
          if (
            this.visitorFilterCommunityId &&
            visitor.communityId !== this.visitorFilterCommunityId
          ) {
            return false;
          }

          // Filter by community residence type (house or complex)
          if (this.visitorFilterCommunityResidenceType !== 'all') {
            if (visitor.communityResidenceType !== this.visitorFilterCommunityResidenceType) {
              return false;
            }

            // If filtering by complex within community
            if (
              this.visitorFilterCommunityResidenceType === 'complex' &&
              this.visitorFilterCommunityComplexId
            ) {
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
    const community = this.gatedCommunities.find((gc) => gc.id === this.visitorFilterCommunityId);
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
      const complexName = this.getComplexName(String(tenant.complexId));
      if (complexName && complexName !== 'Unknown') {
        path.push(complexName);
      }
      if (String(tenant.address).trim()) {
        path.push(String(tenant.address).trim());
      }
    } else if (tenant.residenceType === 'community') {
      // Gated Community → ...
      const communityName = this.getCommunityName(String(tenant.communityId));
      if (communityName && communityName !== 'Unknown') {
        path.push(communityName);
      } else {
        path.push('Gated Community');
      }

      if (tenant.communityResidenceType === 'house') {
        // → House Number
        const houseNumber = String(tenant.address).trim();
        if (houseNumber) {
          path.push(`House ${houseNumber}`);
        }
      } else if (tenant.communityResidenceType === 'complex') {
        // → Complex → Unit
        const community = this.gatedCommunities.find(
          (gc) => gc.id === String(tenant.communityId),
        );
        const complexInCommunity = community?.complexesInCommunity?.find(
          (c) => c.id === String(tenant.communityComplexId),
        );
        if (complexInCommunity?.name) {
          path.push(complexInCommunity.name);
        } else {
          const fallbackComplexName = this.getComplexName(String(tenant.communityComplexId));
          if (fallbackComplexName && fallbackComplexName !== 'Unknown') {
            path.push(fallbackComplexName);
          }
        }
        if (String(tenant.address).trim()) {
          path.push(String(tenant.address).trim());
        }
      }
    }

    if (path.length === 0) {
      path.push('Location not set');
    }

    return path;
  }

  protected getTenantLocationTypeLabel(tenant: any): string {
    if (tenant?.residenceType === 'community') {
      return tenant?.communityResidenceType === 'house' ? 'Gated Community • House' : 'Gated Community • Complex';
    }
    return 'Complex';
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

  protected openTenantModal(): void {
    this.isTenantModalOpen = true;
    this.tenantError = '';
    this.tenantSuccess = '';
    this.tenantSubmitting = false;
  }

  protected closeTenantModal(): void {
    this.isTenantModalOpen = false;
    this.resetTenantForm();
    this.tenantSubmitting = false;
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
    if (this.tenantSubmitting) {
      return;
    }

    this.tenantSubmitting = true;
    this.tenantError = '';
    this.tenantSuccess = this.editingTenantId ? 'Updating tenant...' : 'Registering tenant...';
    this.submitting.update(() => true);
    // Validation
    if (
      !this.tenantForm.name ||
      !this.tenantForm.surname ||
      !this.tenantForm.email ||
      !this.tenantForm.phone ||
      !this.tenantForm.address
    ) {
      this.tenantError = 'Please fill in all required fields.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    this.tenantForm.phone = this.tenantForm.phone.trim();

    if (!/^0\d{9}$/.test(this.tenantForm.phone)) {
      this.tenantError = 'Phone number must be 10 digits and start with 0.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    const allowedResidenceTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!allowedResidenceTypes.includes(this.tenantForm.residenceType)) {
      this.tenantError = 'Selected residence type is not available for your assigned sites.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (this.tenantForm.residenceType === 'complex' && !this.tenantForm.complexId) {
      this.tenantError = 'Please select a complex.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (this.tenantForm.residenceType === 'community' && !this.tenantForm.communityId) {
      this.tenantError = 'Please select a gated community.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (
      this.tenantForm.residenceType === 'community' &&
      this.tenantForm.communityResidenceType === 'complex' &&
      !this.tenantForm.communityComplexId
    ) {
      this.tenantError = 'Please select a complex within the gated community.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

    if (
      this.tenantForm.residenceType === 'community' &&
      !this.availableCommunityResidenceTypes.includes(this.tenantForm.communityResidenceType)
    ) {
      this.tenantError = 'Selected community residence type is not available.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
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
      complexId:
        this.tenantForm.residenceType === 'complex' ? this.tenantForm.complexId : undefined,
      communityId:
        this.tenantForm.residenceType === 'community' ? this.tenantForm.communityId : undefined,
      communityResidenceType:
        this.tenantForm.residenceType === 'community'
          ? this.tenantForm.communityResidenceType
          : undefined,
      communityComplexId:
        this.tenantForm.residenceType === 'community' &&
        this.tenantForm.communityResidenceType === 'complex'
          ? this.tenantForm.communityComplexId
          : undefined,
      address: this.tenantForm.address.trim(),
      vehicles: this.tenantForm.vehicles,
      registeredDate: this.editingTenantId
        ? this.tenants.find((t: any) => t.id === this.editingTenantId)?.registeredDate ||
          new Date().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    };

    const normalizedTenantEmail = tenantData.email.trim().toLowerCase();

    const selectedComplexForTenant =
      tenantData.residenceType === 'complex'
        ? this.assignedComplexes.find((complex) => complex.id === tenantData.complexId)
        : this.availableCommunityComplexes.find(
            (complex) => complex.id === tenantData.communityComplexId,
          );

    const payload = {
      name: tenantData.name,
      surname: tenantData.surname,
      emailAddress: normalizedTenantEmail,
      cellNumber: tenantData.phone,
      idNumber: tenantData.idNumber,
      address: tenantData.address,
      residenceType: tenantData.residenceType,
      complexId:
        tenantData.residenceType === 'complex'
          ? tenantData.complexId
          : tenantData.communityComplexId,
      complexName: selectedComplexForTenant?.name,
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

          this._snackBar.open(response.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSuccess = response.message;
          setTimeout(() => {
            this.tenantSubmitting = false;
            this.submitting.update(() => false);
            this.closeTenantModal();
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.tenantSuccess = '';
          this.tenantError = error?.error?.message ?? 'Unable to update tenant.';
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSubmitting = false;
          this.submitting.update(() => false);
        },
      });
      return;
    } else {
      const existingTenant = this.tenants.find(
        (tenant: any) => tenant.email?.trim().toLowerCase() === normalizedTenantEmail,
      );
      if (existingTenant) {
        this.tenantError =
          'A tenant with this email already exists. Open Edit to update the tenant.';
        this.tenantSuccess = '';
        this.tenantSubmitting = false;
        this.submitting.update(() => false);
        return;
      }

      this.dataService.post<ResponseBody>('user/tenant', payload).subscribe({
        next: (response) => {
          const createdUser = response?.payload?.user;
          const emailSent = response?.payload?.emailSent !== false;
          const successMessage = emailSent
            ? `${response.message} Login credentials were sent by email.`
            : `${response.message} Tenant created, but credentials email was not confirmed.`;
          const mappedTenant = {
            ...tenantData,
            id: createdUser?._id ?? tenantData.id,
            email: createdUser?.emailAddress ?? tenantData.email,
            phone: createdUser?.cellNumber ?? tenantData.phone,
            locationPath: this.buildTenantLocationPath(tenantData),
          };

          this.tenants.push(mappedTenant);
          this._snackBar.open(successMessage, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSuccess = successMessage;

          setTimeout(() => {
            this.tenantSubmitting = false;
            this.submitting.update(() => false);
            this.closeTenantModal();
          }, 1500);
        },
        error: (error) => {
          this.tenantSuccess = '';
          this.tenantError = error?.error?.message ?? 'Unable to register tenant.';
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.tenantSubmitting = false;
          this.submitting.update(() => false);
        },
      });
      return;
    }
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
    this.submitting.update(() => true);
    if (this.selectedTenantToDelete) {
      const tenantId = this.selectedTenantToDelete.id;
      this.dataService.delete<ResponseBody>(`user/tenant/${tenantId}`).subscribe({
        next: (res) => {
          this.tenants = this.tenants.filter((t: any) => t.id !== tenantId);
          this._snackBar.open(res.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
          this.closeDeleteTenantModal();
        },
        error: (error) => {
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
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

    console.log(this.tenantForm);
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
    this.tenantForm.communityResidenceType = availableTypes.includes('house')
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
        : this.gatedCommunities.length > 0
          ? 'community'
          : 'complex';

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

  protected get availableTenantResidenceTypes(): Array<{
    value: 'complex' | 'community';
    label: string;
  }> {
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

    const community = this.gatedCommunities.find(
      (gc: any) => gc.id === this.tenantForm.communityId,
    );
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
    const community = this.gatedCommunities.find(
      (gc: any) => gc.id === this.tenantForm.communityId,
    );
    this.availableHousesCache = community?.houses || [];
    this.availableHousesKey = key;
    return this.availableHousesCache;
  }

  protected get availableCommunityComplexes(): Array<{
    id: string;
    name: string;
    units: string[];
  }> {
    const key = `${this.tenantForm.communityId}|${this.gatedCommunities.length}`;
    if (this.availableCommunityComplexesKey === key) {
      return this.availableCommunityComplexesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityComplexesCache = [];
      this.availableCommunityComplexesKey = key;
      return this.availableCommunityComplexesCache;
    }
    const community = this.gatedCommunities.find(
      (gc: any) => gc.id === this.tenantForm.communityId,
    );
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
    const community = this.gatedCommunities.find(
      (gc: any) => gc.id === this.tenantForm.communityId,
    );
    const complex = community?.complexesInCommunity?.find(
      (c: any) => c.id === this.tenantForm.communityComplexId,
    );
    this.availableCommunityUnitsCache = complex?.units || [];
    this.availableCommunityUnitsKey = key;
    return this.availableCommunityUnitsCache;
  }

  protected get filteredTenants(): any[] {
    const tenantsIdentity = this.tenants
      .map(
        (tenant: any) =>
          `${tenant.id}:${tenant.residenceType}:${tenant.complexId}:${tenant.communityId}`,
      )
      .join('|');
    const key = `${this.tenantSearchTerm}|${this.tenantFilterResidenceType}|${this.tenantFilterComplexId}|${this.tenantFilterCommunityId}|${this.tenantFilterCommunityResidenceType}|${this.tenantFilterCommunityComplexId}|${tenantsIdentity}`;
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
            if (
              this.tenantFilterCommunityResidenceType === 'complex' &&
              this.tenantFilterCommunityComplexId
            ) {
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
    const community = this.gatedCommunities.find((gc) => gc.id === this.tenantFilterCommunityId);
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
