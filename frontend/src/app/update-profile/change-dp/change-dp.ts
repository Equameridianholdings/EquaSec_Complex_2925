import { Component, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../../interfaces/userDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-change-dp',
  imports: [FormsModule],
  templateUrl: './change-dp.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class ChangeDp {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);
  dialogRef = inject(MatDialogRef<ChangeDp>);
  user: UserDTO = inject(MAT_DIALOG_DATA);

  @ViewChild('profileCameraVideo')
  private readonly profileCameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('profileCameraCanvas')
  private readonly profileCameraCanvas?: ElementRef<HTMLCanvasElement>;

  profilePhotoData = signal("");
  cameraError = signal('');
  hasCameraStream = signal(false);
  flashEnabled = signal(false);
  flashSupported = signal(false);
  private profileCameraStream: MediaStream | null = null;

  closeModal() {
    this.stopProfileCamera();
    this.dialogRef.close();
  }

  private async waitForProfileCameraVideo(
    maxAttempts = 12,
    delayMs = 50,
  ): Promise<HTMLVideoElement | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const video = this.profileCameraVideo?.nativeElement;
      if (video) {
        return video;
      }
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
    return null;
  }

  private async requestCameraStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
  }

  captureProfilePhoto() {
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
    const photo = canvas.toDataURL('image/jpeg', 0.5);
    this.profilePhotoData.update(() => photo.toString());
    this.stopProfileCamera();
  }

  async startProfileCamera() {
    this.cameraError.update(() => '');
    this.profilePhotoData.update(() => '');

    try {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        this.cameraError.update(() => 'Camera is blocked on mobile over insecure HTTP. Use HTTPS (or localhost) and allow camera permission.');
        this.hasCameraStream.update(() => false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        this.cameraError.update(() => 'Camera is not supported in this browser.');
        this.hasCameraStream.update(() => false);
        return;
      }

      const video = await this.waitForProfileCameraVideo();
      if (!video) {
        this.cameraError.update(() => 'Camera preview is not ready. Please try again.');
        this.hasCameraStream.update(() => false);
        return;
      }

      this.profileCameraStream?.getTracks().forEach((track) => track.stop());
      this.profileCameraStream = await this.requestCameraStream();

      const videoTrack = this.profileCameraStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        throw new Error('No active camera track');
      }

      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      this.flashSupported.set(!!(capabilities?.torch));
      this.flashEnabled.set(false);

      video.srcObject = this.profileCameraStream;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
      });

      await video.play();
      this.hasCameraStream.update(() => true);
    } catch (error: unknown) {
      const errorName =
        error && typeof error === 'object' && 'name' in error
          ? String((error as { name?: unknown }).name ?? '')
          : '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        this.cameraError.update(() => 'Camera permission was denied. Please allow camera access in browser settings.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.cameraError.update(() => 'No camera device was found on this phone.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        this.cameraError.update(() => 'Camera is currently in use by another app. Close that app and try again.');
      } else if (errorName === 'OverconstrainedError') {
        this.cameraError.update(() => 'Requested camera settings are not supported on this device.');
      } else {
        this.cameraError.update(() => 'Unable to access the camera. Please allow camera permissions.');
      }
      this.stopProfileCamera();
    }
  }

  retakeProfilePhoto() {
    void this.startProfileCamera();
  }

  async toggleFlash(): Promise<void> {
    const track = this.profileCameraStream?.getVideoTracks()[0];
    if (!track || !this.flashSupported()) {
      return;
    }
    const newState = !this.flashEnabled();
    try {
      await track.applyConstraints({ advanced: [{ torch: newState } as MediaTrackConstraintSet] });
      this.flashEnabled.set(newState);
    } catch {
      this.flashSupported.set(false);
    }
  }

  useCapturedProfilePhoto(): void {
    this.submitting.update(() => true);
    this.stopProfileCamera();
    // TODO: Validations on data

    this.service.put<ResponseBody>('user/update', { profilePhoto: this.profilePhotoData()}).subscribe({
      next: (res) => {
        this._snackBar.open(res.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        this.closeModal();
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
      },
    });
    
    this.dialogRef.close(this.profilePhotoData || null);
  }

  private stopProfileCamera(): void {
    const track = this.profileCameraStream?.getVideoTracks()[0];
    if (track && this.flashEnabled()) {
      void track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => {});
    }
    this.profileCameraStream?.getTracks().forEach((t) => t.stop());
    this.profileCameraStream = null;
    this.hasCameraStream.update(() => false);
    this.flashEnabled.set(false);
    this.flashSupported.set(false);
    const video = this.profileCameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  ngOnDestroy(): void {
    this.stopProfileCamera();
  }
}
