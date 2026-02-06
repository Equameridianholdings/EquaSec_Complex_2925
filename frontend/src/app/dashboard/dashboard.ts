import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  @ViewChild('subtenantCameraVideo') private readonly subtenantCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('subtenantCameraCanvas') private readonly subtenantCameraCanvas?: ElementRef<HTMLCanvasElement>;

  protected isBookingModalOpen = false;
  protected isConfirmationModalOpen = false;
  protected isSubtenantModalOpen = false;
  protected readonly profileName = 'Kamo';
  protected readonly profilePhotoUrl = '';
  protected isDriving = false;
  protected visitorName = '';
  protected visitorSurname = '';
  protected visitorCell = '';
  protected visitorIdNumber = '';
  protected vehicleMake = '';
  protected vehicleModel = '';
  protected vehicleReg = '';
  protected vehicleColor = '';
  protected subtenants: Array<{
    id: string;
    name: string;
    surname: string;
    cellphone: string;
    idNumber?: string;
    email?: string;
    photoDataUrl?: string;
  }> = [];
  protected vehicles: Array<{
    id: string;
    make: string;
    model: string;
    regNumber: string;
    color?: string;
  }> = [];

  protected subtenantForm = {
    id: '',
    name: '',
    surname: '',
    cellphone: '',
    idNumber: '',
    email: '',
    photoDataUrl: '',
  };
  protected vehicleForm = {
    id: '',
    make: '',
    model: '',
    regNumber: '',
    color: '',
  };
  protected editingSubtenantId: string | null = null;
  protected editingVehicleId: string | null = null;
  protected subtenantCameraError = '';
  protected hasSubtenantCameraStream = false;
  private subtenantCameraStream: MediaStream | null = null;
  protected isVehicleModalOpen = false;

  constructor(private readonly router: Router) {}

  protected openBookingModal(): void {
    this.isBookingModalOpen = true;
  }

  protected closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.resetBookingForm();
  }

  protected openSubtenantModal(): void {
    this.isSubtenantModalOpen = true;
    this.subtenantCameraError = '';
  }

  protected closeSubtenantModal(): void {
    this.isSubtenantModalOpen = false;
    this.stopSubtenantCamera();
  }

  protected openVehicleModal(): void {
    this.isVehicleModalOpen = true;
  }

  protected closeVehicleModal(): void {
    this.isVehicleModalOpen = false;
  }

  protected openConfirmationModal(): void {
    this.isBookingModalOpen = false;
    this.isConfirmationModalOpen = true;
  }

  protected closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.resetBookingForm();
  }

  protected get transportModeLabel(): string {
    return this.isDriving ? 'Car' : 'On foot';
  }

  protected get greetingLabel(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }

  protected get profileInitials(): string {
    return (this.profileName || 'User').trim().slice(0, 2).toUpperCase();
  }

  protected goToGuardLogin(): void {
    void this.router.navigate(['/guard-login']);
  }

  protected addOrUpdateSubtenant(): void {
    const payload = {
      id: this.editingSubtenantId ?? `subtenant-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: this.subtenantForm.name.trim(),
      surname: this.subtenantForm.surname.trim(),
      cellphone: this.subtenantForm.cellphone.trim(),
      idNumber: this.subtenantForm.idNumber.trim() || undefined,
      email: this.subtenantForm.email.trim() || undefined,
      photoDataUrl: this.subtenantForm.photoDataUrl || undefined,
    };

    if (this.editingSubtenantId) {
      this.subtenants = this.subtenants.map((item) => (item.id === this.editingSubtenantId ? payload : item));
    } else {
      this.subtenants = [...this.subtenants, payload];
    }

    this.resetSubtenantForm();
    this.closeSubtenantModal();
  }

  protected editSubtenant(subtenantId: string): void {
    const subtenant = this.subtenants.find((item) => item.id === subtenantId);
    if (!subtenant) {
      return;
    }

    this.subtenantForm = {
      id: subtenant.id,
      name: subtenant.name,
      surname: subtenant.surname,
      cellphone: subtenant.cellphone,
      idNumber: subtenant.idNumber ?? '',
      email: subtenant.email ?? '',
      photoDataUrl: subtenant.photoDataUrl ?? '',
    };
    this.editingSubtenantId = subtenant.id;
    this.openSubtenantModal();
  }

  protected deleteSubtenant(subtenantId: string): void {
    this.subtenants = this.subtenants.filter((item) => item.id !== subtenantId);
    if (this.editingSubtenantId === subtenantId) {
      this.resetSubtenantForm();
    }
  }

  protected cancelSubtenantEdit(): void {
    this.resetSubtenantForm();
    this.closeSubtenantModal();
  }

  protected addOrUpdateVehicle(): void {
    const payload = {
      id: this.editingVehicleId ?? `vehicle-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      make: this.vehicleForm.make.trim(),
      model: this.vehicleForm.model.trim(),
      regNumber: this.vehicleForm.regNumber.trim(),
      color: this.vehicleForm.color.trim() || undefined,
    };

    if (this.editingVehicleId) {
      this.vehicles = this.vehicles.map((item) => (item.id === this.editingVehicleId ? payload : item));
    } else {
      this.vehicles = [...this.vehicles, payload];
    }

    this.resetVehicleForm();
    this.closeVehicleModal();
  }

  protected editVehicle(vehicleId: string): void {
    const vehicle = this.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) {
      return;
    }

    this.vehicleForm = {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      regNumber: vehicle.regNumber,
      color: vehicle.color ?? '',
    };
    this.editingVehicleId = vehicle.id;
    this.openVehicleModal();
  }

  protected deleteVehicle(vehicleId: string): void {
    this.vehicles = this.vehicles.filter((item) => item.id !== vehicleId);
    if (this.editingVehicleId === vehicleId) {
      this.resetVehicleForm();
    }
  }

  protected cancelVehicleEdit(): void {
    this.resetVehicleForm();
    this.closeVehicleModal();
  }

  protected async startSubtenantCamera(): Promise<void> {
    this.subtenantCameraError = '';
    this.subtenantForm.photoDataUrl = '';

    try {
      this.subtenantCameraStream?.getTracks().forEach((track) => track.stop());
      this.subtenantCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const video = this.subtenantCameraVideo?.nativeElement;
      if (video) {
        video.srcObject = this.subtenantCameraStream;
        await video.play();
      }
      this.hasSubtenantCameraStream = true;
    } catch (error) {
      this.subtenantCameraError = 'Unable to access the camera. Please allow camera permissions.';
      this.subtenantCameraStream?.getTracks().forEach((track) => track.stop());
      this.subtenantCameraStream = null;
      this.hasSubtenantCameraStream = false;
    }
  }

  protected captureSubtenantPhoto(): void {
    const video = this.subtenantCameraVideo?.nativeElement;
    const canvas = this.subtenantCameraCanvas?.nativeElement;
    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.subtenantForm.photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.stopSubtenantCamera();
  }

  protected retakeSubtenantPhoto(): void {
    void this.startSubtenantCamera();
  }

  protected stopSubtenantCamera(): void {
    this.subtenantCameraStream?.getTracks().forEach((track) => track.stop());
    this.subtenantCameraStream = null;
    this.hasSubtenantCameraStream = false;
    const video = this.subtenantCameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  protected getSubtenantInitials(name: string, surname: string): string {
    const first = (name || '').trim().charAt(0).toUpperCase();
    const last = (surname || '').trim().charAt(0).toUpperCase();
    return `${first}${last}` || 'NA';
  }

  private resetSubtenantForm(): void {
    this.subtenantForm = {
      id: '',
      name: '',
      surname: '',
      cellphone: '',
      idNumber: '',
      email: '',
      photoDataUrl: '',
    };
    this.editingSubtenantId = null;
    this.subtenantCameraError = '';
  }

  private resetVehicleForm(): void {
    this.vehicleForm = {
      id: '',
      make: '',
      model: '',
      regNumber: '',
      color: '',
    };
    this.editingVehicleId = null;
  }

  private resetBookingForm(): void {
    this.isDriving = false;
    this.visitorName = '';
    this.visitorSurname = '';
    this.visitorCell = '';
    this.visitorIdNumber = '';
    this.vehicleMake = '';
    this.vehicleModel = '';
    this.vehicleReg = '';
    this.vehicleColor = '';
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  public ngOnDestroy(): void {
    this.stopSubtenantCamera();
  }
}
