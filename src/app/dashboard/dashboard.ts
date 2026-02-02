import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected isBookingModalOpen = false;
  protected isConfirmationModalOpen = false;
	protected drivingMode: 'yes' | 'no' | '' = '';

  protected openBookingModal(): void {
    this.isBookingModalOpen = true;
  }

  protected closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.drivingMode = '';
  }

  protected openConfirmationModal(): void {
    this.isBookingModalOpen = false;
    this.isConfirmationModalOpen = true;
  }

  protected closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }
}
