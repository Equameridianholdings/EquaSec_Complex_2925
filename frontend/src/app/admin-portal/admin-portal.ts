import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
  NgZone,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { SecurityCompanyFormDTO } from '../interfaces/forms/securityCompanyFormDTO';
import { ComplexOnboardingFormDTO } from '../interfaces/forms/complexOnboardingFormDTO';
import { GatedCommunityFormDTO } from '../interfaces/forms/gatedCommunityFormDTO';
import { AssignmentFormDTO } from '../interfaces/forms/assignmentFormDTO';
import { GatedAssignmentFormDTO } from '../interfaces/forms/gatedAssignmentFormDTO';
import { AdminPortalFiltersFormDTO } from '../interfaces/forms/adminPortalFiltersFormDTO';
import { DataService } from '../services/data.service';
import { environment } from '../../environments/environment';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './admin-portal.html',
  styleUrl: './admin-portal.css',
})
export class AdminPortal implements OnInit, AfterViewInit {
  loading = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  constructor(
    private readonly dataService: DataService,
    private readonly ngZone: NgZone,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}
  @ViewChild('complexAddressInput') protected complexAddressInput?: ElementRef<HTMLElement>;
  private addressAutocomplete: any = null;
  private addressAutocompleteInitialized = false;
  private addressAutocompleteElement: HTMLElement | null = null;
  // State for updating a security company
  protected showUpdateSecurityModal = false;
  protected editingSecurityCompany: any = null;
  protected updateSecurityError = '';

  openUpdateSecurityModal(company: any): void {
    this.editingSecurityCompany = { ...company };
    this.showUpdateSecurityModal = true;
    this.updateSecurityError = '';
  }

  closeUpdateSecurityModal(): void {
    this.showUpdateSecurityModal = false;
    this.editingSecurityCompany = null;
    this.updateSecurityError = '';
  }

