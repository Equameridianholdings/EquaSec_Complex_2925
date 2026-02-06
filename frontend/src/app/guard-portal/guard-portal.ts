import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal implements OnDestroy {
  protected searchCode = '';
  protected searchUnit = '';
  protected searchReg = '';
  protected showUnitOptions = false;
  protected showRegOptions = false;
  protected showCodes = true;
  protected showResidents = true;
  protected showVehicles = true;
  protected toastVisible = false;
  protected toastMessage = '';
  private toastTimeoutId: number | null = null;
  protected isHoldingSos = false;
  protected showSosSuccess = false;

  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  protected guardName = 'James Mthembu';
  protected guardPhotoUrl = '';

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
  ) {}
  protected get guardInitials(): string {
    return (this.guardName || 'Guard').trim().slice(0, 2).toUpperCase();
  }
  protected readonly residents = [
    {
      name: 'Lerato Nkosi',
      unit: '402',
      cellphone: '082 123 4567',
      email: 'lerato@example.com',
      photoDataUrl: '',
    },
    {
      name: 'Sipho Dlamini',
      unit: '118',
      cellphone: '071 445 2211',
      email: 'sipho@example.com',
      photoDataUrl: '',
    },
  ];
  protected readonly vehicles = [
    {
      make: 'Toyota',
      model: 'Hilux',
      regNumber: 'GP 123 456',
      color: 'Silver',
      unit: '402',
      owner: 'Lerato Nkosi',
    },
    {
      make: 'VW',
      model: 'Polo',
      regNumber: 'GT 654 321',
      color: 'Blue',
      unit: '118',
      owner: 'Sipho Dlamini',
    },
  ];
  protected readonly activeCodes = [
    {
      code: '131249',
      visitorName: 'Thabo Moloi',
      tenantName: 'Lerato Nkosi',
      cellphone: '082 123 4567',
      unit: '402',
      expires: 'In 8 hours',
      isDriving: true,
      vehicle: {
        makeModel: 'Toyota Hilux',
        registration: 'GP 123 456',
        color: 'Silver'
      }
    },
    {
      code: '882190',
      visitorName: 'Ayanda Mokoena',
      tenantName: 'Sipho Dlamini',
      cellphone: '071 445 2211',
      unit: '118',
      expires: 'In 5 hours',
      isDriving: false
    }
  ];

  protected get filteredCodes() {
    const codeQuery = this.searchCode.replace(/\D/g, '');
    const unitQuery = this.searchUnit.trim().toLowerCase();
    const regQuery = this.searchReg.trim().toLowerCase();
    if (!codeQuery && !unitQuery && !regQuery) {
      return this.activeCodes;
    }
    return this.activeCodes.filter((code) => {
      const matchesCode = !codeQuery || code.code.includes(codeQuery);
      const matchesUnit = !unitQuery || code.unit.toLowerCase().includes(unitQuery);
      const registration = code.vehicle?.registration?.toLowerCase() ?? '';
      const matchesReg = !regQuery || registration.includes(regQuery);
      return matchesCode && matchesUnit && matchesReg;
    });
  }

  protected updateUnitSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchUnit = input.value;
    this.showUnitOptions = true;
  }

  protected updateRegSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.searchReg = input.value;
    this.showRegOptions = true;
  }

  protected setUnitDropdown(visible: boolean): void {
    this.showUnitOptions = visible;
  }

  protected setRegDropdown(visible: boolean): void {
    this.showRegOptions = visible;
  }

  protected clearOtherSearches(activeField: 'unit' | 'reg' | 'code'): void {
    if (activeField === 'unit') {
      this.searchCode = '';
      this.searchReg = '';
      this.showRegOptions = false;
      this.showCodes = false;
      this.showResidents = true;
      this.showVehicles = false;
    } else if (activeField === 'reg') {
      this.searchCode = '';
      this.searchUnit = '';
      this.showUnitOptions = false;
      this.showCodes = false;
      this.showResidents = false;
      this.showVehicles = true;
    } else if (activeField === 'code') {
      this.searchUnit = '';
      this.searchReg = '';
      this.showUnitOptions = false;
      this.showRegOptions = false;
      this.showCodes = true;
      this.showResidents = false;
      this.showVehicles = false;
    }
  }

  protected selectUnit(unit: string): void {
    this.searchUnit = unit;
    this.showUnitOptions = false;
  }

  protected selectReg(reg: string): void {
    this.searchReg = reg;
    this.showRegOptions = false;
  }

  protected get filteredUnitOptions(): string[] {
    const units = new Set<string>([
      ...this.residents.map((resident) => resident.unit),
      ...this.vehicles.map((vehicle) => vehicle.unit),
    ]);
    const list = Array.from(units).sort();
    const query = this.searchUnit.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((unit) => unit.toLowerCase().includes(query));
  }

  protected get filteredRegOptions(): string[] {
    const list = this.vehicles.map((vehicle) => vehicle.regNumber).sort();
    const query = this.searchReg.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((reg) => reg.toLowerCase().includes(query));
  }

  protected get filteredResidents() {
    const unitQuery = this.searchUnit.trim().toLowerCase();
    if (!unitQuery) {
      return this.residents;
    }
    return this.residents.filter((resident) => resident.unit.toLowerCase().includes(unitQuery));
  }

  protected get filteredVehicles() {
    const unitQuery = this.searchUnit.trim().toLowerCase();
    const regQuery = this.searchReg.trim().toLowerCase();
    if (!unitQuery && !regQuery) {
      return this.vehicles;
    }
    return this.vehicles.filter((vehicle) => {
      const matchesUnit = !unitQuery || vehicle.unit.toLowerCase().includes(unitQuery);
      const matchesReg = !regQuery || vehicle.regNumber.toLowerCase().includes(regQuery);
      return matchesUnit && matchesReg;
    });
  }

  protected getResidentInitials(name: string): string {
    return (name || 'Resident').trim().slice(0, 2).toUpperCase();
  }

  protected onGrantAccess(): void {
    this.showToast('Access granted');
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.toastVisible = true;
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
    }
    this.toastTimeoutId = window.setTimeout(() => {
      this.toastVisible = false;
      this.toastTimeoutId = null;
      window.location.reload();
    }, 4000);
  }

  protected startSosHold(event: Event): void {
    event.preventDefault();
    if (this.isHoldingSos || this.showSosSuccess) {
      return;
    }

    this.isHoldingSos = true;
    this.clearSosHoldTimer();
    this.sosHoldTimer = window.setTimeout(() => {
      this.triggerSosSuccess();
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

  ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
  }
}
