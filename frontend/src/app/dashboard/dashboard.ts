import { MatDialog } from '@angular/material/dialog';
import { Component, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookVisitor } from './visitors/book-visitor/book-visitor';
import { Visitors } from "./visitors/visitors";
import { UpdateProfile } from '../update-profile/update-profile';
import { ChangePin } from '../update-profile/change-pin/change-pin';
import { StorageService } from '../services/storage.service';
import { UserDTO } from '../interfaces/userDTO';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, Visitors],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profileCameraVideo') private readonly profileCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('profileCameraCanvas') private readonly profileCameraCanvas?: ElementRef<HTMLCanvasElement>;

  user!: UserDTO;

  protected isHoldingSos = false;
  protected showSosSuccess = false;

  protected profilePhotoData = '';

  protected cameraError = '';
  protected hasCameraStream = false;
  protected isPhotoCameraModalOpen = false;
  private profileCameraStream: MediaStream | null = null;
  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  protected readonly profileName = 'Kamo';
  protected readonly profilePhotoUrl = '';

  // Unit residents and vehicles
  protected unitResidents = [
    {
      name: 'Kamo Moloi',
      email: 'kamo.moloi@example.com',
      phone: '+27 82 555 0198',
      idNumber: '9012155123088',
    },
    {
      name: 'Sarah Moloi',
      email: 'sarah.moloi@example.com',
      phone: '+27 83 444 0123',
      idNumber: '8805205234089',
    },
  ];

  protected unitVehicles = [
    {
      make: 'Toyota',
      model: 'Corolla',
      reg: 'ABC 123 GP',
      color: 'Silver',
      owner: 'Kamo Moloi',
    },
    {
      make: 'Honda',
      model: 'Civic',
      reg: 'XYZ 456 GP',
      color: 'Blue',
      owner: 'Sarah Moloi',
    },
  ];

  constructor(private readonly router: Router) {}

  dialog = inject(MatDialog);
  storage = inject(StorageService);

  openBookingModal() {
    this.dialog.open(BookVisitor)
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

  openChangePinModal() {
    this.dialog.open(ChangePin);
  }

  openUpdateDetailsModal() {
    this.dialog.open(UpdateProfile);
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

  logout() {
    this.storage.removeItem("bearer-token");
    this.router.navigate(['/login']);
  }

  public ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
  }
}