  submitUpdateSecurity(): void {
    this.loading.update(() => true);
    if (!this.editingSecurityCompany) {
      this.loading.update(() => false);
      return;
    }
    this.updateSecurityError = '';

    const payload = {
      name: this.editingSecurityCompany.companyName?.trim(),
      email: this.editingSecurityCompany.companyEmail?.trim(),
      contactNumber: this.editingSecurityCompany.companyTel?.trim(),
      cipcRegistrationNumber: this.editingSecurityCompany.cipcReg?.trim(),
      psiraNumber: this.editingSecurityCompany.psiraNumber?.trim(),
      sosOptin: Boolean(this.editingSecurityCompany.sosOptin),
    };

    const companyId = this.editingSecurityCompany.companyId;
    if (!companyId) {
      const idx = this.registeredSecurityCompanies.findIndex(
        (c: any) => c.companyName === this.editingSecurityCompany.companyName,
      );
      if (idx > -1) {
        this.registeredSecurityCompanies[idx] = { ...this.editingSecurityCompany };
      }
      this.loading.update(() => false);
      this.closeUpdateSecurityModal();
      return;
    }

    this.dataService.put(`securityCompany/${companyId}`, payload).subscribe({
      next: () => {
        const idx = this.registeredSecurityCompanies.findIndex(
          (c: any) => c.companyId === companyId,
        );
        if (idx > -1) {
          this.registeredSecurityCompanies[idx] = {
            ...this.registeredSecurityCompanies[idx],
            ...this.editingSecurityCompany,
          };
        }
        this.closeUpdateSecurityModal();
        this.triggerToast(
          `Security company "${this.editingSecurityCompany?.companyName}" updated successfully.`,
        );
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }
  /**
   * Delete a complex from onboardedComplexes.
   */
  deleteComplex(complex: any): void {
    this.loading.update(() => true);
    if (!complex?.complexId) {
      this.loading.update(() => false);
      return;
    }
    this.dataService.delete(`complex/${complex.complexId}`).subscribe({
      next: () => {
        this.onboardedComplexes = this.onboardedComplexes.filter(
          (item: any) => item.complexId !== complex.complexId,
        );
        this.registeredSecurityCompanies = this.registeredSecurityCompanies.map((company: any) => {
          if (!company.assignments) {
            return company;
          }
          return {
            ...company,
            assignments: company.assignments.filter(
              (assignment: any) => assignment.complexName !== complex.complexName,
            ),
          };
        });
        this.buildContractHistoryFromCompanies();
        this.triggerToast(`Complex "${complex.complexName}" removed successfully.`);
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }
  // Get the gated community name for a given complex, or null if not assigned
  getGatedCommunityForComplex(complexName: string): string | null {
    const complex = (this.onboardedComplexes || []).find(
      (item: any) => item.complexName === complexName,
    );
    const communityName = String(complex?.gatedCommunityName ?? '').trim();
    return communityName.length > 0 ? communityName : null;
  }
  // Check if a complex in a gated community is assigned to a security company
  isGatedComplexAssigned(complex: any): boolean {
    return Array.isArray(complex.securityAssignments) && complex.securityAssignments.length > 0;
  }

  // Get assignment status string for a complex in a gated community
  getGatedComplexAssignmentStatus(complex: any): string {
    return this.isGatedComplexAssigned(complex) ? 'Assigned' : 'Not Assigned';
  }
  /**
   * Open the Gated Community modal for editing a specific community.
   * If a community is provided, set editingGatedCommunity and prefill form fields.
   * If not, open for adding a new community.
   */
  openGatedCommunityModal(community?: any): void {
    this.showGatedCommunityModal = true;
    if (community) {
      this.editingGatedCommunity = community;
      const derivedHouses =
        typeof community.numberOfHouses === 'number'
          ? community.numberOfHouses
          : Number(community.unitEnd) - Number(community.unitStart) + 1;
      this.gatedCommunityForm = {
        gatedCommunityName: community.gatedCommunityName,
        numberOfHouses: Number.isFinite(derivedHouses) && derivedHouses > 0 ? derivedHouses : '',
        gatedCommunityPrice: community.price,
      };
      this.gatedCommunityError = '';
      this.gatedCommunitySuccess = '';
    } else {
      this.resetGatedCommunityForm();
      this.editingGatedCommunity = null;
    }
  }

  /**
   * Delete a gated community from the list.
   */
  deleteGatedCommunity(community: any): void {
    this.loading.update(() => true);
    if (!community?.gatedCommunityId) {
      this.loading.update(() => false);
      return;
    }
    this.dataService.delete(`gatedCommunity/${community.gatedCommunityId}`).subscribe({
      next: () => {
        this.gatedCommunities = this.gatedCommunities.filter(
          (gc: any) => gc.gatedCommunityId !== community.gatedCommunityId,
        );
        this.onboardedComplexes = this.onboardedComplexes.filter(
          (complex: any) => complex.gatedCommunityName !== community.gatedCommunityName,
        );
        this.registeredSecurityCompanies = this.registeredSecurityCompanies.map((company: any) => {
          if (!company.assignments) {
            return company;
          }
          return {
            ...company,
            assignments: company.assignments.filter(
              (assignment: any) => assignment.gatedCommunityName !== community.gatedCommunityName,
            ),
          };
        });
        this.buildContractHistoryFromCompanies();
        this.triggerToast(
          `Gated community "${community.gatedCommunityName}" removed successfully.`,
        );
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }
  public adminEmail: string = 'kkpartners@equameridian.com';
  public editingGatedCommunity: any = null;
  public complexPrice: number | string = '';

  getGatedCommunityPrice(name: string): number | null {
    const community = this.gatedCommunities.find((c: any) => c.gatedCommunityName === name);
    return community && community.price ? Number(community.price) : null;
  }
  // ...existing properties...

  // Helper: Get all complexes assigned to any gated community
  get complexesInGatedCommunities(): string[] {
    return (this.onboardedComplexes || [])
      .filter((complex: any) => String(complex?.gatedCommunityName ?? '').trim().length > 0)
      .map((complex: any) => complex.complexName);
  }

  // Helper: Get complexes not in any gated community
  get standaloneComplexes(): any[] {
    const assigned = new Set(this.complexesInGatedCommunities);
    return (this.onboardedComplexes || []).filter((c: any) => !assigned.has(c.complexName));
  }

  // Helper: Get complex object by name
  getComplexByName(name: string): any {
    return (this.onboardedComplexes || []).find((c: any) => c.complexName === name);
  }

  getComplexesForCommunity(gatedCommunityName: string): Array<any> {
    const normalized = String(gatedCommunityName ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) {
      return [];
    }
    return (this.onboardedComplexes || []).filter(
      (complex: any) =>
        String(complex?.gatedCommunityName ?? '')
          .trim()
          .toLowerCase() === normalized,
    );
  }

  getCommunityHouseCount(community: any): number {
    const explicitCount = Number(community?.numberOfHouses);
    if (Number.isFinite(explicitCount) && explicitCount > 0) {
      return explicitCount;
    }

    const start = Number(community?.unitStart);
    const end = Number(community?.unitEnd);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return end - start + 1;
    }

    return 0;
  }

  getBlockUnitCount(block: any): number {
    const explicitCount = Number(block?.numberOfUnits);
    if (Number.isFinite(explicitCount) && explicitCount > 0) {
      return explicitCount;
    }

    const start = Number(block?.unitStart);
    const end = Number(block?.unitEnd);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return end - start + 1;
    }

    return 0;
  }

  assignSecurity() {
    // ...existing assign logic...
    this.showAssignModal = false;
  }

  // Unassign Security handler (ensure modal closes on success)
  unassignSecurity() {
    // ...existing unassign logic...
    this.showUnassignModal = false;
  }
  // ...rest of class...
  // Add Security modal state
  protected showAddSecurityModal = false;
  openAddSecurityModal() {
    this.showAddSecurityModal = true;
  }

  // Remove Security modal state
  protected showRemoveSecurityModal = false;
  openRemoveSecurityModal() {
    this.showRemoveSecurityModal = true;
  }
  closeAddSecurityModal() {
    this.showAddSecurityModal = false;
    this.addSecurityError = '';
    this.newSecurityCompany = {
      companyName: '',
      companyEmail: '',
      companyTel: '',
      cipcReg: '',
      psiraNumber: '',
      sosOptin: false,
      assignments: [],
    };
  }

  closeRemoveSecurityModal() {
    this.showRemoveSecurityModal = false;
    this.removeCompanyName = '';
    this.removeSecurityError = '';
  }

  // Form state for add/remove
  protected newSecurityCompany: SecurityCompanyFormDTO = {
    companyName: '',
    companyEmail: '',
    companyTel: '',
    cipcReg: '',
    psiraNumber: '',
    sosOptin: false,
  };
  protected addSecurityError = '';
  protected removeSecurityError = '';
  protected toastMessage = '';
  protected showToast = false;
  protected removeCompanyName: string = '';

  // Add Security Company handler
  addSecurityCompany() {
    this.loading.update(() => true);
    this.addSecurityError = '';
    const form = this.newSecurityCompany;
    if (
      !form.companyName ||
      !form.companyEmail ||
      !form.companyTel ||
      !form.cipcReg ||
      !form.psiraNumber
    ) {
      this.loading.update(() => false);
      return;
    }

    const payload = {
      name: form.companyName.trim(),
      email: form.companyEmail.trim(),
      contactNumber: form.companyTel.trim(),
      cipcRegistrationNumber: form.cipcReg.trim(),
      psiraNumber: form.psiraNumber.trim(),
      sosOptin: Boolean(form.sosOptin),
    };

    this.dataService.post('securityCompany', payload).subscribe({
      next: () => {
        this.closeAddSecurityModal();
        this.loadSecurityCompanies();
        this.triggerToast(`Security company "${form.companyName}" added successfully.`);
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }

  private triggerToast(message: string): void {
    this._snackBar.open(message, 'close', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  private async ensureGoogleMapsLoaded(): Promise<void> {
    this.loading.update(() => true);
    if (!isPlatformBrowser(this.platformId)) {
      this.loading.update(() => false);
      return;
    }
    const windowAny = window as any;
    const existing = windowAny?.google?.maps?.places;
    if (existing) {
      this.loading.update(() => false);
      return;
    }
    if (windowAny.__gmapsLoadingPromise) {
      await windowAny.__gmapsLoadingPromise;
      this.loading.update(() => false);
      return;
    }
    const apiKey = environment.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('[maps] GOOGLE_MAPS_API_KEY is missing. Address autocomplete disabled.');
      this.loading.update(() => false);
      return;
    }
    windowAny.__gmapsLoadingPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
    await windowAny.__gmapsLoadingPromise;
    this.loading.update(() => false);
  }

  private async setupAddressAutocomplete(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (!this.complexAddressInput?.nativeElement) {
      return;
    }
    const currentElement = this.complexAddressInput.nativeElement;
    if (this.addressAutocompleteInitialized && this.addressAutocompleteElement === currentElement) {
      return;
    }

    await this.ensureGoogleMapsLoaded();
    const googleMaps = (window as any)?.google?.maps;
    if (!googleMaps?.places) {
      return;
    }
    const element = currentElement as any;
    const tagName = element?.tagName?.toLowerCase?.() ?? '';

    const applyAddressValue = (value: string): void => {
      const normalized = (value || '').trim();
      if (!normalized) {
        return;
      }
      console.log('[onboarding][address] applyAddressValue', {
        rawValue: value,
        normalized,
      });
      this.ngZone.run(() => {
        this.complexAddress = normalized;
      });
    };

    const resolvePlaceText = async (event: any): Promise<string> => {
      let place = event?.place ?? event?.detail?.place;
      if (!place && event?.detail?.placePrediction?.toPlace) {
        place = event.detail.placePrediction.toPlace();
      }

      if (place?.fetchFields) {
        await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'name'] });
      }

      return (
        place?.formattedAddress ||
        place?.formatted_address ||
        place?.displayName ||
        place?.name ||
        event?.target?.value ||
        event?.detail?.value ||
        ''
      );
    };

    if (tagName === 'gmp-place-autocomplete') {
      const onPlaceSelected = async (event: any) => {
        const formatted = await resolvePlaceText(event);
        console.log('[onboarding][address] place selected (gmp)', {
          eventType: event?.type,
          formatted,
          eventValue: event?.target?.value ?? event?.detail?.value ?? null,
        });
        applyAddressValue(formatted);
      };
      element.addEventListener('gmp-placeselect', onPlaceSelected);
      element.addEventListener('gmp-select', onPlaceSelected);
      element.addEventListener('gmpx-placechange', onPlaceSelected);
      element.addEventListener('input', () => {
        const rawValue = element?.value ?? element?.inputValue ?? '';
        console.log('[onboarding][address] input event (gmp)', {
          rawValue,
        });
        applyAddressValue(rawValue);
      });
      this.addressAutocompleteInitialized = true;
      this.addressAutocompleteElement = currentElement;
      return;
    }

    this.addressAutocomplete = new googleMaps.places.Autocomplete(element, {
      types: ['address'],
    });
    this.addressAutocomplete.addListener('place_changed', () => {
      const place = this.addressAutocomplete.getPlace();
      const formatted = place?.formatted_address || place?.name;
      console.log('[onboarding][address] place_changed (legacy)', {
        formatted,
      });
      applyAddressValue(formatted || '');
    });
    this.addressAutocompleteInitialized = true;
    this.addressAutocompleteElement = currentElement;
  }

  // Remove Security Company handler
  removeSecurityCompany() {
    this.loading.update(() => true);
    if (!this.removeCompanyName) {
      this.loading.update(() => false);
      return;
    }
    this.removeSecurityError = '';
    const company = this.registeredSecurityCompanies.find(
      (c: any) => c.companyName === this.removeCompanyName,
    );
    if (!company?.companyId) {
      this.removeSecurityError = 'Unable to locate the selected company.';
      this.loading.update(() => false);
      return;
    }
    this.dataService.delete(`securityCompany/${company.companyId}`).subscribe({
      next: () => {
        this.registeredSecurityCompanies = this.registeredSecurityCompanies.filter(
          (c: any) => c.companyId !== company.companyId,
        );
        this.closeRemoveSecurityModal();
        this.triggerToast(`Security company "${company.companyName}" removed successfully.`);
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }
  protected showOnboardingModal = false;
  protected showUpdateComplexModal = false;
  protected editingComplex: any = null;
  protected updateComplexError = '';

  openUpdateComplexModal(complex: any): void {
    this.editingComplex = { ...complex };
    if (this.editingComplex.parkingMode === 'fixed') {
      const isUnlimited = this.editingComplex['fixedParkingCount'] === 'unlimited';
      this.editingComplex.parkingIsUnlimited = Boolean(
        isUnlimited || this.editingComplex.parkingIsUnlimited,
      );
      if (isUnlimited) {
        this.editingComplex['fixedParkingCount'] = '';
      }
    }
    if (!Array.isArray(this.editingComplex.blocks)) {
      this.editingComplex.blocks = [];
    }
    this.showUpdateComplexModal = true;
    this.updateComplexError = '';
  }

  closeUpdateComplexModal(): void {
    this.showUpdateComplexModal = false;
    this.editingComplex = null;
    this.updateComplexError = '';
  }

  protected addUpdateBlock(): void {
    if (!this.editingComplex) {
      return;
    }
    if (!Array.isArray(this.editingComplex.blocks)) {
      this.editingComplex.blocks = [];
    }
    const nextName = this.getNextUpdateBlockName(this.editingComplex.blocks);
    this.editingComplex.blocks.push({ name: nextName, unitStart: '', unitEnd: '' });
  }

  protected removeUpdateBlock(index: number): void {
    if (!this.editingComplex?.blocks) {
      return;
    }
    this.editingComplex.blocks.splice(index, 1);
  }

  private getNextUpdateBlockName(blocks: Array<{ name?: string }>): string {
    const index = blocks.length;
    if (index < 26) {
      return `Block ${String.fromCharCode(65 + index)}`;
    }
    return `Block ${index + 1}`;
  }

  submitUpdateComplex(): void {
    this.loading.update(() => true);
    if (!this.editingComplex) {
      this.loading.update(() => false);
      return;
    }
    this.updateComplexError = '';

    const hasBlocks =
      Array.isArray(this.editingComplex.blocks) && this.editingComplex.blocks.length > 0;
    let unitStart = 0;
    let unitEnd = 0;
    let numberOfUnits = 0;
    let normalizedBlocks: Array<{ name: string; unitStart: number; unitEnd: number }> = [];
    if (hasBlocks) {
      normalizedBlocks = this.editingComplex.blocks.map((block: any) => ({
        name: String(block?.name ?? '').trim(),
        unitStart:
          typeof block?.unitStart === 'number'
            ? block.unitStart
            : parseInt(String(block?.unitStart), 10),
        unitEnd:
          typeof block?.unitEnd === 'number' ? block.unitEnd : parseInt(String(block?.unitEnd), 10),
      }));
      for (const block of normalizedBlocks) {
        if (!block.name) {
          this.updateComplexError = 'Block name is required.';
          this.loading.update(() => false);
          return;
        }
        if (
          Number.isNaN(block.unitStart) ||
          Number.isNaN(block.unitEnd) ||
          block.unitStart > block.unitEnd
        ) {
          this.updateComplexError = 'Block unit range must be valid.';
          return;
        }
      }
      const starts = normalizedBlocks.map((block) => block.unitStart);
      const ends = normalizedBlocks.map((block) => block.unitEnd);
      unitStart = Math.min(...starts);
      unitEnd = Math.max(...ends);
      numberOfUnits = normalizedBlocks.reduce(
        (total, block) => total + (block.unitEnd - block.unitStart + 1),
        0,
      );
    } else {
      unitStart =
        typeof this.editingComplex.unitStart === 'number'
          ? this.editingComplex.unitStart
          : parseInt(String(this.editingComplex.unitStart), 10);
      unitEnd =
        typeof this.editingComplex.unitEnd === 'number'
          ? this.editingComplex.unitEnd
          : parseInt(String(this.editingComplex.unitEnd), 10);
      if (Number.isNaN(unitStart) || Number.isNaN(unitEnd) || unitStart > unitEnd) {
        this.updateComplexError = 'Unit range must be valid.';
        this.loading.update(() => false);
        return;
      }
      numberOfUnits = unitEnd - unitStart + 1;
    }

    const priceValue =
      typeof this.editingComplex.price === 'number'
        ? this.editingComplex.price
        : parseFloat(String(this.editingComplex.price));
    if (Number.isNaN(priceValue) || priceValue < 0) {
      this.updateComplexError = 'Price must be a valid non-negative number.';
      this.loading.update(() => false);
      return;
    }

    const isFixedMode = this.editingComplex.parkingMode === 'fixed';
    const fixedParkingRaw = this.editingComplex['fixedParkingCount'];
    const isUnlimited = Boolean(
      this.editingComplex.parkingIsUnlimited || fixedParkingRaw === 'unlimited',
    );
    const fixedParkingCount = isUnlimited
      ? null
      : typeof fixedParkingRaw === 'number'
        ? fixedParkingRaw
        : parseInt(String(fixedParkingRaw), 10);
    if (
      isFixedMode &&
      !isUnlimited &&
      (fixedParkingCount === null || Number.isNaN(fixedParkingCount) || fixedParkingCount < 0)
    ) {
      this.updateComplexError = 'Fixed parking count must be a valid non-negative number.';
      this.loading.update(() => false);
      return;
    }

    const payload: Record<string, unknown> = {
      name: this.editingComplex.complexName?.trim(),
      unitStart,
      unitEnd,
      numberOfUnits,
      price: priceValue,
      parkingMode: isFixedMode ? 'fixed' : 'per-unit',
      parkingIsUnlimited: Boolean(isFixedMode && isUnlimited),
    };

    if (hasBlocks) {
      payload['blocks'] = normalizedBlocks;
    } else if (
      Array.isArray(this.editingComplex.blocks) &&
      this.editingComplex.blocks.length === 0
    ) {
      payload['blocks'] = [];
    }

    if (isFixedMode && !isUnlimited) {
      payload['fixedParkingCount'] = fixedParkingCount;
    }
    if (!isFixedMode) {
      payload['unitParkingConfig'] = this.editingComplex.unitParkingConfig ?? [];
    }

    const complexId = this.editingComplex.complexId;
    if (!complexId) {
      this.updateComplexError = 'Unable to locate the complex record.';
      this.loading.update(() => false);
      return;
    }

    this.dataService.put(`complex/${complexId}`, payload).subscribe({
      next: () => {
        const idx = this.onboardedComplexes.findIndex((c: any) => c.complexId === complexId);
        if (idx > -1) {
          this.onboardedComplexes[idx] = {
            ...this.onboardedComplexes[idx],
            ...this.editingComplex,
            unitStart,
            unitEnd,
            numberOfUnits,
            price: priceValue,
          };
        }
        this.closeUpdateComplexModal();
        this.triggerToast(`Complex "${this.editingComplex?.complexName}" updated successfully.`);
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }
  protected showUnitConfigStep = false;
  protected complexOnboardingForm: ComplexOnboardingFormDTO = {
    address: '',
    complexName: '',
    hasBlocks: false,
    blocks: [],
    numberOfUnits: '',
    parkingMode: 'fixed',
    fixedParkingCount: '',
    parkingIsUnlimited: false,
    selectedGatedCommunityForOnboarding: '',
  };
  protected get complexAddress(): string {
    return this.complexOnboardingForm.address;
  }

  protected set complexAddress(value: string) {
    this.complexOnboardingForm.address = value;
  }

  protected get hasBlocks(): boolean {
    return this.complexOnboardingForm.hasBlocks;
  }

  protected set hasBlocks(value: boolean) {
    this.complexOnboardingForm.hasBlocks = value;
    this.syncBlocksState();
  }

  protected get blocks(): Array<{
    name: string;
    numberOfUnits: number | string;
    unitStart?: number | string;
    unitEnd?: number | string;
  }> {
    return this.complexOnboardingForm.blocks;
  }
  protected get complexName(): string {
    return this.complexOnboardingForm.complexName;
  }

  protected set complexName(value: string) {
    this.complexOnboardingForm.complexName = value;
  }

  protected get numberOfUnits(): number | string {
    return this.complexOnboardingForm.numberOfUnits;
  }

  protected set numberOfUnits(value: number | string) {
    this.complexOnboardingForm.numberOfUnits = value;
  }

  protected get parkingMode(): 'fixed' | 'per-unit' {
    return this.complexOnboardingForm.parkingMode;
  }

  protected set parkingMode(value: 'fixed' | 'per-unit') {
    this.complexOnboardingForm.parkingMode = value;
  }

  protected get fixedParkingCount(): number | string {
    return this.complexOnboardingForm.fixedParkingCount;
  }

  protected set fixedParkingCount(value: number | string) {
    this.complexOnboardingForm.fixedParkingCount = value;
  }

  protected get parkingIsUnlimited(): boolean {
    return this.complexOnboardingForm.parkingIsUnlimited;
  }

  protected set parkingIsUnlimited(value: boolean) {
    this.complexOnboardingForm.parkingIsUnlimited = value;
  }

  protected get selectedGatedCommunityForOnboarding(): string {
    return this.complexOnboardingForm.selectedGatedCommunityForOnboarding;
  }

  protected set selectedGatedCommunityForOnboarding(value: string) {
    this.complexOnboardingForm.selectedGatedCommunityForOnboarding = value;
  }
  protected showGatedCommunityModal = false;
  protected gatedCommunityForm: GatedCommunityFormDTO = {
    gatedCommunityName: '',
    numberOfHouses: '',
    gatedCommunityPrice: '',
  };
  protected get gatedCommunityName(): string {
    return this.gatedCommunityForm.gatedCommunityName;
  }

  protected set gatedCommunityName(value: string) {
    this.gatedCommunityForm.gatedCommunityName = value;
  }

  protected get numberOfHouses(): number | string {
    return this.gatedCommunityForm.numberOfHouses;
  }

  protected set numberOfHouses(value: number | string) {
    this.gatedCommunityForm.numberOfHouses = value;
  }

  protected get gatedCommunityPrice(): number | string {
    return this.gatedCommunityForm.gatedCommunityPrice;
  }

  protected set gatedCommunityPrice(value: number | string) {
    this.gatedCommunityForm.gatedCommunityPrice = value;
  }
  protected gatedCommunityError = '';
  protected gatedCommunitySuccess = '';
  protected unitList: Array<{ unitNumber: number; parkingBays: number | string }> = [];
  protected onboardingError = '';
  protected onboardingSuccess = '';
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
  protected assignmentForm: AssignmentFormDTO = {
    assignmentComplexName: '',
    assignmentContractStart: '',
    assignmentContractEnd: '',
  };
  protected get assignmentComplexName(): string {
    return this.assignmentForm.assignmentComplexName;
  }

  protected set assignmentComplexName(value: string) {
    this.assignmentForm.assignmentComplexName = value;
  }

  protected get assignmentContractStart(): string {
    return this.assignmentForm.assignmentContractStart;
  }

  protected set assignmentContractStart(value: string) {
    this.assignmentForm.assignmentContractStart = value;
  }

  protected get assignmentContractEnd(): string {
    return this.assignmentForm.assignmentContractEnd;
  }

  protected set assignmentContractEnd(value: string) {
    this.assignmentForm.assignmentContractEnd = value;
  }
  protected assignmentError = '';
  protected assignmentSuccess = '';
  protected showUnassignModal = false;
  protected unassignmentTarget: any = null;
  protected assignmentTimeoutId: any = null;

  // Gated community assignment
  protected showGatedComplexAssignModal = false;
  protected showGatedSecurityAssignModal = false;
  protected selectedGatedCommunity: any = null;
  protected gatedAssignmentForm: GatedAssignmentFormDTO = {
    gatedAssignmentComplexName: '',
    gatedAssignmentCompanyName: '',
    gatedSecurityContractStart: '',
    gatedSecurityContractEnd: '',
  };
  protected get gatedAssignmentComplexName(): string {
    return this.gatedAssignmentForm.gatedAssignmentComplexName;
  }

  protected set gatedAssignmentComplexName(value: string) {
    this.gatedAssignmentForm.gatedAssignmentComplexName = value;
  }

  protected get gatedAssignmentCompanyName(): string {
    return this.gatedAssignmentForm.gatedAssignmentCompanyName;
  }

  protected set gatedAssignmentCompanyName(value: string) {
    this.gatedAssignmentForm.gatedAssignmentCompanyName = value;
  }

  protected get gatedSecurityContractStart(): string {
    return this.gatedAssignmentForm.gatedSecurityContractStart;
  }

  protected set gatedSecurityContractStart(value: string) {
    this.gatedAssignmentForm.gatedSecurityContractStart = value;
  }

  protected get gatedSecurityContractEnd(): string {
    return this.gatedAssignmentForm.gatedSecurityContractEnd;
  }

  protected set gatedSecurityContractEnd(value: string) {
    this.gatedAssignmentForm.gatedSecurityContractEnd = value;
  }
  protected gatedAssignmentError = '';
  protected gatedAssignmentSuccess = '';
  protected gatedSecurityUnassignTarget: any = null;
  protected showGatedSecurityUnassignModal = false;
  protected gatedCommunityFilter = '';

  // Contract history filters and sorting
  protected contractFilters: AdminPortalFiltersFormDTO = {
    contractSearchTerm: '',
    contractComplexFilter: '',
    contractCompanyFilter: '',
    contractStartDateFilter: '',
    contractEndDateFilter: '',
    visitorSearchTerm: '',
    selectedComplexFilter: '',
    filterStartDate: '',
    filterEndDate: '',
    filterStartTime: '',
    filterEndTime: '',
    timeframeFilter: '',
    gatedCommunityFilter: '',
  };
  protected get contractSearchTerm(): string {
    return this.contractFilters.contractSearchTerm;
  }

  protected set contractSearchTerm(value: string) {
    this.contractFilters.contractSearchTerm = value;
  }

  protected get contractComplexFilter(): string {
    return this.contractFilters.contractComplexFilter;
  }

  protected set contractComplexFilter(value: string) {
    this.contractFilters.contractComplexFilter = value;
  }

  protected get contractCompanyFilter(): string {
    return this.contractFilters.contractCompanyFilter;
  }

  protected set contractCompanyFilter(value: string) {
    this.contractFilters.contractCompanyFilter = value;
  }

  protected get contractStartDateFilter(): string {
    return this.contractFilters.contractStartDateFilter;
  }

  protected set contractStartDateFilter(value: string) {
    this.contractFilters.contractStartDateFilter = value;
  }

  protected get contractEndDateFilter(): string {
    return this.contractFilters.contractEndDateFilter;
  }

  protected set contractEndDateFilter(value: string) {
    this.contractFilters.contractEndDateFilter = value;
  }

  protected get visitorSearchTerm(): string {
    return this.contractFilters.visitorSearchTerm;
  }

  protected set visitorSearchTerm(value: string) {
    this.contractFilters.visitorSearchTerm = value;
  }

  protected get selectedComplexFilter(): string {
    return this.contractFilters.selectedComplexFilter;
  }

  protected set selectedComplexFilter(value: string) {
    this.contractFilters.selectedComplexFilter = value;
  }

  protected get filterStartDate(): string {
    return this.contractFilters.filterStartDate;
  }

  protected set filterStartDate(value: string) {
    this.contractFilters.filterStartDate = value;
  }

  protected get filterEndDate(): string {
    return this.contractFilters.filterEndDate;
  }

  protected set filterEndDate(value: string) {
    this.contractFilters.filterEndDate = value;
  }

  protected get filterStartTime(): string {
    return this.contractFilters.filterStartTime;
  }

  protected set filterStartTime(value: string) {
    this.contractFilters.filterStartTime = value;
  }

  protected get filterEndTime(): string {
    return this.contractFilters.filterEndTime;
  }

  protected set filterEndTime(value: string) {
    this.contractFilters.filterEndTime = value;
  }

  protected get timeframeFilter(): string {
    return this.contractFilters.timeframeFilter;
  }

  protected set timeframeFilter(value: string) {
    this.contractFilters.timeframeFilter = value;
  }
  protected sortContractColumn = 'contractEndDate';
  protected sortContractDirection: 'asc' | 'desc' = 'desc';
  protected filteredContractHistory: Array<any> = [];

  // Visitor history filters
  protected sortColumn = 'entryTime';
  protected sortDirection: 'asc' | 'desc' = 'desc';
  protected filteredVisitorHistory: Array<any> = [];

  protected registeredSecurityCompanies: Array<any> = [];

  protected contractHistory: Array<any> = [];

  protected visitorHistory: Array<any> = [];

  protected gatedCommunities: Array<any> = [];
  // Open update modal for a complex within a gated community
  openUpdateGatedComplexModal(gatedCommunity: any, complex: any): void {
    this.editingComplex = { ...complex };
    this.editingGatedCommunity = gatedCommunity;
    this.showUpdateComplexModal = true;
  }

  protected onboardedComplexes: Array<any> = [];
  // Delete confirmation modal state for complex
  protected showDeleteComplexModal = false;
  protected complexToDelete: any = null;

  // Open delete confirmation modal for a complex
  openDeleteComplexModal(complex: any): void {
    this.complexToDelete = complex;
    this.showDeleteComplexModal = true;
  }

  // Close delete confirmation modal
  closeDeleteComplexModal(): void {
    this.complexToDelete = null;
    this.showDeleteComplexModal = false;
  }

  // Confirm deletion of complex
  confirmDeleteComplex(): void {
    if (this.complexToDelete) {
      this.deleteComplex(this.complexToDelete);
    }
    this.closeDeleteComplexModal();
  }
  protected readonly overviewStats = [];

  protected readonly quickActions = [
    {
      title: 'Onboard Complex',
      description: 'Set up a new complex with units and parking configuration.',
      action: 'onboard',
    },
  ];

  protected readonly recentEvents = [];

  protected get isGatedCommunityFormValid(): boolean {
    const hasName = this.gatedCommunityForm.gatedCommunityName.trim().length > 0;
    const hasNumberOfHouses =
      this.gatedCommunityForm.numberOfHouses !== '' &&
      this.gatedCommunityForm.numberOfHouses !== null;
    const hasPrice =
      this.gatedCommunityForm.gatedCommunityPrice !== '' &&
      this.gatedCommunityForm.gatedCommunityPrice !== null &&
      !isNaN(Number(this.gatedCommunityForm.gatedCommunityPrice));
    const numberOfHouses =
      typeof this.gatedCommunityForm.numberOfHouses === 'number'
        ? this.gatedCommunityForm.numberOfHouses
        : parseInt(String(this.gatedCommunityForm.numberOfHouses), 10);
    const validCount = Number.isFinite(numberOfHouses) && numberOfHouses > 0 && hasNumberOfHouses;
    return hasName && validCount && hasPrice;
  }

  protected closeGatedCommunityModal(): void {
    this.showGatedCommunityModal = false;
    this.resetGatedCommunityForm();
    this.editingGatedCommunity = null;
  }

  protected resetGatedCommunityForm(): void {
    this.gatedCommunityForm = {
      gatedCommunityName: '',
      numberOfHouses: '',
      gatedCommunityPrice: '',
    };
    this.gatedCommunityError = '';
    this.gatedCommunitySuccess = '';
  }

  protected async submitGatedCommunity(): Promise<void> {
    this.loading.update(() => true);
    this.gatedCommunityError = '';
    this.gatedCommunitySuccess = '';

    if (!this.gatedCommunityForm.gatedCommunityName.trim()) {
      this.gatedCommunityError = 'Gated community name is required.';
      this.loading.update(() => false);
      return;
    }

    const numberOfHouses =
      typeof this.gatedCommunityForm.numberOfHouses === 'number'
        ? this.gatedCommunityForm.numberOfHouses
        : parseInt(String(this.gatedCommunityForm.numberOfHouses), 10);

    if (!Number.isFinite(numberOfHouses) || numberOfHouses <= 0) {
      this.gatedCommunityError = 'Number of houses must be a valid positive number.';
      this.loading.update(() => false);
      return;
    }

    const priceValue =
      typeof this.gatedCommunityForm.gatedCommunityPrice === 'number'
        ? this.gatedCommunityForm.gatedCommunityPrice
        : parseFloat(String(this.gatedCommunityForm.gatedCommunityPrice));
    if (Number.isNaN(priceValue) || priceValue < 0) {
      this.gatedCommunityError = 'Price must be a valid non-negative number.';
      this.loading.update(() => false);
      return;
    }

    const unitStart = 1;
    const unitEnd = numberOfHouses;

    const gatedData = {
      gatedCommunityId: this.editingGatedCommunity?.gatedCommunityId ?? '',
      gatedCommunityName: this.gatedCommunityForm.gatedCommunityName.trim(),
      numberOfHouses,
      unitStart,
      unitEnd,
      price: priceValue,
      securityAssignments: this.editingGatedCommunity
        ? this.editingGatedCommunity.securityAssignments
        : [],
    };

    const existingName = String(this.editingGatedCommunity?.gatedCommunityName ?? '').trim();
    const nextName = gatedData.gatedCommunityName;
    const associatedComplexes = this.onboardedComplexes.filter((complex: any) => {
      const linkedName = String(complex?.gatedCommunityName ?? '').trim();
      return linkedName.length > 0 && linkedName === (existingName || nextName);
    });

    const payload = {
      name: gatedData.gatedCommunityName,
      numberOfComplexes: associatedComplexes.length,
      numberOfHouses,
      unitStart,
      unitEnd,
      price: priceValue,
    };

    if (this.editingGatedCommunity) {
      this.dataService.put(`gatedCommunity/${gatedData.gatedCommunityId}`, payload).subscribe({
        next: () => {
          Object.assign(this.editingGatedCommunity, gatedData);
          this.gatedCommunitySuccess = `Gated community "${gatedData.gatedCommunityName}" has been updated successfully!`;
          setTimeout(() => {
            this.closeGatedCommunityModal();
          }, 1500);
          this.triggerToast(
            `Gated community "${gatedData.gatedCommunityName}" updated successfully.`,
          );
          setTimeout(() => {
            this.loading.update(() => false);
            window.location.reload();
          }, 1200);
        },
        error: (err) => {
          this._snackBar.open(err.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.loading.update(() => false);
        },
      });
    } else {
      this.dataService.post('gatedCommunity', payload).subscribe({
        next: (response: any) => {
          gatedData.gatedCommunityId = response?.payload?._id ?? '';
          this.gatedCommunities.push(gatedData);
          this.gatedCommunitySuccess = `Gated community "${gatedData.gatedCommunityName}" has been added successfully!`;
          setTimeout(() => {
            this.closeGatedCommunityModal();
          }, 1500);
          this.triggerToast(
            `Gated community "${gatedData.gatedCommunityName}" added successfully.`,
          );
          setTimeout(() => {
            this.loading.update(() => false);
            window.location.reload();
          }, 1200);
        },
        error: (err) => {
          this._snackBar.open(err.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.loading.update(() => false);
        },
      });
    }
  }

  protected openGatedComplexAssignModal(community: any): void {
    this.selectedGatedCommunity = community;
    this.showGatedComplexAssignModal = true;
    this.gatedAssignmentForm.gatedAssignmentComplexName = '';
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';
    this.gatedCommunityFilter = '';
  }

  protected closeGatedComplexAssignModal(): void {
    this.showGatedComplexAssignModal = false;
    this.selectedGatedCommunity = null;
    this.gatedAssignmentForm.gatedAssignmentComplexName = '';
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';
    this.gatedCommunityFilter = '';
  }

  protected async submitGatedComplexAssignment(): Promise<void> {
    this.loading.update(() => true);
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';

    if (!this.gatedCommunityFilter) {
      this.gatedAssignmentError = 'Please select which gated community this complex belongs to.';
      this.loading.update(() => false);
      return;
    }

    if (!this.gatedAssignmentComplexName) {
      this.gatedAssignmentError = 'Please select a complex.';
      this.loading.update(() => false);
      return;
    }

    // Validate selected complex matches the gated community
    const filteredComplexes = this.filteredGatedComplexesByFilter;
    const complexExists = filteredComplexes.some(
      (c: any) => c.complexName === this.gatedAssignmentComplexName,
    );
    if (!complexExists) {
      this.gatedAssignmentError =
        'Selected complex does not belong to the selected gated community.';
      this.loading.update(() => false);
      return;
    }

    if (this.selectedGatedCommunity) {
      const existingComplex = this.onboardedComplexes.find(
        (c: any) => c.complexName === this.gatedAssignmentComplexName,
      );

      if (!existingComplex?.complexId) {
        this.gatedAssignmentError = 'Selected complex could not be found.';
        this.loading.update(() => false);
        return;
      }

      const existingLinkedCommunity = String(existingComplex.gatedCommunityName ?? '').trim();
      const targetCommunity = String(this.selectedGatedCommunity.gatedCommunityName ?? '').trim();

      if (existingLinkedCommunity && existingLinkedCommunity === targetCommunity) {
        this.gatedAssignmentError = 'This complex is already assigned to this gated community.';
        this.loading.update(() => false);
        return;
      }

      this.dataService
        .put(`complex/${existingComplex.complexId}`, { gatedCommunityName: targetCommunity })
        .subscribe({
          next: () => {
            existingComplex.gatedCommunityName = targetCommunity;
            this.gatedAssignmentSuccess = `${this.gatedAssignmentComplexName} has been assigned to ${this.selectedGatedCommunity.gatedCommunityName}!`;
            setTimeout(() => {
              this.loading.update(() => false);
              this.closeGatedComplexAssignModal();
            }, 2000);
          },
          error: (err) => {
            this._snackBar.open(err.error.message, 'close', {
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition,
            });
            this.loading.update(() => false);
          },
        });
    }
  }

  protected openGatedSecurityAssignModal(community: any): void {
    this.selectedGatedCommunity = community;
    this.showGatedSecurityAssignModal = true;
    this.gatedAssignmentCompanyName = '';
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';
    this.gatedCommunityFilter = '';
  }

  protected closeGatedSecurityAssignModal(): void {
    this.showGatedSecurityAssignModal = false;
    this.selectedGatedCommunity = null;
    this.gatedAssignmentCompanyName = '';
    this.gatedSecurityContractStart = '';
    this.gatedSecurityContractEnd = '';
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';
    this.gatedCommunityFilter = '';
  }

  protected async submitGatedSecurityAssignment(): Promise<void> {
    this.loading.update(() => true);
    this.gatedAssignmentError = '';
    this.gatedAssignmentSuccess = '';

    if (!this.gatedAssignmentCompanyName) {
      this.gatedAssignmentError = 'Please select a security company.';
      this.loading.update(() => false);
      return;
    }

    if (!this.gatedSecurityContractStart) {
      this.gatedAssignmentError = 'Contract start date is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.gatedSecurityContractEnd) {
      this.gatedAssignmentError = 'Contract end date is required.';
      this.loading.update(() => false);
      return;
    }

    if (this.selectedGatedCommunity) {
      const existingCompany = this.selectedGatedCommunity.securityAssignments?.find(
        (c: any) => c.companyName === this.gatedAssignmentCompanyName,
      );

      if (existingCompany) {
        this.gatedAssignmentError =
          'This security company is already assigned to this gated community.';
        this.loading.update(() => false);
        return;
      }

      if (!this.selectedGatedCommunity.securityAssignments) {
        this.selectedGatedCommunity.securityAssignments = [];
      }

      const targetCompany = this.registeredSecurityCompanies.find(
        (company) => company.companyName === this.gatedAssignmentCompanyName,
      );
      if (targetCompany) {
        if (!targetCompany.assignments) {
          targetCompany.assignments = [];
        }
        const existingContract = targetCompany.assignments.find(
          (assignment: any) =>
            assignment.gatedCommunityName === this.selectedGatedCommunity.gatedCommunityName,
        );
        if (existingContract) {
          this.gatedAssignmentError =
            'This security company is already assigned to this gated community.';
          this.loading.update(() => false);
          return;
        }
        targetCompany.assignments.push({
          gatedCommunityName: this.selectedGatedCommunity.gatedCommunityName,
          contractStart: this.gatedSecurityContractStart,
          contractEnd: this.gatedSecurityContractEnd,
        });
        this.persistCompanyAssignments(targetCompany);
      }

      this.selectedGatedCommunity.securityAssignments.push({
        companyName: this.gatedAssignmentCompanyName,
        contractStart: this.gatedSecurityContractStart,
        contractEnd: this.gatedSecurityContractEnd,
      });
      this.gatedAssignmentSuccess = `${this.gatedAssignmentCompanyName} has been assigned to ${this.selectedGatedCommunity.gatedCommunityName}!`;

      setTimeout(() => {
        this.loading.update(() => false);
        this.closeGatedSecurityAssignModal();
      }, 2000);
    }
  }

  protected confirmGatedSecurityUnassignment(community: any, security: any): void {
    this.loading.update(() => true);
    const index = community.securityAssignments.findIndex(
      (s: any) => s.companyName === security.companyName,
    );
    if (index > -1) {
      community.securityAssignments.splice(index, 1);
    }
    const targetCompany = this.registeredSecurityCompanies.find(
      (company) => company.companyName === security.companyName,
    );
    if (targetCompany?.assignments) {
      const assignmentIndex = targetCompany.assignments.findIndex(
        (assignment: any) => assignment.gatedCommunityName === community.gatedCommunityName,
      );
      if (assignmentIndex > -1) {
        targetCompany.assignments.splice(assignmentIndex, 1);
        this.persistCompanyAssignments(targetCompany);
      }
    }
    console.log(
      'Security company unassigned from gated community:',
      security.companyName,
      community.gatedCommunityName,
    );
    this.gatedAssignmentSuccess = `${security.companyName} has been unassigned from ${community.gatedCommunityName}!`;
    setTimeout(() => {
      this.loading.update(() => false);
      this.gatedAssignmentSuccess = '';
    }, 2000);
  }

  protected get isOnboardingFormValid(): boolean {
    const hasComplexName = this.complexName.trim().length > 0;
    const hasAddress = this.complexAddress.trim().length > 0;
    let priceValue: number | null = null;
    if (this.selectedGatedCommunityForOnboarding) {
      const gatedPrice = this.getGatedCommunityPrice(this.selectedGatedCommunityForOnboarding);
      priceValue = gatedPrice !== null ? gatedPrice : null;
    } else {
      const parsedPrice =
        typeof this.complexPrice === 'number'
          ? this.complexPrice
          : parseFloat(String(this.complexPrice));
      priceValue = Number.isNaN(parsedPrice) ? null : parsedPrice;
    }
    const hasValidPrice = priceValue !== null && priceValue >= 0;
    let validRange = false;
    if (this.hasBlocks) {
      validRange = this.areBlocksValid();
    } else {
      const hasNumberOfUnits = this.numberOfUnits !== '' && this.numberOfUnits !== null;
      const numberOfUnitsNum =
        typeof this.numberOfUnits === 'number'
          ? this.numberOfUnits
          : parseInt(String(this.numberOfUnits), 10);
      validRange = Number.isFinite(numberOfUnitsNum) && numberOfUnitsNum > 0 && hasNumberOfUnits;
    }

    if (this.parkingMode === 'fixed') {
      // If unlimited is selected, no need to validate parking count
      if (this.parkingIsUnlimited) {
        return hasComplexName && hasAddress && hasValidPrice && validRange;
      }

      const parkingNum =
        typeof this.fixedParkingCount === 'number'
          ? this.fixedParkingCount
          : parseInt(String(this.fixedParkingCount), 10);
      const hasFixedParking =
        this.fixedParkingCount !== '' &&
        this.fixedParkingCount !== null &&
        !isNaN(parkingNum) &&
        parkingNum >= 0;
      return hasComplexName && hasAddress && hasValidPrice && validRange && hasFixedParking;
    }

    return hasComplexName && hasAddress && hasValidPrice && validRange;
  }

  protected get allUnitsConfigured(): boolean {
    return this.unitList.every((unit) => {
      const parkingNum =
        typeof unit.parkingBays === 'string' ? parseInt(unit.parkingBays, 10) : unit.parkingBays;
      return !isNaN(parkingNum) && parkingNum >= 0;
    });
  }

  protected openOnboardingModal(): void {
    this.showOnboardingModal = true;
    this.showUnitConfigStep = false;
    this.resetOnboardingForm();
    this.addressAutocompleteInitialized = false;
    this.addressAutocompleteElement = null;
    setTimeout(() => {
      void this.setupAddressAutocomplete();
    }, 0);
  }

  protected closeOnboardingModal(): void {
    this.showOnboardingModal = false;
    this.showUnitConfigStep = false;
    this.addressAutocompleteInitialized = false;
    this.addressAutocompleteElement = null;
    this.resetOnboardingForm();
  }

  protected resetOnboardingForm(): void {
    this.complexName = '';
    this.complexAddress = '';
    this.hasBlocks = false;
    this.complexOnboardingForm.blocks = [];
    this.numberOfUnits = '';
    this.parkingMode = 'fixed';
    this.fixedParkingCount = '';
    this.parkingIsUnlimited = false;
    this.selectedGatedCommunityForOnboarding = '';
    this.complexPrice = '';
    this.onboardingError = '';
    this.onboardingSuccess = '';
    this.unitList = [];
  }

  protected async submitOnboarding(): Promise<void> {
    this.loading.update(() => true);
    this.onboardingError = '';
    this.onboardingSuccess = '';

    const element = this.complexAddressInput?.nativeElement as any;
    const domAddress = String(
      element?.value ?? element?.inputValue ?? element?.getAttribute?.('value') ?? '',
    ).trim();
    if (!this.complexAddress.trim() && domAddress) {
      this.complexAddress = domAddress;
    }
    console.log('[onboarding][address] submit check', {
      modelAddress: this.complexAddress,
      domAddress,
      hasModelAddress: Boolean(this.complexAddress.trim()),
    });

    if (!this.complexName.trim()) {
      this.onboardingError = 'Complex name is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.complexAddress.trim()) {
      this.onboardingError = 'Address is required.';
      this.loading.update(() => false);
      return;
    }

    let numberOfUnits = 0;
    if (this.hasBlocks) {
      if (!this.validateBlocks()) {
        this.loading.update(() => false);
        return;
      }
      const summary = this.getBlocksSummary();
      if (!summary) {
        this.onboardingError = 'Blocks are incomplete.';
        this.loading.update(() => false);
        return;
      }
      numberOfUnits = summary.numberOfUnits;
    } else {
      numberOfUnits =
        typeof this.numberOfUnits === 'number'
          ? this.numberOfUnits
          : parseInt(String(this.numberOfUnits), 10);
      if (!Number.isFinite(numberOfUnits) || numberOfUnits <= 0) {
        this.onboardingError = 'Number of units must be a valid positive number.';
        this.loading.update(() => false);
        return;
      }
    }
    let price = this.complexPrice;
    if (this.selectedGatedCommunityForOnboarding) {
      const gatedPrice = this.getGatedCommunityPrice(this.selectedGatedCommunityForOnboarding);
      if (gatedPrice !== null) price = gatedPrice;
    }
    const parsedPrice = typeof price === 'number' ? price : parseFloat(String(price));
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      this.onboardingError = 'Price must be a valid non-negative number.';
      this.loading.update(() => false);
      return;
    }

    // Fixed mode - submit immediately
    if (this.parkingMode === 'fixed') {
      if (this.parkingIsUnlimited) {
        const onboardingData = {
          complexId: '',
          complexName: this.complexName.trim(),
          address: this.complexAddress.trim(),
          parkingMode: 'fixed',
          fixedParkingCount: 'unlimited',
          price: parsedPrice,
        };
        this.createComplexRecord(
          {
            name: onboardingData.complexName,
            address: onboardingData.address,
            numberOfUnits,
            price: parsedPrice,
            parkingMode: 'fixed',
            fixedParkingCount: null,
            parkingIsUnlimited: true,
            unitParkingConfig: [],
            blocks: this.hasBlocks ? this.normalizeBlocks() : [],
          },
          onboardingData,
          `Complex "${onboardingData.complexName}" has been onboarded successfully with unlimited parking!`,
        );
        this.loading.update(() => false);
        return;
      }
      const fixedCount =
        typeof this.fixedParkingCount === 'number'
          ? this.fixedParkingCount
          : parseInt(String(this.fixedParkingCount), 10);
      if (isNaN(fixedCount) || fixedCount < 0) {
        this.onboardingError = 'Fixed parking count must be a valid non-negative number.';
        this.loading.update(() => false);
        return;
      }
      const onboardingData = {
        complexId: '',
        complexName: this.complexName.trim(),
        address: this.complexAddress.trim(),
        parkingMode: 'fixed',
        fixedParkingCount: fixedCount,
        price: parsedPrice,
      };
      this.createComplexRecord(
        {
          name: onboardingData.complexName,
          address: onboardingData.address,
          numberOfUnits,
          price: parsedPrice,
          parkingMode: 'fixed',
          fixedParkingCount: fixedCount,
          parkingIsUnlimited: false,
          unitParkingConfig: [],
          blocks: this.hasBlocks ? this.normalizeBlocks() : [],
        },
        onboardingData,
        `Complex "${onboardingData.complexName}" has been onboarded successfully!`,
      );
      this.loading.update(() => false);
      return;
    }

    // Per-unit mode - show unit configuration
    this.loading.update(() => false);
    this.generateUnitList(numberOfUnits);
    this.showUnitConfigStep = true;
  }

  protected generateUnitList(count: number): void {
    this.unitList = [];
    for (let i = 1; i <= count; i++) {
      this.unitList.push({ unitNumber: i, parkingBays: '' });
    }
  }

  protected async confirmUnitConfiguration(): Promise<void> {
    this.loading.update(() => true);
    this.onboardingError = '';

    if (!this.allUnitsConfigured) {
      this.onboardingError = 'All units must have a parking bay count assigned.';
      this.loading.update(() => false);
      return;
    }

    let numberOfUnits = 0;
    if (this.hasBlocks) {
      if (!this.validateBlocks()) {
        this.loading.update(() => false);
        return;
      }
      const summary = this.getBlocksSummary();
      if (!summary) {
        this.onboardingError = 'Blocks are incomplete.';
        this.loading.update(() => false);
        return;
      }
      numberOfUnits = summary.numberOfUnits;
    } else {
      numberOfUnits =
        typeof this.numberOfUnits === 'number'
          ? this.numberOfUnits
          : parseInt(String(this.numberOfUnits), 10);
      if (!Number.isFinite(numberOfUnits) || numberOfUnits <= 0) {
        this.onboardingError = 'Number of units must be a valid positive number.';
        this.loading.update(() => false);
        return;
      }
    }
    let priceValue: number | null = null;
    if (this.selectedGatedCommunityForOnboarding) {
      const gatedPrice = this.getGatedCommunityPrice(this.selectedGatedCommunityForOnboarding);
      priceValue = gatedPrice !== null ? gatedPrice : null;
    } else {
      const parsedPrice =
        typeof this.complexPrice === 'number'
          ? this.complexPrice
          : parseFloat(String(this.complexPrice));
      priceValue = Number.isNaN(parsedPrice) ? null : parsedPrice;
    }
    const parsedPrice = priceValue ?? NaN;
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      this.onboardingError = 'Price must be a valid non-negative number.';
      this.loading.update(() => false);
      return;
    }

    const finalData = {
      complexId: '',
      complexName: this.complexName.trim(),
      address: this.complexAddress.trim(),
      parkingMode: 'per-unit',
      unitParkingConfig: this.unitList.map((unit) => ({
        unitNumber: unit.unitNumber,
        parkingBays:
          typeof unit.parkingBays === 'string' ? parseInt(unit.parkingBays, 10) : unit.parkingBays,
      })),
      price: parsedPrice,
    };

    this.createComplexRecord(
      {
        name: finalData.complexName,
        address: finalData.address,
        numberOfUnits,
        price: parsedPrice,
        parkingMode: 'per-unit',
        fixedParkingCount: null,
        parkingIsUnlimited: false,
        unitParkingConfig: finalData.unitParkingConfig,
        blocks: this.hasBlocks ? this.normalizeBlocks() : [],
      },
      finalData,
      `Complex "${finalData.complexName}" has been onboarded successfully with per-unit parking configuration!`,
    );
    this.loading.update(() => false);
  }

  private createComplexRecord(
    payload: {
      name: string;
      address: string;
      numberOfUnits: number;
      price: number;
      parkingMode: 'fixed' | 'per-unit';
      fixedParkingCount: number | null;
      parkingIsUnlimited: boolean;
      unitParkingConfig: Array<{ unitNumber: number; parkingBays: number }>;
      blocks: Array<{ name: string; numberOfUnits: number }>;
    },
    onboardingData: any,
    successMessage: string,
  ): void {
    this.loading.update(() => true);
    const requestPayload: Record<string, unknown> = { ...payload };
    if (this.selectedGatedCommunityForOnboarding) {
      requestPayload['gatedCommunityName'] = this.selectedGatedCommunityForOnboarding;
    }
    if (requestPayload['fixedParkingCount'] === null) {
      delete requestPayload['fixedParkingCount'];
    }
    this.dataService.post<{ payload?: { _id?: string } }>('complex', requestPayload).subscribe({
      next: (response) => {
        onboardingData.complexId = response?.payload?._id ?? '';
        onboardingData.gatedCommunityName = this.selectedGatedCommunityForOnboarding || '';
        this.onboardedComplexes.push(onboardingData);
        this.onboardingSuccess = successMessage;
        setTimeout(() => {
          this.closeOnboardingModal();
        }, 2000);
        this.triggerToast(`Complex "${onboardingData.complexName}" added successfully.`);
        setTimeout(() => {
          this.loading.update(() => false);
          window.location.reload();
        }, 1200);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
      },
    });
  }

  protected backToBasicConfig(): void {
    this.showUnitConfigStep = false;
    this.onboardingError = '';
  }

  protected addBlock(): void {
    this.blocks.push({
      name: this.getNextBlockName(),
      numberOfUnits: '',
    });
  }

  protected removeBlock(index: number): void {
    this.blocks.splice(index, 1);
  }

  private syncBlocksState(): void {
    if (this.hasBlocks && this.blocks.length === 0) {
      this.blocks.push({ name: 'Block A', numberOfUnits: '' });
    }
    if (!this.hasBlocks && this.blocks.length > 0) {
      this.blocks.splice(0, this.blocks.length);
    }
  }

  private getNextBlockName(): string {
    const index = this.blocks.length;
    if (index < 26) {
      return `Block ${String.fromCharCode(65 + index)}`;
    }
    return `Block ${index + 1}`;
  }

  private normalizeBlocks(): Array<{ name: string; numberOfUnits: number }> {
    return this.blocks.map((block) => {
      const count =
        typeof block.numberOfUnits === 'number'
          ? block.numberOfUnits
          : parseInt(String(block.numberOfUnits), 10);
      const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
      return {
        name: block.name.trim(),
        numberOfUnits: safeCount,
      };
    });
  }

  private validateBlocks(): boolean {
    if (!this.hasBlocks) {
      return true;
    }
    if (this.blocks.length === 0) {
      this.onboardingError = 'Add at least one block or disable blocks.';
      return false;
    }
    for (const block of this.blocks) {
      if (!block.name.trim()) {
        this.onboardingError = 'Block name is required.';
        return false;
      }
      const blockUnits =
        typeof block.numberOfUnits === 'number'
          ? block.numberOfUnits
          : parseInt(String(block.numberOfUnits), 10);
      if (!Number.isFinite(blockUnits) || blockUnits <= 0) {
        this.onboardingError = 'Each block must have a valid positive number of units.';
        return false;
      }
    }
    return true;
  }

  private areBlocksValid(): boolean {
    if (!this.hasBlocks) {
      return true;
    }
    if (this.blocks.length === 0) {
      return false;
    }
    return this.blocks.every((block) => {
      if (!block.name.trim()) return false;
      const blockUnits =
        typeof block.numberOfUnits === 'number'
          ? block.numberOfUnits
          : parseInt(String(block.numberOfUnits), 10);
      return Number.isFinite(blockUnits) && blockUnits > 0;
    });
  }

  private getBlocksSummary(): { numberOfUnits: number } | null {
    const normalized = this.normalizeBlocks();
    if (normalized.length === 0) {
      return null;
    }
    const numberOfUnits = normalized.reduce((total, block) => total + block.numberOfUnits, 0);
    if (Number.isNaN(numberOfUnits)) {
      return null;
    }
    return { numberOfUnits };
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
    this.loading.update(() => true);
    this.securityError = '';
    this.securitySuccess = '';

    if (!this.securityCompanyName.trim()) {
      this.securityError = 'Company name is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.securityCompanyEmail.trim()) {
      this.securityError = 'Company email is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.securityCompanyTel.trim()) {
      this.securityError = 'Company telephone number is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.cipcReg.trim()) {
      this.securityError = 'CIPC registration number is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.contractStart) {
      this.securityError = 'Contract start date is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.contractEnd) {
      this.securityError = 'Contract end date is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.psiraNumber.trim()) {
      this.securityError = 'PSIRA number is required.';
      this.loading.update(() => false);
      return;
    }

    // Check if company already exists
    const existingCompany = this.registeredSecurityCompanies.find(
      (company) => company.companyName === this.securityCompanyName.trim(),
    );

    if (existingCompany) {
      // Company exists, add assignment to existing company
      if (!existingCompany.assignments) {
        existingCompany.assignments = [];
      }

      const existingAssignment = existingCompany.assignments.find(
        (a: any) => a.complexName === this.selectedComplexName,
      );

      if (existingAssignment) {
        this.securityError = 'This company is already assigned to this complex.';
        this.loading.update(() => false);
        return;
      }

      existingCompany.assignments.push({
        complexName: this.selectedComplexName,
        contractStart: this.contractStart,
        contractEnd: this.contractEnd,
      });
      this.persistCompanyAssignments(
        existingCompany,
        `Security company "${existingCompany.companyName}" has been assigned to ${this.selectedComplexName}!`,
      );
    } else {
      // New company, create with assignments array
      const securityData = {
        companyId: '',
        companyName: this.securityCompanyName.trim(),
        companyEmail: this.securityCompanyEmail.trim(),
        companyTel: this.securityCompanyTel.trim(),
        cipcReg: this.cipcReg.trim(),
        psiraNumber: this.psiraNumber.trim(),
        sosOptin: false,
        assignments: [
          {
            complexName: this.selectedComplexName,
            contractStart: this.contractStart,
            contractEnd: this.contractEnd,
          },
        ],
      };

      const payload = {
        name: securityData.companyName,
        email: securityData.companyEmail,
        contactNumber: securityData.companyTel,
        cipcRegistrationNumber: securityData.cipcReg,
        psiraNumber: securityData.psiraNumber,
        sosOptin: Boolean(securityData.sosOptin),
        contract: this.buildContractPayload(securityData.assignments),
      };

      this.dataService.post<{ payload?: { _id?: string } }>('securityCompany', payload).subscribe({
        next: (response) => {
          securityData.companyId = response?.payload?._id ?? '';
          this.registeredSecurityCompanies.push(securityData);
          this.securitySuccess = `Security company "${securityData.companyName}" has been registered for ${this.selectedComplexName}!`;
          setTimeout(() => {
            this.loading.update(() => false);
            this.closeSecurityModal();
          }, 2000);
        },
        error: (err) => {
          this._snackBar.open(err.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.loading.update(() => false);
        },
      });
      return;
    }

    setTimeout(() => {
      this.loading.update(() => false);
      this.closeSecurityModal();
    }, 2000);
  }

  protected get unassignedComplexes(): Array<any> {
    const assignedComplexNames = new Set<string>();

    this.registeredSecurityCompanies.forEach((company) => {
      if (company.assignments) {
        company.assignments.forEach((assignment: any) => {
          assignedComplexNames.add(assignment.complexName);
        });
      }
    });

    return this.onboardedComplexes.filter(
      (complex) => !assignedComplexNames.has(complex.complexName),
    );
  }

  protected get filteredGatedComplexesByFilter(): Array<any> {
    if (!this.gatedCommunityFilter) {
      return this.onboardedComplexes;
    }
    const selectedCommunityName = String(this.gatedCommunityFilter ?? '')
      .trim()
      .toLowerCase();
    if (!selectedCommunityName) {
      return this.onboardedComplexes;
    }

    return this.onboardedComplexes.filter(
      (complex: any) =>
        String(complex?.gatedCommunityName ?? '')
          .trim()
          .toLowerCase() === selectedCommunityName,
    );
  }

  protected get activeContractsCount(): number {
    return this.registeredSecurityCompanies.reduce((count, company) => {
      return count + (company.assignments ? company.assignments.length : 0);
    }, 0);
  }

  protected isComplexAssigned(complexName: string): boolean {
    return this.registeredSecurityCompanies.some(
      (company) =>
        company.assignments && company.assignments.some((a: any) => a.complexName === complexName),
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
    this.loading.update(() => true);
    this.assignmentError = '';
    this.assignmentSuccess = '';

    if (!this.assignmentComplexName) {
      this.assignmentError = 'Please select a complex.';
      this.loading.update(() => false);
      return;
    }

    if (!this.assignmentContractStart) {
      this.assignmentError = 'Contract start date is required.';
      this.loading.update(() => false);
      return;
    }

    if (!this.assignmentContractEnd) {
      this.assignmentError = 'Contract end date is required.';
      this.loading.update(() => false);
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
        (a: any) => a.complexName === this.assignmentComplexName,
      );

      if (existingAssignment) {
        this.assignmentError = 'This company is already assigned to this complex.';
        this.loading.update(() => false);
        return;
      }

      // Add new assignment
      this.selectedCompanyForAssignment.assignments.push({
        complexName: this.assignmentComplexName,
        contractStart: this.assignmentContractStart,
        contractEnd: this.assignmentContractEnd,
      });
      this.persistCompanyAssignments(
        this.selectedCompanyForAssignment,
        `${this.selectedCompanyForAssignment?.companyName} has been assigned to ${this.assignmentComplexName}!`,
      );
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
      this.loading.update(() => false);
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
    this.loading.update(() => true);
    if (this.unassignmentTarget) {
      const { company, assignment } = this.unassignmentTarget;
      const index = company.assignments.indexOf(assignment);
      if (index > -1) {
        company.assignments.splice(index, 1);
      }
      const assignedName = assignment.complexName || assignment.gatedCommunityName || '';
      console.log('Company unassigned from complex:', company.companyName, assignedName);
      this.persistCompanyAssignments(
        company,
        `${company.companyName} has been unassigned from ${assignedName}!`,
      );
      setTimeout(() => {
        this.loading.update(() => false);
        this.closeUnassignModal();
        this.assignmentSuccess = '';
      }, 2000);
    }
  }

  private buildContractPayload(
    assignments: Array<{
      complexName?: string;
      gatedCommunityName?: string;
      contractStart?: string;
      contractEnd?: string;
    }>,
  ): Array<{
    complex?: { name: string };
    complexName?: string;
    gatedCommunityName?: string;
    contractStartDate?: string;
    contractEndDate?: string;
  }> {
    return (assignments || []).map((assignment) => {
      const payload: {
        complex?: { name: string };
        complexName?: string;
        gatedCommunityName?: string;
        contractStartDate?: string;
        contractEndDate?: string;
      } = {
        contractStartDate: assignment.contractStart,
        contractEndDate: assignment.contractEnd,
      };
      if (assignment.complexName) {
        payload.complex = { name: assignment.complexName };
        payload.complexName = assignment.complexName;
      }
      if (assignment.gatedCommunityName) {
        payload.gatedCommunityName = assignment.gatedCommunityName;
      }
      return payload;
    });
  }

  private persistCompanyAssignments(company: any, successMessage?: string): void {
    if (!company?.companyId) {
      if (successMessage) {
        this.assignmentSuccess = successMessage;
      }
      return;
    }
    const payload = {
      contract: this.buildContractPayload(company.assignments ?? []),
    };
    this.dataService.put(`securityCompany/${company.companyId}`, payload).subscribe({
      next: () => {
        if (successMessage) {
          this.assignmentSuccess = successMessage;
        }
        this.buildContractHistoryFromCompanies();
        this.hydrateGatedSecurityAssignments();
      },
      error: (err) => {
        const apiMessage = err?.error?.message;
        this.assignmentError = apiMessage || 'Unable to update security assignments.';
      },
    });
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
    this.loadSecurityCompanies();
    this.loadComplexes();
    this.loadGatedCommunities();
    this.loadVisitorLogs();
  }

  ngAfterViewInit(): void {
    if (this.showOnboardingModal) {
      void this.setupAddressAutocomplete();
    }
  }

  private loadSecurityCompanies(): void {
    this.loading.update(() => true);
    this.dataService.get<any[]>('securityCompany').subscribe({
      next: (companies) => {
        this.registeredSecurityCompanies = (companies || []).map((company) => ({
          companyId: company._id ?? '',
          companyName: company.name ?? '',
          companyEmail: company.email ?? '',
          companyTel: company.contactNumber ?? '',
          cipcReg: company.cipcRegistrationNumber ?? '',
          psiraNumber: company.psiraNumber ?? '',
          sosOptin: Boolean(company.sosOptin),
          assignments: (company.contract ?? []).map((contract: any) => ({
            complexName: contract?.complex?.name ?? contract?.complexName ?? '',
            gatedCommunityName: contract?.gatedCommunityName ?? '',
            contractStart: this.formatDateValue(contract?.contractStartDate),
            contractEnd: this.formatDateValue(contract?.contractEndDate),
          })),
        }));
        this.buildContractHistoryFromCompanies();
        this.hydrateGatedSecurityAssignments();
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
        this.registeredSecurityCompanies = [];
        this.contractHistory = [];
        this.filteredContractHistory = [];
      },
    });
  }

  private buildContractHistoryFromCompanies(): void {
    const today = new Date();
    this.contractHistory = this.registeredSecurityCompanies.flatMap((company) =>
      (company.assignments ?? []).map((assignment: any) => {
        const endDate = assignment.contractEnd ? new Date(assignment.contractEnd) : null;
        const status = endDate && endDate < today ? 'Ended' : 'Active';
        const assignedName = assignment.complexName || assignment.gatedCommunityName || '';
        return {
          companyName: company.companyName,
          complexName: assignedName,
          contractStartDate: assignment.contractStart,
          contractEndDate: assignment.contractEnd,
          status,
          companyEmail: company.companyEmail,
          companyTel: company.companyTel,
          psiraNumber: company.psiraNumber,
        };
      }),
    );
    this.filteredContractHistory = [...this.contractHistory];
    this.sortContracts('contractEndDate');
  }

  private loadComplexes(): void {
    this.loading.update(() => true);
    this.dataService.get<any[]>('complex').subscribe({
      next: (complexes) => {
        this.onboardedComplexes = (complexes || []).map((complex) => ({
          complexId: complex._id ?? '',
          complexName: complex.name ?? '',
          gatedCommunityName: complex.gatedCommunityName ?? '',
          unitStart: complex.unitStart ?? 1,
          unitEnd: complex.unitEnd ?? complex.numberOfUnits ?? '',
          numberOfUnits: complex.numberOfUnits ?? 0,
          parkingMode: complex.parkingMode ?? 'fixed',
          fixedParkingCount: complex.parkingIsUnlimited
            ? 'unlimited'
            : (complex.fixedParkingCount ?? ''),
          parkingIsUnlimited: Boolean(complex.parkingIsUnlimited),
          address: complex.address ?? '',
          price: complex.price ?? '',
          unitParkingConfig: complex.unitParkingConfig ?? [],
          blocks: complex.blocks ?? [],
        }));
        this.loading.update(() => false);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
        this.onboardedComplexes = [];
      },
    });
  }

  private loadGatedCommunities(): void {
    this.loading.update(() => true);
    this.dataService.get<any[]>('gatedCommunity').subscribe({
      next: (communities) => {
        this.gatedCommunities = (communities || []).map((community) => ({
          gatedCommunityId: community._id ?? '',
          gatedCommunityName: community.name ?? '',
          unitStart: community.unitStart ?? 1,
          unitEnd: community.unitEnd ?? community.numberOfHouses ?? '',
          price: community.price ?? '',
          securityAssignments: [],
        }));
        this.hydrateGatedSecurityAssignments();
        this.loading.update(() => false);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
        this.gatedCommunities = [];
      },
    });
  }

  private hydrateGatedSecurityAssignments(): void {
    if (!this.gatedCommunities.length || !this.registeredSecurityCompanies.length) {
      return;
    }
    const assignmentsByCommunity = new Map<
      string,
      Array<{ companyName: string; contractStart: string; contractEnd: string }>
    >();
    for (const company of this.registeredSecurityCompanies) {
      for (const assignment of company.assignments ?? []) {
        if (!assignment.gatedCommunityName) {
          continue;
        }
        const list = assignmentsByCommunity.get(assignment.gatedCommunityName) ?? [];
        list.push({
          companyName: company.companyName,
          contractStart: assignment.contractStart,
          contractEnd: assignment.contractEnd,
        });
        assignmentsByCommunity.set(assignment.gatedCommunityName, list);
      }
    }
    this.gatedCommunities = this.gatedCommunities.map((community) => ({
      ...community,
      securityAssignments: assignmentsByCommunity.get(community.gatedCommunityName) ?? [],
    }));
  }

  private loadVisitorLogs(): void {
    this.loading.update(() => true);
    this.dataService.get<any[]>('logs').subscribe({
      next: (logs) => {
        this.visitorHistory = (logs || []).map((log) => {
          const visitor = log.visitor ?? {};
          const tenant = visitor.user ?? {};
          const guard = log.guard ?? {};
          return {
            visitorName: `${visitor.name ?? ''} ${visitor.surname ?? ''}`.trim(),
            visitorPhone: visitor.contact ?? '',
            unitVisited: tenant.unit ?? '',
            tenantName: tenant.name ?? '',
            tenantSurname: tenant.surname ?? '',
            tenantPhone: tenant.cellNumber ?? '',
            complexName: tenant.complex?.name ?? '',
            entryTime: log.date ?? '',
            securityGuard: `${guard.name ?? ''} ${guard.surname ?? ''}`.trim(),
          };
        });
        this.filteredVisitorHistory = [...this.visitorHistory];
        this.sortVisitors('entryTime');
        this.loading.update(() => false);
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.loading.update(() => false);
        this.visitorHistory = [];
        this.filteredVisitorHistory = [];
      },
    });
  }

  private formatDateValue(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = new Date(value as string);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  protected filterVisitors(): void {
    let filtered = [...this.visitorHistory];

    // Apply search filter
    if (this.visitorSearchTerm.trim()) {
      const searchLower = this.visitorSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (visit) =>
          visit.visitorName.toLowerCase().includes(searchLower) ||
          visit.visitorPhone.includes(searchLower) ||
          visit.unitVisited.toLowerCase().includes(searchLower) ||
          visit.tenantName.toLowerCase().includes(searchLower) ||
          visit.tenantSurname.toLowerCase().includes(searchLower) ||
          visit.tenantPhone.includes(searchLower) ||
          visit.complexName.toLowerCase().includes(searchLower) ||
          visit.securityGuard.toLowerCase().includes(searchLower),
      );
    }

    // Apply complex filter
    if (this.selectedComplexFilter) {
      filtered = filtered.filter((visit) => visit.complexName === this.selectedComplexFilter);
    }

    // Apply date range filter
    if (this.filterStartDate) {
      const startDate = new Date(this.filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((visit) => new Date(visit.entryTime) >= startDate);
    }

    if (this.filterEndDate) {
      const endDate = new Date(this.filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((visit) => new Date(visit.entryTime) <= endDate);
    }

    // Apply time window filter
    if (this.filterStartTime || this.filterEndTime) {
      filtered = filtered.filter((visit) => {
        const entry = new Date(visit.entryTime);
        const entryMinutes = entry.getHours() * 60 + entry.getMinutes();
        const startMinutes = this.filterStartTime
          ? this.parseTimeToMinutes(this.filterStartTime)
          : null;
        const endMinutes = this.filterEndTime ? this.parseTimeToMinutes(this.filterEndTime) : null;

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
    const [hours, minutes] = timeValue.split(':').map((value) => parseInt(value, 10));
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
      filtered = filtered.filter(
        (contract) =>
          contract.companyName.toLowerCase().includes(searchLower) ||
          contract.complexName.toLowerCase().includes(searchLower) ||
          contract.companyEmail.toLowerCase().includes(searchLower) ||
          contract.companyTel.includes(searchLower) ||
          contract.psiraNumber.toLowerCase().includes(searchLower),
      );
    }

    // Apply complex filter
    if (this.contractComplexFilter) {
      filtered = filtered.filter((contract) => contract.complexName === this.contractComplexFilter);
    }

    // Apply company filter
    if (this.contractCompanyFilter) {
      filtered = filtered.filter((contract) => contract.companyName === this.contractCompanyFilter);
    }

    // Apply contract start date filter
    if (this.contractStartDateFilter) {
      const startDate = new Date(this.contractStartDateFilter);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((contract) => new Date(contract.contractStartDate) >= startDate);
    }

    // Apply contract end date filter
    if (this.contractEndDateFilter) {
      const endDate = new Date(this.contractEndDateFilter);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((contract) => new Date(contract.contractEndDate) <= endDate);
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
      if (
        this.sortContractColumn === 'contractStartDate' ||
        this.sortContractColumn === 'contractEndDate'
      ) {
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
    return Array.from(new Set(this.contractHistory.map((c) => c.complexName))).sort();
  }

  protected get uniqueContractCompanies(): string[] {
    return Array.from(new Set(this.contractHistory.map((c) => c.companyName))).sort();
  }
}
