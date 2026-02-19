import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VisitorBookingFormDTO } from '../interfaces/forms/visitorBookingFormDTO';
import { ChangePinFormDTO } from '../interfaces/forms/changePinFormDTO';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy, OnInit {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profileCameraVideo') private readonly profileCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('profileCameraCanvas') private readonly profileCameraCanvas?: ElementRef<HTMLCanvasElement>;

  protected isBookingModalOpen = false;
  protected isConfirmationModalOpen = false;
  protected isHoldingSos = false;
  protected showSosSuccess = false;
  protected isUpdateDetailsModalOpen = false;
  protected isChangePinModalOpen = false;
  protected profilePhotoData = '';
  protected visitorBookingForm: VisitorBookingFormDTO = {
    visitorName: '',
    visitorSurname: '',
    visitorCell: '',
    visitorIdNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleReg: '',
    vehicleColor: ''
  };
  get visitorName(): string {
    return this.visitorBookingForm.visitorName;
  }

  set visitorName(value: string) {
    this.visitorBookingForm.visitorName = value;
  }

  get visitorSurname(): string {
    return this.visitorBookingForm.visitorSurname;
  }

  set visitorSurname(value: string) {
    this.visitorBookingForm.visitorSurname = value;
  }

  get visitorCell(): string {
    return this.visitorBookingForm.visitorCell;
  }

  set visitorCell(value: string) {
    this.visitorBookingForm.visitorCell = value;
  }

  get visitorIdNumber(): string {
    return this.visitorBookingForm.visitorIdNumber;
  }

  set visitorIdNumber(value: string) {
    this.visitorBookingForm.visitorIdNumber = value;
  }

  get vehicleMake(): string {
    return this.visitorBookingForm.vehicleMake;
  }

  set vehicleMake(value: string) {
    this.visitorBookingForm.vehicleMake = value;
  }

  get vehicleModel(): string {
    return this.visitorBookingForm.vehicleModel;
  }

  set vehicleModel(value: string) {
    this.visitorBookingForm.vehicleModel = value;
  }

  get vehicleReg(): string {
    return this.visitorBookingForm.vehicleReg;
  }

  set vehicleReg(value: string) {
    this.visitorBookingForm.vehicleReg = value;
  }

  get vehicleColor(): string {
    return this.visitorBookingForm.vehicleColor;
  }

  set vehicleColor(value: string) {
    this.visitorBookingForm.vehicleColor = value;
  }
  protected changePinForm: ChangePinFormDTO = {
    current: ['', '', '', '', '', ''],
    new: ['', '', '', '', '', ''],
    confirm: ['', '', '', '', '', '']
  };
  protected changePinError = '';
  protected changePinSuccess = '';
  protected cameraError = '';
  protected hasCameraStream = false;
  protected isPhotoCameraModalOpen = false;
  private profileCameraStream: MediaStream | null = null;
  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  protected profileName = 'Kamo';
  protected profilePhotoUrl = '';
  protected isDriving = false;
  private currentUserComplexId = '';

  // Unit residents and vehicles
  protected unitResidents: Array<{ name: string; email: string; phone: string; idNumber: string }> = [];

  protected unitVehicles: Array<{ make: string; model: string; reg: string; color: string; owner: string }> = [];

  constructor(private readonly router: Router, private readonly dataService: DataService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.dataService.get<any>('user/current').subscribe({
      next: (user) => {
        if (user) {
          this.profileName = `${user.name ?? ''} ${user.surname ?? ''}`.trim() || this.profileName;
          this.profilePhotoUrl = user.profilePhoto ?? '';
          this.currentUserComplexId = user.complex?._id ?? '';
        }
        this.loadResidents();
        this.loadVehicles();
      },
      error: () => {
        this.loadResidents();
        this.loadVehicles();
      },
    });
  }

  private loadResidents(): void {
    this.dataService.get<any>('user').subscribe({
      next: (response) => {
        const users = Array.isArray(response) ? response : response?.payload ?? [];
        this.unitResidents = (users || [])
          .filter((user: any) => {
            if (!this.currentUserComplexId) {
              return true;
            }
            return user.complex?._id === this.currentUserComplexId;
          })
          .map((user: any) => ({
            name: `${user.name ?? ''} ${user.surname ?? ''}`.trim(),
            email: user.emailAddress ?? '',
            phone: user.cellNumber ?? '',
            idNumber: user.idNumber ?? '',
          }));
      },
      error: () => {
        this.unitResidents = [];
      },
    });
  }

  private loadVehicles(): void {
    this.dataService.get<any[]>('vehicle').subscribe({
      next: (vehicles) => {
        this.unitVehicles = (vehicles || [])
          .filter((vehicle) => {
            if (!this.currentUserComplexId) {
              return true;
            }
            return vehicle.user?.complex?._id === this.currentUserComplexId;
          })
          .map((vehicle) => ({
            make: vehicle.make ?? '',
            model: vehicle.model ?? '',
            reg: vehicle.registerationNumber ?? vehicle.reg ?? '',
            color: vehicle.color ?? '',
            owner: `${vehicle.user?.name ?? ''} ${vehicle.user?.surname ?? ''}`.trim(),
          }));
      },
      error: () => {
        this.unitVehicles = [];
      },
    });
  }

  protected openBookingModal(): void {
    this.isBookingModalOpen = true;
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

  protected closeBookingModal(): void {
    this.isBookingModalOpen = false;
    this.resetBookingForm();
  }

  protected openUpdateDetailsModal(): void {
    this.isUpdateDetailsModalOpen = true;
  }

  protected closeUpdateDetailsModal(): void {
    this.isUpdateDetailsModalOpen = false;
  }

  protected openChangePinModal(): void {
    this.isChangePinModalOpen = true;
    this.changePinForm = {
      current: ['', '', '', '', '', ''],
      new: ['', '', '', '', '', ''],
      confirm: ['', '', '', '', '', '']
    };
    this.changePinError = '';
    this.changePinSuccess = '';
  }

  protected closeChangePinModal(): void {
    this.isChangePinModalOpen = false;
  }

  protected onCurrentPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    this.changePinForm.current[index] = digit;

    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  protected onNewPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    this.changePinForm.new[index] = digit;

    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  protected onConfirmPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    this.changePinForm.confirm[index] = digit;

    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  protected onPinKeydown(event: KeyboardEvent, index: number, type: 'current' | 'new' | 'confirm'): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling;
      if (prev instanceof HTMLInputElement) {
        this.changePinForm[type][index - 1] = '';
        prev.focus();
      }
    }
  }

  protected submitChangePinForm(): void {
    const currentPin = this.changePinForm.current.join('');
    const newPin = this.changePinForm.new.join('');
    const confirmPin = this.changePinForm.confirm.join('');

    // Validate all PINs are 6 digits
    if (currentPin.length !== 6 || !/^\d+$/.test(currentPin)) {
      this.changePinError = 'Current PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      this.changePinError = 'New PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    if (confirmPin.length !== 6 || !/^\d+$/.test(confirmPin)) {
      this.changePinError = 'Confirm PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    // Validate PIN confirmation
    if (newPin !== confirmPin) {
      this.changePinError = 'New PINs do not match.';
      this.changePinSuccess = '';
      return;
    }

    // Check if current PIN matches new PIN
    if (currentPin === newPin) {
      this.changePinError = 'New PIN cannot be the same as current PIN.';
      this.changePinSuccess = '';
      return;
    }

    // Success
    this.changePinError = '';
    this.changePinSuccess = 'PIN changed successfully!';
    setTimeout(() => {
      this.closeChangePinModal();
    }, 2000);
  }

  protected triggerCameraInput(): void {
    this.isPhotoCameraModalOpen = true;
    setTimeout(() => {
      void this.startProfileCamera();
    }, 100);
  }

  protected onPhotoCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.profilePhotoData = e.target?.result as string;
        console.log('Photo captured:', this.profilePhotoData);
      };
      reader.readAsDataURL(file);
    }
  }

  protected async startProfileCamera(): Promise<void> {
    this.cameraError = '';
    this.profilePhotoData = '';

    try {
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const video = this.profileCameraVideo?.nativeElement;
      if (video) {
        video.srcObject = this.profileCameraStream;
        await video.play();
      }
      this.hasCameraStream = true;
    } catch (error) {
      this.cameraError = 'Unable to access the camera. Please allow camera permissions.';
      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = null;
      this.hasCameraStream = false;
    }
  }

  protected captureProfilePhoto(): void {
    const video = this.profileCameraVideo?.nativeElement;
    const canvas = this.profileCameraCanvas?.nativeElement;
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
    this.profilePhotoData = canvas.toDataURL('image/jpeg', 0.9);
    this.stopProfileCamera();
  }

  protected retakeProfilePhoto(): void {
    void this.startProfileCamera();
  }

  protected closeProfilePhotoModal(): void {
    this.stopProfileCamera();
    this.isPhotoCameraModalOpen = false;
  }

  protected stopProfileCamera(): void {
    this.profileCameraStream?.getTracks().forEach((track) => track.stop());
    this.profileCameraStream = null;
    this.hasCameraStream = false;
    const video = this.profileCameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
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

  private resetBookingForm(): void {
    this.isDriving = false;
    this.visitorBookingForm = {
      visitorName: '',
      visitorSurname: '',
      visitorCell: '',
      visitorIdNumber: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleReg: '',
      vehicleColor: ''
    };
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected shareVisitorCode(code: string, visitorName: string, expiresIn: string): void {
    const message = encodeURIComponent(`Your visitor access code is: ${code}\n\nVisitor: ${visitorName}\nExpires: ${expiresIn}\n\nPlease share this with your visitor.`);
    const whatsappURL = `https://wa.me/?text=${message}`;
    window.open(whatsappURL, '_blank');
  }

  public ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
  }
}
