import { Component, inject, Input, OnDestroy, OnInit, signal, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { getHours, shareCode, visitorDTO } from '../../interfaces/visitorDTO';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { DataService } from '../../services/data.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-visitor-card',
  imports: [],
  templateUrl: './visitor-card.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class VisitorCard implements OnInit, OnDestroy {
  @Input() gaurd!: boolean;
  @Input() visitor!: visitorDTO;
  hours!: number;
  submitting = signal(false);
  showConfirmModal = signal(false);
  showIdModal = signal(false);
  showDiskModal = signal(false);
  selectedIdType = signal<string>('');
  capturedPhoto = signal<string | null>(null);
  diskPhoto = signal<string | null>(null);
  cameraActive = signal(false);
  private cameraStream: MediaStream | null = null;
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  dataService = inject(DataService)
  granted = signal(false)

  @ViewChildren('cameraPreview') cameraPreviewList!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChildren('photoCanvas') photoCanvasList!: QueryList<ElementRef<HTMLCanvasElement>>;

  private get cameraPreviewRef() { return this.cameraPreviewList?.first; }
  private get photoCanvasRef() { return this.photoCanvasList?.first; }

  ngOnInit(): void {
    this.hours = getHours(this.visitor);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  shareVisitorCode() {
    shareCode(this.visitor);
  }

  private showToast(message: string): void {
    this._snackBar.open(message, 'close', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  protected onGrantAccess(code: visitorDTO): void {
    if (!code) return;
    this.selectedIdType.set('');
    this.capturedPhoto.set(null);
    this.diskPhoto.set(null);
    this.cameraActive.set(false);
    this.showIdModal.set(true);
  }

  protected openCamera(): void {
    setTimeout(() => this.startCamera(), 50);
  }

  protected onIdTypeChange(event: Event): void {
    this.selectedIdType.set((event.target as HTMLSelectElement).value);
  }

  protected async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.cameraStream = stream;
      this.cameraActive.set(true);
      // Wait for Angular to render the video element before assigning the stream
      setTimeout(() => {
        const video = this.cameraPreviewRef?.nativeElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => this.showToast('Could not start camera preview.'));
        }
      }, 80);
    } catch {
      this.showToast('Camera access denied or not available.');
    }
  }

  protected capturePhoto(): void {
    const video = this.cameraPreviewRef?.nativeElement;
    const canvas = this.photoCanvasRef?.nativeElement;
    if (!video || !canvas) return;
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;
    if (!w || !h) {
      this.showToast('Camera not ready, please try again.');
      return;
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
    this.capturedPhoto.set(canvas.toDataURL('image/jpeg'));
    this.stopCamera();
  }

  protected retakePhoto(): void {
    this.capturedPhoto.set(null);
    setTimeout(() => this.startCamera(), 50);
  }

  protected captureDiskPhoto(): void {
    const video = this.cameraPreviewRef?.nativeElement;
    const canvas = this.photoCanvasRef?.nativeElement;
    if (!video || !canvas) return;
    const w = video.videoWidth || video.clientWidth;
    const h = video.videoHeight || video.clientHeight;
    if (!w || !h) {
      this.showToast('Camera not ready, please try again.');
      return;
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
    this.diskPhoto.set(canvas.toDataURL('image/jpeg'));
    this.stopCamera();
  }

  protected retakeDiskPhoto(): void {
    this.diskPhoto.set(null);
    setTimeout(() => this.startCamera(), 50);
  }

  protected stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    this.cameraActive.set(false);
  }

  protected proceedToConfirm(): void {
    this.stopCamera();
    this.showIdModal.set(false);
    if (this.visitor.driving) {
      this.diskPhoto.set(null);
      this.showDiskModal.set(true);
    } else {
      this.showConfirmModal.set(true);
    }
  }

  protected cancelDiskModal(): void {
    this.stopCamera();
    this.diskPhoto.set(null);
    this.showDiskModal.set(false);
  }

  protected proceedFromDisk(): void {
    this.stopCamera();
    this.showDiskModal.set(false);
    this.showConfirmModal.set(true);
  }

  protected cancelIdModal(): void {
    this.stopCamera();
    this.capturedPhoto.set(null);
    this.selectedIdType.set('');
    this.showIdModal.set(false);
  }

  protected cancelGrant(): void {
    this.showConfirmModal.set(false);
    this.selectedIdType.set('');
    this.capturedPhoto.set(null);
    this.diskPhoto.set(null);
  }

  protected confirmGrant(): void {
    this.showConfirmModal.set(false);
    const code = this.visitor;
    if (!code) {
      this.showToast('Access granted');
      return;
    }

    const targetVisitorId = String(code._id ?? '').trim();

    code.validity = false;
    code.access = true;

    if (targetVisitorId) {
      this.dataService
        .put<ResponseBody>(`visitor/grant`, {
          _id: targetVisitorId,
          validity: false,
          access: true,
          expiry: code.expiry ?? null,
          idPhoto: this.capturedPhoto() ?? undefined,
          diskPhoto: this.diskPhoto() ?? undefined,
        })
        .subscribe({
          next: (res) => {
            this.showToast(res.message);
            this.granted.update(() => true);
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          },
          error: () => {
            this.showToast('Access not granted');
          },
        });
    }
  }
}
