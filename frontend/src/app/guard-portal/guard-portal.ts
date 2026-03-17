// ...existing code...

// Place these inside the GuardPortal class, after the constructor

import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { GuardPortalFiltersFormDTO } from '../interfaces/forms/guardPortalFiltersFormDTO';
import { ResponseBody } from '../interfaces/ResponseBody';
import { TenantFormDTO } from '../interfaces/forms/tenantFormDTO';
import { VehicleFormDTO } from '../interfaces/forms/vehicleFormDTO';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';
import { MatDialog } from '@angular/material/dialog';
import { BookVisitor } from '../dashboard/visitors/book-visitor/book-visitor';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Loader } from '../components/loader/loader';
import { visitorDTO } from '../interfaces/visitorDTO';
import { VisitorCard } from '../components/visitor-card/visitor-card';
import { UpdateProfile } from '../update-profile/update-profile';
import { Router } from '@angular/router';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, VisitorCard],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal implements OnInit, OnDestroy {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  private dialog = inject(MatDialog);
  visitorList = signal<visitorDTO[]>([]);
  protected storageService = inject(StorageService);
  router = inject(Router)

  updateProfile() {
    this.dialog.open(UpdateProfile);
  }

  logout() {
    this.storageService.removeItem("bearer-token");
    this.router.navigate(['/login'])
  }
  // Dynamic filtered lists for residents and vehicles by unit search
  protected get filteredResidents(): any[] {
    const allResidents = Array.isArray(this.residents) ? this.residents : [];
    const selectedComplexId = String(this.filtersForm.selectedComplex || '').trim();
    const selectedGatedCommunityId = String(this.filtersForm.selectedGatedCommunity || '').trim();

    // Always restrict tenant cards to the currently selected station.
    let stationResidents = allResidents;
    if (selectedComplexId) {
      stationResidents = stationResidents.filter(
        (resident) => String(resident?.complexId || '').trim() === selectedComplexId,
      );
    } else if (selectedGatedCommunityId) {
      stationResidents = stationResidents.filter(
        (resident) => String(resident?.gatedCommunityId || '').trim() === selectedGatedCommunityId,
      );
    }

    const unitQuery = (this.filtersForm.searchUnit || '').trim().toLowerCase();
    if (!unitQuery) {
      return [...stationResidents];
    }
    return stationResidents.filter((resident) => {
      const unit = (resident.unit || resident.houseNumber || '').toString().toLowerCase();
      return unit.includes(unitQuery);
    });
  }

  // No need to assign filtered lists, just trigger change detection
  private updateFilteredLists(): void {
    this.cdr.markForCheck();
  }

  openBookVisitorModal(resident?: any): void {
    this.dialog.open(BookVisitor, {
      width: '600px',
      disableClose: false,
      data: resident
        ? {
            data: resident,
            endpoint: 'visitor/security/',
          }
        : undefined,
    });
  }
  protected filtersForm: GuardPortalFiltersFormDTO = {
    searchCode: '',
    searchUnit: '',
    searchReg: '',
    searchComplex: '',
    searchGatedCommunity: '',
    searchComplexFilter: '',
    selectedComplex: '',
    selectedGatedCommunity: '',
  };
  protected get searchCode(): string {
    return this.filtersForm.searchCode;
  }

  protected set searchCode(value: string) {
    this.filtersForm.searchCode = value;
  }

  protected get searchUnit(): string {
    return this.filtersForm.searchUnit;
  }

  protected set searchUnit(value: string) {
    this.filtersForm.searchUnit = value;
  }

  protected get searchReg(): string {
    return this.filtersForm.searchReg;
  }

  protected set searchReg(value: string) {
    this.filtersForm.searchReg = value;
  }

  protected get searchComplexFilter(): string {
    return this.filtersForm.searchComplexFilter;
  }

  protected set searchComplexFilter(value: string) {
    this.filtersForm.searchComplexFilter = value;
  }

  protected get selectedGatedCommunity(): string {
    return this.filtersForm.selectedGatedCommunity;
  }

  protected set selectedGatedCommunity(value: string) {
    this.filtersForm.selectedGatedCommunity = value;
  }

  protected get selectedComplex(): string {
    return this.filtersForm.selectedComplex;
  }

  protected set selectedComplex(value: string) {
    this.filtersForm.selectedComplex = value;
  }
  protected showUnitOptions = false;
  protected showRegOptions = false;
  protected showComplexOptions = false;
  protected showGatedCommunityOptions = false;
  protected showCodes = true;
  protected showResidents = true;
  protected showVehicles = true;

  // Utility to check if station is selected/locked
  protected get isStationSelected(): boolean {
    return this.stationLocked && this.hasValidStationSelection();
  }
  protected toastVisible = false;
  protected toastMessage = '';
  private toastTimeoutId: number | null = null;
  protected isHoldingSos = false;
  protected showSosSuccess = false;
  protected isResidentPhotoModalOpen = false;
  protected isCodeVehicleModalOpen = false;
  protected selectedResidentPhotoUrl = '';
  protected selectedResidentInitials = '';
  protected selectedCodeVehicle: any | null = null;
  protected selectedCodeVisitorName = '';
  protected isTenantModalOpen = false;
  protected isDeleteTenantModalOpen = false;
  protected selectedTenantToDelete: null | {
    email: string;
    id: string;
    name: string;
    unit: string;
  } = null;
  protected deletingTenant = false;
  protected tenantError = '';
  protected tenantSuccess = '';
  protected tenantSubmitting = false;
  protected canRegisterTenant = false;
  protected isSosEnabledForCompany = false;
  protected showStationPrompt = false;
  protected stationLocked = false;
  protected stationType: 'gated' | 'complex' | '' = '';

  protected tenantForm: TenantFormDTO = {
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

  protected currentVehicle: VehicleFormDTO = {
    make: '',
    model: '',
    reg: '',
    color: '',
  };

  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  protected guardName = 'James Mthembu';
  protected guardPhotoUrl = '';
  protected activeShiftStationName = '';
  private activeShiftId = '';
  private currentShiftStartAt: Date | null = null;
  private pendingActiveShift: any | null | undefined = undefined;
  private stationContextReady = false;
  private restoredStationComplexName = '';
  private effectiveGuardId = '';
  private readonly stationStorageKey = 'equasec.guard.station';
  private readonly shiftWindowHours = 12;
  private readonly platformId = inject(PLATFORM_ID);
  private assignedComplexIds = new Set<string>();
  private assignedCommunityIds = new Set<string>();
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

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly dataService: DataService,
    private readonly storage: StorageService,
  ) {}

  // Helper: filter registered vehicles by reg search
  protected get filteredRegisteredVehiclesByReg() {
    let regQuery = (this.filtersForm.searchReg || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    let vehicles = this.vehicles;
    let filtered = vehicles;
    if (regQuery) {
      filtered = vehicles.filter((v) => {
        let regValue = (v.regNumber || '').toString().trim().toLowerCase().replace(/\s+/g, '');
        return regValue.includes(regQuery);
      });
      // DEBUG: If no vehicles match, show all vehicles to help diagnose
      if (filtered.length === 0 && vehicles.length > 0) {
        return vehicles.map((v) => ({ ...v, isVisitor: false, debug: true }));
      }
    }
    return filtered.map((v) => ({ ...v, isVisitor: false }));
  }

  // Helper: filter visitor vehicles (from active codes) by reg search
  protected get filteredVisitorVehiclesByReg() {
    const regQuery = (this.filtersForm.searchReg || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    return (Array.isArray(this.visitorList()) ? this.visitorList() : [])
      .filter((code) => code.driving && code.vehicle)
      .filter((code) => {
        // Normalize and check multiple possible registration properties
        let regValue = code.vehicle?.registrationNumber
          .toString()
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '') as string;
        return regValue.includes(regQuery);
      });
  }

  // Helper: filter residents by unit search
  protected get filteredResidentsByUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!unitQuery) return this.filteredResidents;
    return this.filteredResidents.filter((resident) =>
      (resident.unit || '').toLowerCase().includes(unitQuery),
    );
  }

  protected get guardInitials(): string {
    return (this.guardName || 'Guard').trim().slice(0, 2).toUpperCase();
  }

  protected get selectedComplexName(): string {
    const complex = this.complexes.find((c) => c.id === this.filtersForm.selectedComplex);
    return complex?.name || 'Select a complex';
  }

  protected get selectedGatedCommunityName(): string {
    const gc = this.gatedCommunities.find((g) => g.id === this.filtersForm.selectedGatedCommunity);
    return gc?.name || 'Select a gated community';
  }

  protected get selectedStationName(): string {
    if (this.filtersForm.selectedComplex && this.filtersForm.selectedGatedCommunity) {
      return `${this.selectedComplexName} - ${this.selectedGatedCommunityName}`;
    }
    if (this.filtersForm.selectedComplex) {
      return this.selectedComplexName;
    }
    if (this.filtersForm.selectedGatedCommunity) {
      return this.selectedGatedCommunityName;
    }
    if (this.activeShiftStationName) {
      return this.activeShiftStationName;
    }
    return 'Select station';
  }

  protected get stationSelectionReady(): boolean {
    if (this.stationType === 'gated') {
      return this.filtersForm.selectedGatedCommunity.length > 0;
    }
    if (this.stationType === 'complex') {
      return this.filtersForm.selectedComplex.length > 0;
    }
    return false;
  }

  protected get stationActionLabel(): string {
    return this.hasValidStationSelection() ? 'Change station' : 'Select station';
  }

  protected get shiftStartSaLabel(): string {
    if (!this.currentShiftStartAt) {
      return 'Not started';
    }

    const shiftStart = this.currentShiftStartAt;
    if (Number.isNaN(shiftStart.getTime())) {
      return 'Not started';
    }

    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(shiftStart);
  }

  protected get unitSearchDisabled(): boolean {
    return false;
  }

  protected get residenceSearchLabel(): string {
    if (this.stationType === 'gated' && !this.filtersForm.selectedComplex) {
      return 'House No';
    }

    return 'Unit';
  }

  protected get residenceSearchPlaceholder(): string {
    if (this.stationType === 'gated' && !this.filtersForm.selectedComplex) {
      return 'e.g. 24';
    }

    return 'e.g. 402';
  }

  private stripResidencePrefix(value: string | undefined | null): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '';
    }

    return raw.replace(/^(unit|house\s*no\.?|house\s*number|house)\s*/i, '').trim();
  }

  protected formatResidenceBadge(value: string | undefined | null): string {
    const cleanedValue = this.stripResidencePrefix(value);
    const label = this.residenceSearchLabel;

    if (!cleanedValue) {
      return label;
    }

    return `${label} ${cleanedValue}`;
  }

  protected formatResidenceValue(value: string | undefined | null): string {
    return this.stripResidencePrefix(value);
  }

  ngOnInit(): void {
    this.loadActiveShiftFromGuardHistory();
    this.hydrateGuardFromStorage();
    this.loadGuardPortalData();
  }

  private loadActiveShiftFromGuardHistory(): void {
    this.submitting.update(() => true);
    this.dataService
      .get<any>('guardHistory/active')
      .pipe(catchError(() => of({ payload: null })))
      .subscribe((response) => {
        this.pendingActiveShift = response?.payload ?? null;
        this.submitting.update(() => false);
      });
  }
  protected gatedCommunities: Array<{
    id: string;
    name: string;
    complexes: Array<{ id: string; name: string; address?: string | null }>;
    houses: string[];
    complexesInCommunity: Array<{
      id: string;
      name: string;
      units: string[];
      address?: string | null;
    }>;
  }> = [];

  protected assignedComplexes: Array<{
    id: string;
    name: string;
    units: string[];
    address?: string | null;
  }> = [];

  protected standaloneComplexes: Array<{ id: string; name: string; address?: string | null }> = [];

  protected get complexes(): Array<{ id: string; name: string; address?: string | null }> {
    if (this.filtersForm.selectedGatedCommunity) {
      const gc = this.gatedCommunities.find(
        (g) => g.id === this.filtersForm.selectedGatedCommunity,
      );
      return gc?.complexes ?? [];
    }
    return this.standaloneComplexes;
  }

  protected residents: Array<{
    id: string;
    name: string;
    unit: string;
    houseNumber: string;
    cellphone: string;
    emailAddress: string;
    photoDataUrl: string;
    complexId: string;
    gatedCommunityId: string;
  }> = [];
  protected vehicles: Array<{
    make: string;
    model: string;
    regNumber: string;
    color: string;
    unit: string;
    houseNumber: string;
    owner: string;
    complexId: string;
    gatedCommunityId: string;
  }> = [];

  private shouldUseHouseNumberForStation(): boolean {
    return this.stationType === 'gated' && !this.filtersForm.selectedComplex;
  }

  private resolveResidenceNumber(
    unit: string | undefined | null,
    houseNumber: string | undefined | null,
  ): string {
    const normalizedUnit = String(unit ?? '').trim();
    const normalizedHouseNumber = String(houseNumber ?? '').trim();

    if (this.shouldUseHouseNumberForStation() && normalizedHouseNumber.length > 0) {
      return normalizedHouseNumber;
    }

    return normalizedUnit || normalizedHouseNumber;
  }

  private normalizeName(value: string | undefined | null): string {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private hasTenantRole(typeValue: unknown): boolean {
    if (Array.isArray(typeValue)) {
      return typeValue.some((role) => {
        const normalizedRole = this.normalizeName(String(role ?? ''));
        return normalizedRole === 'tenant' || normalizedRole === 'tenat';
      });
    }

    const normalizedRole = this.normalizeName(String(typeValue ?? ''));
    return normalizedRole === 'tenant' || normalizedRole === 'tenat';
  }

  private ensureArray<T = any>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (value && typeof value === 'object') {
      const payload = (value as { payload?: unknown }).payload;
      if (Array.isArray(payload)) {
        return payload as T[];
      }
    }

    return [];
  }

  private collectAssignedIdsFromUser(user: any, kind: 'complex' | 'community'): string[] {
    if (!user || typeof user !== 'object') {
      return [];
    }

    const idSet = new Set<string>();
    const directKey = kind === 'complex' ? 'assignedComplexes' : 'assignedCommunities';
    const legacyKey = kind === 'complex' ? 'assignedComplex' : 'assignedCommunity';
    const contractKey = kind === 'complex' ? 'assignedComplexes' : 'assignedCommunities';

    const directValues = user?.[directKey];
    if (Array.isArray(directValues)) {
      for (const value of directValues) {
        const normalized = String(value ?? '').trim();
        if (normalized) {
          idSet.add(normalized);
        }
      }
    }

    const legacyValue = String(user?.[legacyKey] ?? '').trim();
    if (legacyValue) {
      idSet.add(legacyValue);
    }

    const contracts = Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
    for (const contract of contracts) {
      const contractValues = contract?.[contractKey];
      if (!Array.isArray(contractValues)) {
        continue;
      }

      for (const value of contractValues) {
        const normalized = String(value ?? '').trim();
        if (normalized) {
          idSet.add(normalized);
        }
      }
    }

    return Array.from(idSet);
  }

  private hydrateGuardFromStorage(): void {
    const currentUser = this.getStoredCurrentUser();
    if (!currentUser) {
      return;
    }

    const fullName = `${currentUser?.name ?? ''} ${currentUser?.surname ?? ''}`.trim();
    if (fullName) {
      this.guardName = fullName;
    }
    this.guardPhotoUrl = currentUser?.profilePhoto ?? this.guardPhotoUrl;
    this.canRegisterTenant = this.isAdminGuard(currentUser);
    this.isSosEnabledForCompany = Boolean(currentUser?.securityCompany?.sosOptin);
  }

  private resolveSosOptinForCompany(
    currentUser: any,
    storedCurrentUser: any,
    securityCompanies: any[],
  ): boolean {
    const companyList = Array.isArray(securityCompanies) ? securityCompanies : [];
    const users = [currentUser, storedCurrentUser].filter(Boolean);

    for (const user of users) {
      const directSosOptin = user?.securityCompany?.sosOptin;
      if (typeof directSosOptin === 'boolean') {
        return directSosOptin;
      }

      const companyId = String(user?.securityCompany?._id ?? '').trim();
      if (companyId) {
        const companyById = companyList.find((company) => {
          const id = String(company?._id ?? company?.id ?? '').trim();
          return id === companyId;
        });
        if (companyById && typeof companyById?.sosOptin === 'boolean') {
          return Boolean(companyById.sosOptin);
        }
      }

      const companyName = this.normalizeName(user?.securityCompany?.name);
      if (companyName) {
        const companyByName = companyList.find((company) => {
          const name = this.normalizeName(company?.name);
          return name === companyName;
        });
        if (companyByName && typeof companyByName?.sosOptin === 'boolean') {
          return Boolean(companyByName.sosOptin);
        }
      }
    }

    return false;
  }

  private getStoredCurrentUser(): any | null {
    const rawUser =
      this.storage?.getItem?.('current-user') ??
      (isPlatformBrowser(this.platformId) ? window.localStorage.getItem('current-user') : null);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  // Helper: filter vehicles by unit search
  protected get filteredVehiclesByUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    const registeredVehicles = this.filteredVehicles.filter((vehicle) => !vehicle.isVisitor);
    if (!unitQuery) return registeredVehicles;
    return registeredVehicles.filter((vehicle) =>
      (vehicle.unit || '').toLowerCase().includes(unitQuery),
    );
  }

  private loadGuardPortalData(): void {
    this.submitting.update(() => true);
    this.dataService
      .get<ResponseBody>('user/current')
      .pipe(
        switchMap((currentUserResponse) => {
          const currentUserPayload = currentUserResponse?.payload ?? currentUserResponse ?? null;
          const storedCurrentUser = this.getStoredCurrentUser();
          const currentUser =
            currentUserPayload && typeof currentUserPayload === 'object'
              ? currentUserPayload
              : (storedCurrentUser ?? null);

          if (currentUser) {
            this.guardName =
              `${currentUser.name ?? ''} ${currentUser.surname ?? ''}`.trim() || this.guardName;
            this.guardPhotoUrl = currentUser.profilePhoto ?? '';
            this.canRegisterTenant = this.isAdminGuard(currentUser);
          }

          this.assignedComplexIds = new Set([
            ...this.collectAssignedIdsFromUser(currentUser, 'complex'),
            ...this.collectAssignedIdsFromUser(storedCurrentUser, 'complex'),
          ]);
          this.assignedCommunityIds = new Set([
            ...this.collectAssignedIdsFromUser(currentUser, 'community'),
            ...this.collectAssignedIdsFromUser(storedCurrentUser, 'community'),
          ]);

          const guardId = currentUser?._id as string | undefined;
          // Ensure guardId is set from current user
          let effectiveGuardId = guardId;
          if (!effectiveGuardId) {
            const currentUser = this.getStoredCurrentUser();
            effectiveGuardId = currentUser?._id ?? currentUser?.id ?? '';
          }
          this.effectiveGuardId = String(effectiveGuardId ?? '').trim();
          return forkJoin({
            gated: this.dataService.get<any[]>('gatedCommunity/').pipe(catchError(() => of([]))),
            complexes: this.dataService.get<any[]>('complex/').pipe(catchError(() => of([]))),
            securityCompanies: this.dataService
              .get<any[]>('securityCompany/')
              .pipe(catchError(() => of([]))),
            units: this.dataService.get<any[]>('unit/').pipe(catchError(() => of([]))),
            users: this.dataService
              .get<ResponseBody>('user/tenants')
              .pipe(catchError(() => of<ResponseBody>({ message: '' }))),
            vehicles: this.dataService.get<any[]>('vehicle/').pipe(catchError(() => of([]))),
            visitors: this.dataService
              .get<ResponseBody>(`visitor/security/`)
              .pipe(catchError(() => of<ResponseBody>({ message: '' }))),
            userContext: of({ currentUser, storedCurrentUser }),
          });
        }),
        catchError(() =>
          forkJoin({
            gated: of([]),
            complexes: of([]),
            securityCompanies: of([]),
            units: of([]),
            users: of<ResponseBody>({ message: '' }),
            vehicles: of([]),
            visitors: of<ResponseBody>({ message: '' }),
            userContext: of({ currentUser: null, storedCurrentUser: null }),
          }),
        ),
      )
      .subscribe(
        ({
          gated,
          complexes,
          securityCompanies,
          units,
          users,
          vehicles,
          visitors,
          userContext,
        }) => {
          const gatedList = this.ensureArray<any>(gated);
          const complexList = this.ensureArray<any>(complexes);
          const securityCompanyList = this.ensureArray<any>(securityCompanies);
          const unitList = this.ensureArray<any>(units);
          const userList = this.ensureArray<any>(users.payload);
          const vehicleList = this.ensureArray<any>(vehicles);
          this.visitorList.update(() => this.ensureArray<any>(visitors.payload));
          this.isSosEnabledForCompany = this.resolveSosOptinForCompany(
            userContext?.currentUser ?? null,
            userContext?.storedCurrentUser ?? null,
            securityCompanyList,
          );

          this.cdr.markForCheck();
          this.stationContextReady = true;
          this.applyStationFromCurrentShiftState();

          const allGatedCommunities = gatedList.map((community) => ({
            id: this.normalizeStationId(community._id ?? community.id),
            name: community.name ?? '',
            complexes: [],
            houses: this.generateResidenceLabels(
              Number(community.numberOfHouses ?? 0),
              Number(community.unitStart ?? 0),
              Number(community.unitEnd ?? 0),
              'House',
            ),
            complexesInCommunity: [],
          }));

          const allComplexes = complexList.map((complex) => ({
            id: this.normalizeStationId(complex._id ?? complex.id),
            name: complex.name ?? '',
            address: String(complex.address ?? '').trim(),
            gatedCommunityName: complex.gatedCommunityName ?? '',
            units: this.generateResidenceLabels(
              Number(complex.numberOfUnits ?? 0),
              Number(complex.unitStart ?? 0),
              Number(complex.unitEnd ?? 0),
              'Unit',
            ),
          }));

          const hasAssignments =
            this.assignedComplexIds.size > 0 || this.assignedCommunityIds.size > 0;

          const allowedComplexes = hasAssignments
            ? allComplexes.filter((complex) => {
                const complexId = String(complex.id ?? '');
                return this.assignedComplexIds.has(complexId);
              })
            : [];

          const allowedComplexIdSet = new Set(
            allowedComplexes.map((complex) => String(complex.id)),
          );

          const allowedGatedCommunityIds = new Set<string>(
            Array.from(this.assignedCommunityIds).filter((id) => id.length > 0),
          );

          this.ensureStationSelectionRequiredState();

          for (const complex of allowedComplexes) {
            const gatedName = this.normalizeName(complex.gatedCommunityName);
            if (!gatedName) {
              continue;
            }

            const matchedCommunity = allGatedCommunities.find(
              (community) => this.normalizeName(community.name) === gatedName,
            );
            if (matchedCommunity) {
              allowedGatedCommunityIds.add(matchedCommunity.id);
            }
          }

          this.gatedCommunities = allGatedCommunities
            .filter((community) => allowedGatedCommunityIds.has(community.id))
            .map((community) => ({
              ...community,
              complexes: allowedComplexes
                .filter(
                  (complex) =>
                    this.normalizeName(complex.gatedCommunityName) ===
                    this.normalizeName(community.name),
                )
                .map((complex) => ({
                  id: complex.id,
                  name: complex.name,
                  address: complex.address,
                })),
              complexesInCommunity: allowedComplexes
                .filter(
                  (complex) =>
                    this.normalizeName(complex.gatedCommunityName) ===
                    this.normalizeName(community.name),
                )
                .map((complex) => ({
                  id: complex.id,
                  name: complex.name,
                  units: complex.units,
                  address: complex.address,
                })),
            }));

          this.standaloneComplexes = allowedComplexes
            .filter((complex) => !this.normalizeName(complex.gatedCommunityName))
            .map((complex) => ({ id: complex.id, name: complex.name, address: complex.address }));

          this.assignedComplexes = allowedComplexes.map((complex) => ({
            id: complex.id,
            name: complex.name,
            units: complex.units,
            address: complex.address,
          }));

          this.syncGatedComplexSelection();

          const tenantUserById = new Map<string, any>();
          for (const user of userList) {
            if (!this.hasTenantRole(user?.type)) {
              continue;
            }
            const userId = String(user?._id ?? user?.id ?? '').trim();
            if (!userId) {
              continue;
            }
            tenantUserById.set(userId, user);
          }

          const tenantLocationByUserId = new Map<
            string,
            {
              complexId: string;
              gatedCommunityId: string;
              houseNumber: string;
              unit: string;
            }
          >();

          for (const unit of unitList) {
            const complexId = this.normalizeStationId(unit?.complex?._id ?? unit?.complex?.id);
            const gatedCommunityId = this.normalizeStationId(
              unit?.gatedCommunity?._id ?? unit?.gatedCommunity?.id,
            );
            const unitNumberRaw = unit?.number;
            const normalizedUnitNumber = String(unitNumberRaw ?? '').trim();

            const linkedUsers = Array.isArray(unit?.users) ? unit.users : [];
            for (const linkedUser of linkedUsers) {
              const linkedUserId = String(
                linkedUser && typeof linkedUser === 'object'
                  ? ((linkedUser as any)?._id ?? (linkedUser as any)?.id ?? '')
                  : (linkedUser ?? ''),
              ).trim();

              if (!linkedUserId) {
                continue;
              }

              const previous = tenantLocationByUserId.get(linkedUserId);
              const unitValue = normalizedUnitNumber || previous?.unit || '';
              const houseNumberValue =
                (!complexId && normalizedUnitNumber) || previous?.houseNumber || '';

              tenantLocationByUserId.set(linkedUserId, {
                complexId: complexId || previous?.complexId || '',
                gatedCommunityId: gatedCommunityId || previous?.gatedCommunityId || '',
                houseNumber: houseNumberValue,
                unit: unitValue,
              });
            }
          }

          this.residents = userList
            .filter((user) => this.hasTenantRole(user?.type))
            .map((user) => {
              const userId = String(user?._id ?? user?.id ?? '').trim();
              const linkedTenantLocation = userId ? tenantLocationByUserId.get(userId) : null;

              return {
                id: userId,
                name: `${user.name ?? ''} ${user.surname ?? ''}`.trim(),
                unit:
                  linkedTenantLocation?.unit ??
                  user.unit ??
                  user.address ??
                  user.unitNumber ??
                  user.houseNumber ??
                  '',
                houseNumber: linkedTenantLocation?.houseNumber ?? user.houseNumber ?? '',
                cellphone: user.cellNumber ?? '',
                emailAddress: user.emailAddress ?? '',
                photoDataUrl: user.profilePhoto ?? '',
                complexId:
                  linkedTenantLocation?.complexId ??
                  this.normalizeStationId(user.complex?._id ?? user.complex?.id),
                gatedCommunityId:
                  linkedTenantLocation?.gatedCommunityId ??
                  this.normalizeStationId(
                    user.communityId ?? user.gatedCommunity?._id ?? user.gatedCommunity?.id,
                  ),
              };
            })
            .filter((resident) => {
              if (!hasAssignments) {
                return false;
              }
              const inComplex =
                resident.complexId && allowedComplexIdSet.has(String(resident.complexId));
              const inCommunity =
                resident.gatedCommunityId &&
                allowedGatedCommunityIds.has(String(resident.gatedCommunityId));
              return Boolean(inComplex || inCommunity);
            });

          const tenantVehiclesFromUsers = userList
            .filter((user) => this.hasTenantRole(user?.type))
            .flatMap((user) => {
              const userId = String(user?._id ?? user?.id ?? '').trim();
              const linkedTenantLocation = userId ? tenantLocationByUserId.get(userId) : null;
              const ownerName = `${user?.name ?? ''} ${user?.surname ?? ''}`.trim();
              const unit =
                linkedTenantLocation?.unit ??
                user?.unit ??
                user?.address ??
                user?.unitNumber ??
                user?.houseNumber ??
                '';
              const houseNumber = linkedTenantLocation?.houseNumber ?? user?.houseNumber ?? '';
              const complexId =
                linkedTenantLocation?.complexId ??
                this.normalizeStationId(user?.complex?._id ?? user?.complex?.id);
              const gatedCommunityId =
                linkedTenantLocation?.gatedCommunityId ??
                this.normalizeStationId(
                  user?.communityId ?? user?.gatedCommunity?._id ?? user?.gatedCommunity?.id,
                );

              const userVehicles = Array.isArray(user?.vehicles) ? user.vehicles : [];
              return userVehicles.map((vehicle: any) => ({
                make: vehicle?.make ?? '',
                model: vehicle?.model ?? '',
                regNumber:
                  vehicle?.reg ??
                  vehicle?.regNumber ??
                  vehicle?.registrationNumber ??
                  vehicle?.registerationNumber ??
                  '',
                color: vehicle?.color ?? '',
                unit,
                houseNumber,
                owner: ownerName,
                complexId,
                gatedCommunityId,
              }));
            });

          const vehiclesFromVehicleCollection = vehicleList.map((vehicle) => {
            const linkedUserId = String(vehicle?.user?._id ?? vehicle?.user?.id ?? '').trim();
            const linkedTenant = linkedUserId ? tenantUserById.get(linkedUserId) : null;
            const linkedTenantLocation = linkedUserId
              ? tenantLocationByUserId.get(linkedUserId)
              : null;

            const resolvedUnit =
              linkedTenantLocation?.unit ??
              linkedTenant?.unit ??
              linkedTenant?.address ??
              linkedTenant?.unitNumber ??
              linkedTenant?.houseNumber ??
              vehicle?.unit ??
              vehicle?.user?.unit ??
              vehicle?.user?.address ??
              vehicle?.user?.unitNumber ??
              vehicle?.user?.houseNumber ??
              '';

            const resolvedHouseNumber =
              linkedTenantLocation?.houseNumber ??
              linkedTenant?.houseNumber ??
              vehicle?.user?.houseNumber ??
              '';

            const resolvedOwner =
              `${linkedTenant?.name ?? vehicle?.user?.name ?? ''} ${linkedTenant?.surname ?? vehicle?.user?.surname ?? ''}`.trim();

            return {
              make: vehicle.make ?? '',
              model: vehicle.model ?? '',
              regNumber:
                vehicle.reg ??
                vehicle.registrationNumber ??
                vehicle.registerationNumber ??
                vehicle.regNumber ??
                '',
              color: vehicle.color ?? '',
              unit: resolvedUnit,
              houseNumber: resolvedHouseNumber,
              owner: resolvedOwner,
              complexId:
                linkedTenantLocation?.complexId ??
                this.normalizeStationId(
                  linkedTenant?.complex?._id ??
                    linkedTenant?.complex?.id ??
                    vehicle?.user?.complex?._id ??
                    vehicle?.user?.complex?.id,
                ),
              gatedCommunityId:
                linkedTenantLocation?.gatedCommunityId ??
                this.normalizeStationId(
                  linkedTenant?.communityId ??
                    linkedTenant?.gatedCommunity?._id ??
                    linkedTenant?.gatedCommunity?.id ??
                    vehicle?.user?.communityId ??
                    vehicle?.user?.gatedCommunity?._id ??
                    vehicle?.user?.gatedCommunity?.id,
                ),
            };
          });

          const mergedVehiclesMap = new Map<
            string,
            {
              make: string;
              model: string;
              regNumber: string;
              color: string;
              unit: string;
              houseNumber: string;
              owner: string;
              complexId: string;
              gatedCommunityId: string;
            }
          >();

          for (const vehicle of [...vehiclesFromVehicleCollection, ...tenantVehiclesFromUsers]) {
            const key = this.normalizeName(vehicle.regNumber);
            if (!key) {
              continue;
            }
            if (!mergedVehiclesMap.has(key)) {
              mergedVehiclesMap.set(key, vehicle);
            }
          }

          this.vehicles = Array.from(mergedVehiclesMap.values()).filter((vehicle) => {
            if (!hasAssignments) {
              return false;
            }
            const inComplex =
              vehicle.complexId && allowedComplexIdSet.has(String(vehicle.complexId));
            const inCommunity =
              vehicle.gatedCommunityId &&
              allowedGatedCommunityIds.has(String(vehicle.gatedCommunityId));
            return Boolean(inComplex || inCommunity);
          });

          // Update filtered lists to show all residents and vehicles by default
          this.updateFilteredLists();

          this.visitorList.update(() =>
            this.visitorList()
              .filter((visitor: { validity?: boolean }) => visitor.validity === true)
              .filter((visitor: any, index: number, list: any[]) => {
                const visitorId = String(visitor?._id ?? visitor?.id ?? '').trim();
                const code = String(visitor?.code ?? '').trim();

                if (visitorId) {
                  return (
                    index ===
                    list.findIndex(
                      (item: any) => String(item?._id ?? item?.id ?? '').trim() === visitorId,
                    )
                  );
                }

                if (code) {
                  return (
                    index ===
                    list.findIndex((item: any) => String(item?.code ?? '').trim() === code)
                  );
                }

                return true;
              }),
          );

          if (this.stationType === 'complex') {
            this.visitorList.update(() =>
              this.visitorList().filter(
                (visitors) => visitors.destination.complex?.name === this.selectedStationName,
              ),
            );
          } else {
            this.visitorList.update(() =>
              this.visitorList().filter(
                (visitors) =>
                  visitors.destination.gatedCommunity?.name === this.selectedStationName,
              ),
            );
          }

          this.stationContextReady = true;
          this.ensureStationSelectionRequiredState();
          console.log('[GuardPortal][data] station and view state', {
            stationType: this.stationType,
            selectedComplex: this.filtersForm.selectedComplex,
            selectedGatedCommunity: this.filtersForm.selectedGatedCommunity,
            selectedStationName: this.selectedStationName,
            showStationPrompt: this.showStationPrompt,
            showVehicles: this.showVehicles,
            showResidents: this.showResidents,
            showCodes: this.showCodes,
          });
          this.cdr.markForCheck();
        },
      );
    this.submitting.update(() => false);
  }

  private applyStationFromCurrentShiftState(): void {
    this.applyActiveShiftStation(this.pendingActiveShift);
    this.ensureStationSelectionRequiredState();

    if (this.pendingActiveShift === undefined) {
      this.restoreStationSelection();
      return;
    }

    if (this.pendingActiveShift) {
      this.restoreStationSelection();
      this.applyActiveShiftStation(this.pendingActiveShift);
      return;
    }

    if (this.hasValidStationSelection() && this.isWithinShiftWindow(this.currentShiftStartAt)) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    this.activeShiftId = '';
    this.activeShiftStationName = '';
    this.currentShiftStartAt = null;
    this.stationLocked = false;
    this.showStationPrompt = true;
  }

  private isWithinShiftWindow(startAt: Date | null): boolean {
    if (!startAt) {
      return false;
    }

    const shiftStart = startAt.getTime();
    if (Number.isNaN(shiftStart)) {
      return false;
    }

    const elapsed = Date.now() - shiftStart;
    if (elapsed < 0) {
      return false;
    }

    return elapsed <= this.shiftWindowHours * 60 * 60 * 1000;
  }

  private applyActiveShiftStation(activeShift: any): void {
    const stationType = activeShift?.station?.type;
    const isStationTypeValid = stationType === 'gated' || stationType === 'complex';

    if (!isStationTypeValid) {
      this.activeShiftId = '';
      this.changeStation();
      return;
    }

    const stationName = String(activeShift?.station?.name ?? '').trim();
    let selectedGatedCommunity =
      this.normalizeStationId(activeShift?.station?.gatedCommunityId) ||
      this.filtersForm.selectedGatedCommunity;
    let selectedComplex =
      this.normalizeStationId(activeShift?.station?.complexId) || this.filtersForm.selectedComplex;

    if (stationType === 'gated' && (!selectedGatedCommunity || !selectedComplex)) {
      const resolved = this.resolveGatedStationSelectionFromName(stationName);
      if (!selectedGatedCommunity && resolved.gatedCommunityId) {
        selectedGatedCommunity = resolved.gatedCommunityId;
      }
      if (!selectedComplex && resolved.complexId) {
        selectedComplex = resolved.complexId;
      }
    }

    if (stationType === 'complex' && !selectedComplex) {
      const matchedComplex = this.assignedComplexes.find(
        (complex) => this.normalizeName(complex.name) === this.normalizeName(stationName),
      );
      if (matchedComplex?.id) {
        selectedComplex = matchedComplex.id;
      }
    }

    this.activeShiftId = this.normalizeStationId(activeShift?._id);
    const shiftStart = new Date(activeShift?.startShift ?? '');
    this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
    this.stationType = stationType;
    this.activeShiftStationName = stationName;
    this.filtersForm.selectedGatedCommunity = selectedGatedCommunity;
    this.filtersForm.selectedComplex = selectedComplex;
    this.syncGatedComplexSelection();
    this.applyStationSelectionSearchFields();
    this.stationLocked = true;
    this.showStationPrompt = false;
    this.persistStationSelection();
    this.ensureStationSelectionRequiredState();
  }

  private resolveGatedStationSelectionFromName(stationName: string): {
    gatedCommunityId: string;
    complexId: string;
  } {
    const normalizedStationName = String(stationName ?? '').trim();
    if (!normalizedStationName) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const parts = normalizedStationName
      .split(' - ')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    if (parts.length < 2) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const gatedName = parts[parts.length - 1];
    const complexName = parts.slice(0, parts.length - 1).join(' - ');

    const matchedCommunity = this.gatedCommunities.find(
      (community) => this.normalizeName(community.name) === this.normalizeName(gatedName),
    );

    if (!matchedCommunity) {
      return { gatedCommunityId: '', complexId: '' };
    }

    const matchedComplex = (matchedCommunity.complexesInCommunity ?? []).find(
      (complex) => this.normalizeName(complex.name) === this.normalizeName(complexName),
    );

    return {
      gatedCommunityId: matchedCommunity.id,
      complexId: matchedComplex?.id ?? '',
    };
  }

  private hasValidStationSelection(): boolean {
    if (this.stationType === 'gated') {
      return this.filtersForm.selectedGatedCommunity.length > 0;
    }

    if (this.stationType === 'complex') {
      return this.filtersForm.selectedComplex.length > 0;
    }

    return false;
  }

  private ensureStationSelectionRequiredState(): void {
    if (this.activeShiftStationName && this.isWithinShiftWindow(this.currentShiftStartAt)) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    if (this.hasValidStationSelection()) {
      this.stationLocked = true;
      this.showStationPrompt = false;
      return;
    }

    this.stationLocked = false;
    this.showStationPrompt = true;
  }

  private normalizeStationId(value: unknown): string {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      const maybeId = value as {
        $oid?: unknown;
        _id?: unknown;
        toHexString?: () => string;
        toString?: () => string;
      };
      if (typeof maybeId.toHexString === 'function') {
        return maybeId.toHexString();
      }

      if (maybeId.$oid) {
        return String(maybeId.$oid);
      }

      if (maybeId._id) {
        return this.normalizeStationId(maybeId._id);
      }

      if (typeof maybeId.toString === 'function') {
        const asString = maybeId.toString();
        if (asString && asString !== '[object Object]') {
          return asString;
        }
      }
    }

    return '';
  }

  private formatExpiryLabel(expiry: unknown): string {
    if (!expiry) {
      return '';
    }
    const expiryDate = new Date(expiry as string);
    if (Number.isNaN(expiryDate.getTime())) {
      return '';
    }
    const diffMs = expiryDate.getTime() - Date.now();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      return 'Expired';
    }
    return `In ${diffHours} hours`;
  }

  protected openTenantModal(): void {
    if (!this.canRegisterTenant) {
      return;
    }

    if (!this.hasValidStationSelection()) {
      this.tenantError = 'Select your current station before registering a tenant.';
      this.tenantSuccess = '';
      return;
    }

    this.isTenantModalOpen = true;
    this.tenantError = '';
    this.tenantSuccess = '';
    this.tenantSubmitting = false;
    this.resetTenantForm();
  }

  protected closeTenantModal(): void {
    this.isTenantModalOpen = false;
    this.tenantSubmitting = false;
    this.resetTenantForm();
  }

  protected openDeleteTenantModal(resident: any): void {
    if (!this.canRegisterTenant || this.deletingTenant) {
      return;
    }

    const tenantId = String(resident?.id ?? '').trim();
    if (!tenantId) {
      this._snackBar.open('Tenant record is missing an id. Reload and try again.', 'close', {
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      return;
    }

    this.selectedTenantToDelete = {
      email: String(resident?.email ?? '').trim(),
      id: tenantId,
      name: String(resident?.name ?? '').trim(),
      unit: String(resident?.unit ?? '').trim(),
    };
    this.isDeleteTenantModalOpen = true;
  }

  protected closeDeleteTenantModal(): void {
    if (this.deletingTenant) {
      return;
    }

    this.isDeleteTenantModalOpen = false;
    this.selectedTenantToDelete = null;
  }

  protected confirmDeleteTenant(): void {
    if (this.deletingTenant) {
      return;
    }

    const tenantId = String(this.selectedTenantToDelete?.id ?? '').trim();
    if (!tenantId) {
      this.closeDeleteTenantModal();
      return;
    }

    this.deletingTenant = true;
    this.submitting.update(() => true);

    this.dataService.delete<ResponseBody>(`user/tenant/${tenantId}`).subscribe({
      next: (response) => {
        this._snackBar.open(response?.message ?? 'Tenant deleted successfully!', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });

        this.isDeleteTenantModalOpen = false;
        this.selectedTenantToDelete = null;
        this.deletingTenant = false;
        this.submitting.update(() => false);
        this.loadGuardPortalData();
      },
      error: (error: HttpErrorResponse) => {
        this._snackBar.open(error?.error?.message ?? 'Unable to delete tenant.', 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });

        this.deletingTenant = false;
        this.submitting.update(() => false);
      },
    });
  }

  protected submitTenantForm(): void {
    if (this.tenantSubmitting) {
      return;
    }

    this.tenantSubmitting = true;
    this.tenantError = '';
    this.tenantSuccess = 'Registering tenant...';
    this.submitting.update(() => true);
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
      id: `tenant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    };

    const normalizedTenantEmail = tenantData.email.trim().toLowerCase();
    const existingTenant = this.residents.find(
      (resident) => resident.emailAddress?.trim().toLowerCase() === normalizedTenantEmail,
    );
    if (existingTenant) {
      this.tenantError = 'A tenant with this email already exists.';
      this.tenantSuccess = '';
      this.tenantSubmitting = false;
      this.submitting.update(() => false);
      return;
    }

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
      complexName: selectedComplexForTenant?.name ?? '',
      communityId: tenantData.communityId,
      communityResidenceType: tenantData.communityResidenceType,
      communityComplexId: tenantData.communityComplexId,
      vehicles: tenantData.vehicles,
    };
    console.log(payload);
    this.dataService.post<ResponseBody>('user/tenant', payload).subscribe({
      next: (response) => {
        const emailSent = response?.payload?.emailSent !== false;
        const successMessage = emailSent
          ? `${response.message} Login credentials were sent by email.`
          : `${response.message} Tenant created, but credentials email was not confirmed.`;

        this._snackBar.open(successMessage, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.tenantSuccess = successMessage;

        setTimeout(() => {
          this.tenantSubmitting = false;
          this.submitting.update(() => false);
          this.closeTenantModal();
          this.loadGuardPortalData();
        }, 1500);
      },
      error: (error: HttpErrorResponse) => {
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
  }

  protected addVehicle(): void {
    this.submitting.update(() => true);
    if (!this.currentVehicle.make || !this.currentVehicle.model || !this.currentVehicle.reg) {
      this.tenantError = 'Please fill in vehicle make, model, and registration number.';
      this.submitting.update(() => false);
      return;
    }

    if (
      this.tenantForm.vehicles.some(
        (vehicle) => vehicle.reg.toLowerCase() === this.currentVehicle.reg.trim().toLowerCase(),
      )
    ) {
      this.tenantError = 'A vehicle with this registration number is already added.';
      this.submitting.update(() => false);
      return;
    }

    this.tenantForm.vehicles.push({
      make: this.currentVehicle.make.trim(),
      model: this.currentVehicle.model.trim(),
      reg: this.currentVehicle.reg.trim(),
      color: this.currentVehicle.color.trim(),
    });

    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };
    this.tenantError = '';
    this.submitting.update(() => false);
  }

  protected removeVehicle(index: number): void {
    this.tenantForm.vehicles.splice(index, 1);
  }

  protected onResidenceTypeChange(): void {
    const availableTypes = this.availableTenantResidenceTypes.map((type) => type.value);
    if (!availableTypes.includes(this.tenantForm.residenceType)) {
      this.tenantForm.residenceType = availableTypes[0] as 'complex' | 'community';
    }

    this.tenantForm.complexId = '';
    this.tenantForm.communityId = '';
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onComplexChange(): void {
    this.tenantForm.address = '';
  }

  protected onCommunityChange(): void {
    const availableTypes = this.availableCommunityResidenceTypes;
    this.tenantForm.communityResidenceType = availableTypes.includes('house')
      ? 'house'
      : (availableTypes[0] ?? 'house');
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityResidenceTypeChange(): void {
    this.tenantForm.communityComplexId = '';
    this.tenantForm.address = '';
  }

  protected onCommunityComplexChange(): void {
    this.tenantForm.address = '';
  }

  protected get availableTenantResidenceTypes(): Array<{
    value: 'complex' | 'community';
    label: string;
  }> {
    const key = `${this.stationType}|${this.filtersForm.selectedComplex}|${this.filtersForm.selectedGatedCommunity}`;
    if (this.availableTenantResidenceTypesKey === key) {
      return this.availableTenantResidenceTypesCache;
    }

    const types: Array<{ value: 'complex' | 'community'; label: string }> = [];

    if (this.stationType === 'complex' && this.filtersForm.selectedComplex) {
      types.push({ value: 'complex', label: 'Complex/Apartment' });
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      types.push({ value: 'community', label: 'Gated Community' });
    }

    this.availableTenantResidenceTypesCache = types;
    this.availableTenantResidenceTypesKey = key;
    return this.availableTenantResidenceTypesCache;
  }

  protected get availableCommunityResidenceTypes(): Array<'house' | 'complex'> {
    const key = `${this.tenantForm.communityId}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableCommunityResidenceTypesKey === key) {
      return this.availableCommunityResidenceTypesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    const community = this.gatedCommunities.find((item) => item.id === this.tenantForm.communityId);
    if (!community) {
      this.availableCommunityResidenceTypesCache = ['house', 'complex'];
      this.availableCommunityResidenceTypesKey = key;
      return this.availableCommunityResidenceTypesCache;
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedComplex) {
      this.availableCommunityResidenceTypesCache = ['complex'];
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

  protected get availableUnits(): string[] {
    const key = `${this.tenantForm.complexId}|${this.stationScopedComplexes.length}`;
    if (this.availableUnitsKey === key) {
      return this.availableUnitsCache;
    }

    if (!this.tenantForm.complexId) {
      this.availableUnitsCache = [];
      this.availableUnitsKey = key;
      return this.availableUnitsCache;
    }

    const complex = this.stationScopedComplexes.find(
      (item) => item.id === this.tenantForm.complexId,
    );
    this.availableUnitsCache = complex?.units ?? [];
    this.availableUnitsKey = key;
    return this.availableUnitsCache;
  }

  protected get availableHouses(): string[] {
    const key = `${this.tenantForm.communityId}|${this.stationType}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableHousesKey === key) {
      return this.availableHousesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableHousesCache = [];
      this.availableHousesKey = key;
      return this.availableHousesCache;
    }

    const community = this.stationScopedCommunities.find(
      (item) => item.id === this.tenantForm.communityId,
    );
    if (this.stationType === 'gated' && this.filtersForm.selectedComplex) {
      this.availableHousesCache = [];
      this.availableHousesKey = key;
      return this.availableHousesCache;
    }

    this.availableHousesCache = community?.houses ?? [];
    this.availableHousesKey = key;
    return this.availableHousesCache;
  }

  protected get availableCommunityComplexes(): Array<{
    id: string;
    name: string;
    units: string[];
    address?: string | null;
  }> {
    const key = `${this.tenantForm.communityId}|${this.stationType}|${this.filtersForm.selectedComplex}|${this.gatedCommunities.length}`;
    if (this.availableCommunityComplexesKey === key) {
      return this.availableCommunityComplexesCache;
    }

    if (!this.tenantForm.communityId) {
      this.availableCommunityComplexesCache = [];
      this.availableCommunityComplexesKey = key;
      return this.availableCommunityComplexesCache;
    }

    const community = this.stationScopedCommunities.find(
      (item) => item.id === this.tenantForm.communityId,
    );
    const communityComplexes = community?.complexesInCommunity ?? [];
    this.availableCommunityComplexesCache =
      this.stationType === 'gated' && this.filtersForm.selectedComplex
        ? communityComplexes.filter((item) => item.id === this.filtersForm.selectedComplex)
        : communityComplexes;
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

    const community = this.gatedCommunities.find((item) => item.id === this.tenantForm.communityId);
    const complex = community?.complexesInCommunity?.find(
      (item) => item.id === this.tenantForm.communityComplexId,
    );
    this.availableCommunityUnitsCache = complex?.units ?? [];
    this.availableCommunityUnitsKey = key;
    return this.availableCommunityUnitsCache;
  }

  protected updateComplexSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.filtersForm.searchComplex = input.value;
    this.showComplexOptions = true;
  }

  protected updateGatedCommunitySearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.filtersForm.searchGatedCommunity = input.value;
    this.showGatedCommunityOptions = true;
  }

  protected updateUnitSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    if (this.unitSearchDisabled) {
      return;
    }
    this.filtersForm.searchUnit = input.value;
    this.showUnitOptions = true;
  }

  protected updateRegSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.filtersForm.searchReg = input.value;
    this.showRegOptions = true;
  }

  protected selectComplex(complexId: string): void {
    this.filtersForm.selectedComplex = complexId;
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchComplex = this.complexes.find((c) => c.id === complexId)?.name || '';
    this.showComplexOptions = false;
    // Reset other searches when complex changes
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
  }

  protected selectGatedCommunity(gatedCommunityId: string): void {
    this.filtersForm.selectedGatedCommunity = gatedCommunityId;
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchGatedCommunity =
      this.gatedCommunities.find((g) => g.id === gatedCommunityId)?.name || '';
    this.filtersForm.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches when gated community changes
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
  }

  protected clearGatedCommunity(): void {
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchGatedCommunity = '';
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.showGatedCommunityOptions = false;
    // Reset other searches
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
  }

  protected setUnitDropdown(visible: boolean): void {
    this.showUnitOptions = visible;
  }

  protected setRegDropdown(visible: boolean): void {
    this.showRegOptions = visible;
  }

  protected setComplexDropdown(visible: boolean): void {
    this.showComplexOptions = visible;
  }

  protected setGatedCommunityDropdown(visible: boolean): void {
    this.showGatedCommunityOptions = visible;
  }

  protected chooseStationType(type: 'gated' | 'complex'): void {
    this.stationType = type;
    if (type === 'gated') {
      this.filtersForm.selectedComplex = '';
      this.filtersForm.searchComplex = '';
    } else {
      this.filtersForm.selectedGatedCommunity = '';
      this.filtersForm.searchGatedCommunity = '';
      this.filtersForm.selectedComplex = '';
    }
  }

  protected onStationGatedChange(): void {
    this.syncGatedComplexSelection();
  }

  private syncGatedComplexSelection(): void {
    if (this.stationType !== 'gated') {
      return;
    }

    if (!this.filtersForm.selectedComplex) {
      return;
    }

    const selectedCommunity = this.gatedCommunities.find(
      (community) => community.id === this.filtersForm.selectedGatedCommunity,
    );

    if (!selectedCommunity) {
      return;
    }

    const availableComplexIds = new Set(
      (selectedCommunity.complexesInCommunity ?? []).map((complex) => String(complex.id ?? '')),
    );

    if (availableComplexIds.has(this.filtersForm.selectedComplex)) {
      return;
    }

    const restoredNameKey = this.normalizeName(this.restoredStationComplexName);
    if (restoredNameKey) {
      const matchedByName = (selectedCommunity.complexesInCommunity ?? []).find(
        (complex) => this.normalizeName(complex.name) === restoredNameKey,
      );

      if (matchedByName?.id) {
        this.filtersForm.selectedComplex = String(matchedByName.id);
        return;
      }
    }

    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.filtersForm.searchComplexFilter = '';
  }

  private resolveSelectedComplexNameForStationCache(): string {
    if (!this.filtersForm.selectedComplex) {
      return '';
    }

    return (
      this.assignedComplexes.find((complex) => complex.id === this.filtersForm.selectedComplex)
        ?.name ??
      this.complexes.find((complex) => complex.id === this.filtersForm.selectedComplex)?.name ??
      ''
    );
  }

  protected confirmStationSelection(): void {
    if (!this.stationSelectionReady) {
      this.ensureStationSelectionRequiredState();
      return;
    }

    this.applyStationSelectionSearchFields();

    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.activeShiftStationName = this.selectedStationName;
    this.showStationPrompt = false;
    this.stationLocked = true;
    this.persistStationSelection();
    this.saveGuardHistoryShift();
    this.ensureStationSelectionRequiredState();
    this.dataService.get<ResponseBody>(`visitor/security/`).subscribe({
      next: (res) => {
        this.visitorList.update(() => res.payload as visitorDTO[])
        if (this.stationType === 'complex') {
            this.visitorList.update(() =>
              this.visitorList().filter(
                (visitors) => visitors.destination.complex?.name === this.activeShiftStationName,
              ),
            );
          } else {
            this.visitorList.update(() =>
              this.visitorList().filter(
                (visitors) =>
                  visitors.destination.gatedCommunity?.name === this.activeShiftStationName,
              ),
            );
          }
      }
    })
  }

  protected changeStation(): void {
    this.stationLocked = false;
    this.showStationPrompt = true;
    console.log('DEBUG: changeStation called, showStationPrompt =', this.showStationPrompt);
    this.activeShiftStationName = '';
    this.stationType = '';
    this.filtersForm.selectedGatedCommunity = '';
    this.filtersForm.searchGatedCommunity = '';
    this.filtersForm.selectedComplex = '';
    this.filtersForm.searchComplex = '';
    this.filtersForm.searchUnit = '';
    this.filtersForm.searchCode = '';
    this.filtersForm.searchReg = '';
    this.filtersForm.searchComplexFilter = '';
    this.clearStationSelection();
  }

  searchTerm = signal('');

  filteredVisitors = computed(() => {
    const code = this.searchTerm();
    return this.visitorList().filter((x) => x.code?.toString().includes(code));
  });
  // Prototype
  filterCodes(event: any) {
    this.searchTerm.set(event.target.value);
  }

  private persistStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const selectedComplexName = this.resolveSelectedComplexNameForStationCache();
    this.restoredStationComplexName = selectedComplexName;

    const payload = {
      stationType: this.stationType,
      selectedGatedCommunity: this.filtersForm.selectedGatedCommunity,
      selectedComplex: this.filtersForm.selectedComplex,
      selectedComplexName,
      activeShiftId: this.activeShiftId,
      shiftStartedAt: this.currentShiftStartAt?.toISOString() ?? '',
    };
    window.localStorage.setItem(this.stationStorageKey, JSON.stringify(payload));
  }

  private restoreStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const raw = window.localStorage.getItem(this.stationStorageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        stationType?: 'gated' | 'complex' | '';
        selectedGatedCommunity?: string;
        selectedComplex?: string;
        selectedComplexName?: string;
        activeShiftId?: string;
        shiftStartedAt?: string;
      };

      if (!parsed.stationType) {
        return;
      }

      this.stationType = parsed.stationType;
      this.filtersForm.selectedGatedCommunity = parsed.selectedGatedCommunity ?? '';
      this.filtersForm.selectedComplex = parsed.selectedComplex ?? '';
      this.restoredStationComplexName = String(parsed.selectedComplexName ?? '').trim();
      this.activeShiftId = parsed.activeShiftId ?? '';
      const shiftStart = new Date(parsed.shiftStartedAt ?? '');
      this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;

      this.syncGatedComplexSelection();
      this.applyStationSelectionSearchFields();

      this.showStationPrompt = false;
      this.stationLocked = true;
    } catch {
      this.clearStationSelection();
    }
  }

  private applyStationSelectionSearchFields(): void {
    if (this.stationType === 'gated') {
      this.filtersForm.searchGatedCommunity = this.selectedGatedCommunityName;
      this.filtersForm.searchComplex = this.filtersForm.selectedComplex
        ? this.selectedComplexName
        : '';
      this.filtersForm.searchComplexFilter = this.filtersForm.selectedComplex || '';
      return;
    }

    if (this.stationType === 'complex') {
      this.filtersForm.searchComplex = this.selectedComplexName;
      this.filtersForm.selectedGatedCommunity = '';
      this.filtersForm.searchGatedCommunity = '';
      this.filtersForm.searchComplexFilter = '';
    }
  }

  private clearStationSelection(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.currentShiftStartAt = null;
    window.localStorage.removeItem(this.stationStorageKey);
  }

  private saveGuardHistoryShift(): void {
    this.submitting.update(() => true);
    const stationName = this.selectedStationName;
    if (!this.hasValidStationSelection() || !stationName || stationName === 'Select station') {
      this.ensureStationSelectionRequiredState();
      return;
    }

    const payload = {
      stationType: this.stationType,
      selectedGatedCommunity: this.filtersForm.selectedGatedCommunity || '',
      selectedComplex: this.filtersForm.selectedComplex || '',
      stationName,
    };

    if (this.activeShiftId) {
      this.dataService.put<any>('guardHistory/active/station', payload).subscribe({
        next: (response) => {
          const updatedShiftId = this.normalizeStationId(response?.payload?._id);
          if (updatedShiftId) {
            this.activeShiftId = updatedShiftId;
          }
          const shiftStart = new Date(response?.payload?.startShift ?? '');
          if (!Number.isNaN(shiftStart.getTime())) {
            this.currentShiftStartAt = shiftStart;
          }
          this.persistStationSelection();
          this.submitting.update(() => false);
        },
        error: (error) => {
          this._snackBar.open(error.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.activeShiftId = '';
          this.dataService.post<any>('guardHistory/start', payload).subscribe({
            next: (response) => {
              this._snackBar.open(response.message, 'close', {
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
              });
              this.activeShiftId = this.normalizeStationId(response?.payload?._id);
              const shiftStart = new Date(response?.payload?.startShift ?? '');
              this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
              this.persistStationSelection();
            },
            error: () => undefined,
          });
        },
      });
      this.submitting.update(() => false);
      return;
    }

    this.dataService.post<any>('guardHistory/start', payload).subscribe({
      next: (response) => {
        this._snackBar.open(response.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.activeShiftId = this.normalizeStationId(response?.payload?._id);
        const shiftStart = new Date(response?.payload?.startShift ?? '');
        this.currentShiftStartAt = Number.isNaN(shiftStart.getTime()) ? null : shiftStart;
        this.persistStationSelection();
      },
      error: () => {
        this.submitting.update(() => false);
      },
    });
  }

  protected get filteredComplexOptions(): string[] {
    const list = this.complexes.map((c) => c.name);
    const query = this.filtersForm.searchComplex.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected get filteredGatedCommunityOptions(): string[] {
    const list = this.gatedCommunities.map((g) => g.name);
    const query = this.filtersForm.searchGatedCommunity.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((name) => name.toLowerCase().includes(query));
  }

  protected clearOtherSearches(activeField: 'unit' | 'reg' | 'code'): void {
    // Always show all sections
    this.showCodes = true;
    this.showResidents = true;
    this.showVehicles = true;
    if (activeField === 'unit') {
      this.filtersForm.searchCode = '';
      this.filtersForm.searchReg = '';
      this.showRegOptions = false;
    } else if (activeField === 'reg') {
      this.filtersForm.searchCode = '';
      this.filtersForm.searchUnit = '';
      this.showUnitOptions = false;
    } else if (activeField === 'code') {
      this.filtersForm.searchUnit = '';
      this.filtersForm.searchReg = '';
      this.showUnitOptions = false;
      this.showRegOptions = false;
    }
  }

  protected selectUnit(unit: string): void {
    this.filtersForm.searchUnit = unit;
    this.showUnitOptions = false;
  }

  protected onSearchComplexFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) {
      return;
    }
    this.filtersForm.searchComplexFilter = select.value;
    this.filtersForm.searchUnit = '';
    this.showUnitOptions = false;
  }

  protected selectReg(reg: string): void {
    this.filtersForm.searchReg = reg;
    this.showRegOptions = false;
  }

  protected get filteredUnitOptions(): string[] {
    let residents = Array.isArray(this.residents) ? this.residents : [];
    let vehicles = Array.isArray(this.vehicles) ? this.vehicles : [];
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      residents = residents.filter((r) => r.complexId === complexFilter);
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      residents = residents.filter(
        (r) => r.gatedCommunityId === this.filtersForm.selectedGatedCommunity,
      );
      vehicles = vehicles.filter(
        (v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity,
      );
    }
    const units = new Set<string>([
      ...residents.map((resident) =>
        this.resolveResidenceNumber(resident.unit, resident.houseNumber),
      ),
      ...vehicles.map((vehicle) => this.resolveResidenceNumber(vehicle.unit, vehicle.houseNumber)),
    ]);
    const list = Array.from(units).sort();
    const query = this.filtersForm.searchUnit.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((unit) => unit.toLowerCase().includes(query));
  }

  protected get filteredRegOptions() {
    let vehicles = Array.isArray(this.vehicles) ? this.vehicles : [];
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;

    // Filter by complex or gated community
    if (complexFilter) {
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter(
        (v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity,
      );
      this.visitorList.update(() =>
        this.visitorList().filter(
          (c) => c.destination.gatedCommunity?._id === this.filtersForm.selectedGatedCommunity,
        ),
      );
    }

    return vehicles;
  }

  protected get filteredVisitorsForUnit() {
    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    this.visitorList.update(() =>
      this.visitorList().map((code) => ({
        ...code,
        unit: this.resolveResidenceNumber(
          code.destination.complex?.name,
          code.destination.gatedCommunity?.name,
        ),
      })),
    );

    if (!unitQuery) {
      return [];
    }
    this.visitorList.update(() =>
      this.visitorList().filter((code) =>
        code.destination.complex?.name.toLowerCase().includes(unitQuery),
      ),
    );

    return [];
  }

  protected get filteredVehicles() {
    const complexFilter = this.filtersForm.searchComplexFilter || this.filtersForm.selectedComplex;
    let vehicles = this.vehicles;
    // Filter by complex or gated community
    if (complexFilter) {
      vehicles = vehicles.filter((v) => v.complexId === complexFilter);
    } else if (this.filtersForm.selectedGatedCommunity) {
      vehicles = vehicles.filter(
        (v) => v.gatedCommunityId === this.filtersForm.selectedGatedCommunity,
      );
    }

    const unitQuery = this.filtersForm.searchUnit.trim().toLowerCase();
    const regQuery = this.filtersForm.searchReg.trim().toLowerCase();

    // Merge and deduplicate by regNumber
    const mappedVehicles = vehicles.map((vehicle) => ({
      ...vehicle,
      unit: this.resolveResidenceNumber(vehicle.unit, vehicle.houseNumber),
      isVisitor: false,
    }));
    let all = [...mappedVehicles];
    const seen = new Set();
    all = all.filter((v) => {
      const key = (v.regNumber || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unitQuery) {
      all = all.filter((vehicle) => (vehicle.unit || '').toLowerCase().includes(unitQuery));
    }
    if (regQuery) {
      all = all.filter((vehicle) => (vehicle.regNumber || '').toLowerCase().includes(regQuery));
    }
    return all;
  }

  protected getResidentInitials(name: string): string {
    return (name || 'Resident').trim().slice(0, 2).toUpperCase();
  }

  protected openResidentPhotoModal(
    photoUrl: string | undefined | null,
    residentName: string,
  ): void {
    const normalizedUrl = String(photoUrl ?? '').trim();
    this.selectedResidentPhotoUrl = normalizedUrl;
    this.selectedResidentInitials = this.getResidentInitials(residentName);
    this.isResidentPhotoModalOpen = true;
  }

  protected closeResidentPhotoModal(): void {
    this.isResidentPhotoModalOpen = false;
    this.selectedResidentPhotoUrl = '';
    this.selectedResidentInitials = '';
  }

  protected openCodeVehicleModal(code: any): void {
    if (!code?.vehicle) {
      return;
    }

    this.selectedCodeVehicle = code.vehicle;
    this.selectedCodeVisitorName = String(code.visitorName ?? '').trim();
    this.isCodeVehicleModalOpen = true;
  }

  protected closeCodeVehicleModal(): void {
    this.isCodeVehicleModalOpen = false;
    this.selectedCodeVehicle = null;
    this.selectedCodeVisitorName = '';
  }

  private resetTenantForm(): void {
    const defaultResidenceType: 'complex' | 'community' =
      this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity
        ? 'community'
        : 'complex';

    const preselectedComplexId =
      this.stationType === 'complex' ? this.filtersForm.selectedComplex : '';

    const preselectedCommunityId =
      this.stationType === 'gated' ? this.filtersForm.selectedGatedCommunity : '';

    const preselectedCommunityResidenceType: 'house' | 'complex' =
      this.stationType === 'gated' && this.filtersForm.selectedComplex ? 'complex' : 'house';

    const preselectedCommunityComplexId =
      this.stationType === 'gated' ? this.filtersForm.selectedComplex : '';

    this.tenantForm = {
      id: '',
      name: '',
      surname: '',
      email: '',
      phone: '',
      idNumber: '',
      residenceType: defaultResidenceType,
      complexId: preselectedComplexId,
      communityId: preselectedCommunityId,
      communityResidenceType: preselectedCommunityResidenceType,
      communityComplexId: preselectedCommunityComplexId,
      address: '',
      vehicles: [],
    };

    this.currentVehicle = {
      make: '',
      model: '',
      reg: '',
      color: '',
    };

    this.tenantError = '';
    this.tenantSuccess = '';
  }

  private generateResidenceLabels(
    count: number,
    start: number,
    end: number,
    prefix: 'Unit' | 'House',
  ): string[] {
    const items: string[] = [];

    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
      for (let value = start; value <= end; value++) {
        items.push(`${prefix} ${value}`);
      }
      return items;
    }

    const total = Number.isFinite(count) && count > 0 ? count : 0;
    for (let value = 1; value <= total; value++) {
      items.push(`${prefix} ${value}`);
    }

    return items;
  }

  protected get stationScopedComplexes(): Array<{
    id: string;
    name: string;
    units: string[];
    address?: string | null;
  }> {
    if (this.stationType === 'complex' && this.filtersForm.selectedComplex) {
      return this.assignedComplexes.filter((item) => item.id === this.filtersForm.selectedComplex);
    }

    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      const community = this.gatedCommunities.find(
        (item) => item.id === this.filtersForm.selectedGatedCommunity,
      );
      const complexesInCommunity = new Set(
        (community?.complexesInCommunity ?? []).map((item) => item.id),
      );

      if (this.filtersForm.selectedComplex) {
        return this.assignedComplexes.filter(
          (item) => item.id === this.filtersForm.selectedComplex,
        );
      }

      return this.assignedComplexes.filter((item) => complexesInCommunity.has(item.id));
    }

    return [];
  }

  protected get stationScopedCommunities(): Array<{
    id: string;
    name: string;
    complexes: Array<{ id: string; name: string; address?: string | null }>;
    houses: string[];
    complexesInCommunity: Array<{
      id: string;
      name: string;
      units: string[];
      address?: string | null;
    }>;
  }> {
    if (this.stationType === 'gated' && this.filtersForm.selectedGatedCommunity) {
      return this.gatedCommunities.filter(
        (item) => item.id === this.filtersForm.selectedGatedCommunity,
      );
    }

    return [];
  }

  private isAdminGuard(user: any): boolean {
    const normalize = (value: unknown): string => this.normalizeName(String(value ?? ''));

    const typeEntries = Array.isArray(user?.type) ? user.type : [user?.type];
    const normalizedTypes = typeEntries
      .map((value: unknown) => normalize(value))
      .filter((value: string) => value.length > 0);

    const hasAdminType = normalizedTypes.some(
      (value: string) => value === 'admin' || value === 'adminguard',
    );
    const hasGuardType = normalizedTypes.some(
      (value: string) => value === 'security' || value === 'guard',
    );
    if (hasAdminType && hasGuardType) {
      return true;
    }

    const directPosition = normalize(user?.position);
    if (
      directPosition === 'adminguard' ||
      directPosition === 'admin' ||
      directPosition === 'securityadmin'
    ) {
      return true;
    }

    const contracts = Array.isArray(user?.employeeContracts) ? user.employeeContracts : [];
    for (const contract of contracts) {
      const contractPosition = normalize(contract?.position);
      if (
        contractPosition === 'adminguard' ||
        contractPosition === 'admin' ||
        contractPosition === 'securityadmin'
      ) {
        return true;
      }
    }

    return false;
  }

  private showToast(message: string): void {
    this._snackBar.open(message, 'close', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  protected startSosHold(event: Event): void {
    event.preventDefault();
    if (this.isHoldingSos || this.showSosSuccess) {
      return;
    }

    this.isHoldingSos = true;
    this.clearSosHoldTimer();
    this.sosHoldTimer = window.setTimeout(() => {
      this.zone.run(() => {
        this.triggerSosSuccess();
      });
    }, 5000);
  }

  protected endSosHold(): void {
    if (!this.isHoldingSos) {
      return;
    }
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
  }

  private triggerSosSuccess(): void {
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
    this.sendSosAlert();
    this.showSosSuccess = true;
    this.clearSosAutoCloseTimer();
    this.sosAutoCloseTimer = window.setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  private clearSosHoldTimer(): void {
    if (this.sosHoldTimer !== null) {
      window.clearTimeout(this.sosHoldTimer);
      this.sosHoldTimer = null;
    }
  }

  private clearSosAutoCloseTimer(): void {
    if (this.sosAutoCloseTimer !== null) {
      window.clearTimeout(this.sosAutoCloseTimer);
      this.sosAutoCloseTimer = null;
    }
  }

  private sendSosAlert(): void {
    const guard = this.getCurrentUserFromStorage();
    const stationDetails = this.buildSosStationDetails();
    const payload = {
      date: new Date().toISOString(),
      guard: {
        _id: guard?._id ?? '',
        name: guard?.name ?? this.guardName,
        surname: guard?.surname ?? '',
        emailAddress: guard?.emailAddress ?? '',
        cellNumber: guard?.cellNumber ?? '',
      },
      station: stationDetails,
    };

    this.dataService.post<any>('sos', payload).subscribe({
      next: (response) => {},
      error: (error) => {},
    });
  }

  private getCurrentUserFromStorage(): any | null {
    const rawUser =
      this.storage?.getItem?.('current-user') ??
      (isPlatformBrowser(this.platformId) ? window.localStorage.getItem('current-user') : null);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private buildSosStationDetails(): {
    type: 'complex' | 'gated' | 'unknown';
    name: string;
    complexId: string;
    complexName: string;
    complexAddress: string | null;
    gatedCommunityId: string;
    gatedCommunityName: string;
  } {
    const selectedComplexId = this.filtersForm.selectedComplex;
    const selectedCommunityId = this.filtersForm.selectedGatedCommunity;
    const selectedComplex = this.assignedComplexes.find(
      (complex) => complex.id === selectedComplexId,
    );
    const selectedCommunity = this.gatedCommunities.find(
      (community) => community.id === selectedCommunityId,
    );

    return {
      type: this.stationType || 'unknown',
      name: this.selectedStationName,
      complexId: selectedComplexId || '',
      complexName: selectedComplex?.name ?? '',
      complexAddress: selectedComplex?.address ?? null,
      gatedCommunityId: selectedCommunityId || '',
      gatedCommunityName: selectedCommunity?.name ?? '',
    };
  }

  ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
  }
}
