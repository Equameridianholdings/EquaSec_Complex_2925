import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnDestroy {
  @ViewChild('cameraVideo') private readonly cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('cameraCanvas') private readonly cameraCanvas?: ElementRef<HTMLCanvasElement>;

  protected readonly complexes = [
    {
      id: 'complex-skyline',
      name: 'Skyline Residences',
      units: [
        { id: 'skyline-101', name: 'Unit 101' },
        { id: 'skyline-102', name: 'Unit 102' },
        { id: 'skyline-203', name: 'Unit 203' },
        { id: 'skyline-305', name: 'Unit 305' },
      ],
    },
    {
      id: 'complex-riverview',
      name: 'Riverview Villas',
      units: [
        { id: 'riverview-a1', name: 'Unit A1' },
        { id: 'riverview-a2', name: 'Unit A2' },
        { id: 'riverview-b4', name: 'Unit B4' },
        { id: 'riverview-c6', name: 'Unit C6' },
      ],
    },
    {
      id: 'complex-harbor',
      name: 'Harbor Heights',
      units: [
        { id: 'harbor-11', name: 'Unit 11' },
        { id: 'harbor-12', name: 'Unit 12' },
        { id: 'harbor-21', name: 'Unit 21' },
        { id: 'harbor-22', name: 'Unit 22' },
      ],
    },
  ];

  protected filteredUnits: Array<{ id: string; name: string }> = [];
  protected selectedComplexId = '';
  protected selectedUnitId = '';
  protected complexSearch = '';
  protected unitSearch = '';
  protected selectedComplexName = '';
  protected selectedUnitName = '';
  protected isComplexLocked = false;
  protected isUnitLocked = false;
  protected showComplexOptions = false;
  protected showUnitOptions = false;
  protected idNumber = '';
  protected photoDataUrl = '';
  protected cameraError = '';
  protected hasCameraStream = false;
  private cameraStream: MediaStream | null = null;

  constructor(private readonly router: Router) {}

  protected onPinInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    input.classList.add('touched');
    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  protected onPinKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling;
      if (prev instanceof HTMLInputElement) {
        prev.focus();
      }
    }
  }

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected updateComplexSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.complexSearch = input.value;
    this.showComplexOptions = true;
    if (this.isComplexLocked) {
      this.clearComplexSelection();
    }
  }

  protected updateUnitSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.unitSearch = input.value;
    this.showUnitOptions = true;
    if (this.isUnitLocked) {
      this.clearUnitSelection();
    }
  }

  protected setComplexDropdown(visible: boolean): void {
    this.showComplexOptions = visible;
  }

  protected setUnitDropdown(visible: boolean): void {
    this.showUnitOptions = visible;
  }

  protected selectComplex(complex: { id: string; name: string; units: Array<{ id: string; name: string }> }): void {
    this.selectedComplexId = complex.id;
    this.selectedComplexName = complex.name;
    this.complexSearch = complex.name;
    this.filteredUnits = complex.units;
    this.selectedUnitId = '';
    this.selectedUnitName = '';
    this.unitSearch = '';
    this.isComplexLocked = true;
    this.isUnitLocked = false;
    this.showComplexOptions = false;
  }

  protected clearComplexSelection(): void {
    this.selectedComplexId = '';
    this.selectedComplexName = '';
    this.complexSearch = '';
    this.filteredUnits = [];
    this.selectedUnitId = '';
    this.selectedUnitName = '';
    this.unitSearch = '';
    this.isComplexLocked = false;
    this.isUnitLocked = false;
    this.showComplexOptions = false;
    this.showUnitOptions = false;
  }

  protected selectUnit(unit: { id: string; name: string }): void {
    this.selectedUnitId = unit.id;
    this.selectedUnitName = unit.name;
    this.unitSearch = unit.name;
    this.isUnitLocked = true;
    this.showUnitOptions = false;
  }

  protected clearUnitSelection(): void {
    this.selectedUnitId = '';
    this.selectedUnitName = '';
    this.unitSearch = '';
    this.isUnitLocked = false;
    this.showUnitOptions = false;
  }

  protected get filteredComplexes(): Array<{ id: string; name: string; units: Array<{ id: string; name: string }> }> {
    const query = this.complexSearch.trim().toLowerCase();
    if (!query) {
      return this.complexes;
    }
    return this.complexes.filter((complex) => complex.name.toLowerCase().includes(query));
  }

  protected get filteredUnitOptions(): Array<{ id: string; name: string }> {
    const query = this.unitSearch.trim().toLowerCase();
    if (!query) {
      return this.filteredUnits;
    }
    return this.filteredUnits.filter((unit) => unit.name.toLowerCase().includes(query));
  }

  protected updateIdNumber(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }

    const digitsOnly = (input.value || '').replace(/\D/g, '').slice(0, 13);
    input.value = digitsOnly;
    this.idNumber = digitsOnly;
  }

  protected async startCamera(): Promise<void> {
    this.cameraError = '';
    this.photoDataUrl = '';

    try {
      this.cameraStream?.getTracks().forEach((track) => track.stop());
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      const video = this.cameraVideo?.nativeElement;
      if (video) {
        video.srcObject = this.cameraStream;
        await video.play();
      }
      this.hasCameraStream = true;
    } catch (error) {
      this.cameraError = 'Unable to access the camera. Please allow camera permissions.';
      this.cameraStream?.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
      this.hasCameraStream = false;
    }
  }

  protected capturePhoto(): void {
    const video = this.cameraVideo?.nativeElement;
    const canvas = this.cameraCanvas?.nativeElement;
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
    this.photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.stopCamera();
  }

  protected retakePhoto(): void {
    void this.startCamera();
  }

  protected stopCamera(): void {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    this.hasCameraStream = false;
    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  public ngOnDestroy(): void {
    this.stopCamera();
  }

  protected goToGuardPortal(): void {
    void this.router.navigate(['/login']);
  }
}
