import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-guard-portal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guard-portal.html',
  styleUrl: './guard-portal.css',
})
export class GuardPortal {
  protected searchCode = '';
  protected toastVisible = false;
  protected toastMessage = '';
  private toastTimeoutId: number | null = null;
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
    const trimmed = this.searchCode.replace(/\D/g, '');
    if (!trimmed) {
      return this.activeCodes;
    }
    return this.activeCodes.filter((code) => code.code.includes(trimmed));
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
}
