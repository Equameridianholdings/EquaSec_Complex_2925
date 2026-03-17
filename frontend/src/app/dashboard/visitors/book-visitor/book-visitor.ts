import { Pipe, PipeTransform, signal } from '@angular/core';

@Pipe({ name: 'safeUserName' })
export class SafeUserNamePipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    let name = `${value.name ?? ''} ${value.surname ?? ''}`.trim();
    // Mask or replace offensive words (add more as needed)
    const blacklist = [/nigg[a|er]/gi];
    blacklist.forEach((pattern) => {
      name = name.replace(pattern, '***');
    });
    return name;
  }
}

import { OnInit, Inject } from '@angular/core';
import { Component, inject, Optional } from '@angular/core';
import { StorageService } from '../../../services/storage.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { visitorDTO } from '../../../interfaces/visitorDTO';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmVisitor } from '../confirm-visitor/confirm-visitor';
import { DataService } from '../../../services/data.service';
import { vehicleDTO } from '../../../interfaces/vehicleDTO';

import { CommonModule } from '@angular/common';
import { Loader } from '../../../components/loader/loader';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
@Component({
  selector: 'app-book-visitor',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SafeUserNamePipe, Loader],
  templateUrl: './book-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class BookVisitor implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  residentSearch: any;
  protected hideTenantInput = false;
  constructor(@Optional() @Inject(MAT_DIALOG_DATA) public data: any) {
    if (data && data.data) {
      this.selectedUser = data.data;
      this.userSearch = `${data.data.name ?? ''} ${data.data.surname ?? ''}`.trim();
    }
  }
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedUser: any = null;
  userSearch: string = '';
  ngOnInit(): void {
    this.submitting.update(() => true);
    const currentUser = this.getCurrentUserFromStorage();
    if (this.isTenantUser(currentUser)) {
      this.hideTenantInput = true;
      this.selectedUser = currentUser;
      this.userSearch = `${currentUser?.name ?? ''} ${currentUser?.surname ?? ''}`.trim();
      this.filteredUsers = [];
      this.submitting.update(() => false);
      return;
    }

    // Fetch all users (residents/tenants) from the /user endpoint
    this.service.get<any>('user').subscribe({
      next: (response) => {
        let users = response && Array.isArray(response.payload) ? response.payload : [];
        // Get current guard's assigned complexes/communities from localStorage
        let assignedComplexes: string[] = [];
        let assignedCommunities: string[] = [];
        try {
          const rawUser = localStorage.getItem('current-user');
          if (rawUser) {
            const currentUser = JSON.parse(rawUser);
            assignedComplexes = Array.isArray(currentUser.assignedComplexes)
              ? currentUser.assignedComplexes
              : [];
            assignedCommunities = Array.isArray(currentUser.assignedCommunities)
              ? currentUser.assignedCommunities
              : [];
          }
        } catch (e) {
          this._snackBar.open('Could not parse current-user from localStorage', 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          console.warn(e);
        }
        // Only show users (tenants) that belong to the guard's assigned complexes/communities
        users = users.filter((u: any) => {
          // Complex match
          if (u.complex && u.complex._id && assignedComplexes.includes(u.complex._id)) return true;
          // Community match (if user has a communityId or similar field)
          if (u.communityId && assignedCommunities.includes(u.communityId)) return true;
          return false;
        });
        this.users = users;

        this.filteredUsers = this.users;
        // If resident was passed, ensure selectedUser is in users
        if (this.selectedUser) {
          const match = this.users.find((u) => u._id === this.selectedUser._id);
          if (match) {
            this.selectedUser = match;
            this.userSearch = `${match.name ?? ''} ${match.surname ?? ''}`.trim();
          }
        }

        this.submitting.update(() => false);
      },
      error: (error) => {
        const errorMessage = error?.error?.message ?? 'Unable to load residents.';
        this._snackBar.open(errorMessage, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.users = [];
        this.filteredUsers = [];
        this.submitting.update(() => false);
      },
    });
  }

  private getCurrentUserFromStorage(): any {
    try {
      const rawUser = localStorage.getItem('current-user');
      if (!rawUser) {
        return null;
      }
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private isTenantUser(user: any): boolean {
    const types = Array.isArray(user?.type) ? user.type : [user?.type];
    return types
      .map((value: any) =>
        String(value ?? '')
          .trim()
          .toLowerCase(),
      )
      .some((value: string) => value === 'tenant' || value === 'tenat');
  }

  onResidentSearchChange(): void {
    const query = this.residentSearch.trim().toLowerCase();
    this.filteredUsers = this.users.filter(
      (u) =>
        u &&
        typeof u === 'object' &&
        u._id &&
        `${u.name ?? ''} ${u.surname ?? ''}`.toLowerCase().includes(query),
    );
  }
  onUserSearchChange(): void {
    // Only allow search if resident is not already selected
    if (this.selectedUser) {
      // Prevent clearing the resident name if already selected
      this.userSearch = `${this.selectedUser.name ?? ''} ${this.selectedUser.surname ?? ''}`.trim();
      this.filteredUsers = [];
      // Do NOT clear selectedUser here!
      return;
    }
    const query = this.userSearch.trim().toLowerCase();
    // Only include real user objects in filteredUsers
    this.filteredUsers = this.users.filter(
      (u) =>
        u &&
        typeof u === 'object' &&
        u._id &&
        `${u.name ?? ''} ${u.surname ?? ''}`.toLowerCase().includes(query),
    );
  }

  selectUser(user: any): void {
    // Only assign if user is an object (not a string)
    if (user && typeof user === 'object' && user._id) {
      this.selectedUser = user;
      this.userSearch = `${user.name ?? ''} ${user.surname ?? ''}`.trim();
      this.filteredUsers = [];
    } else {
      // Defensive: never assign a string or invalid user
      this.selectedUser = null;
    }
  }
  service = inject(DataService);
  readonly dialogRef = inject(MatDialogRef<BookVisitor>);
  dialog = inject(MatDialog);

  newVehicle: vehicleDTO = {
    color: '',
    make: '',
    model: '',
    registrationNumber: '',
  };
  newVisitor: visitorDTO = {
    access: false,
    contact: '',
    destination: {
      house: false,
      number: 0,
      numberOfParkingBays: 0,
      users: []
    },
    driving: false,
    name: '',
    surname: '',
    validity: false
  };

  closeModal() {
    this.dialogRef.close();
  }

  openConfirmationModal() {
    this.submitting.update(() => true);
    if (this.data) {
      this.newVisitor.destination.users = [this.data.data];
    }
    
    if (!this.selectedUser) {
      this._snackBar.open('Please select a resident/tenant for this visitor.', 'close', {
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      this.submitting.update(() => false);
      return;
    }
    if (!this.newVisitor.driving) this.newVisitor.vehicle = undefined;
    else this.newVisitor.vehicle = this.newVehicle;

    this.dialog.open(ConfirmVisitor, {
      data: {
        data: this.newVisitor,
        endpoint: `${this.data.endpoint ? this.data.endpoint : "visitor/"}`
      },
    });
    this.submitting.update(() => false);
    this.dialogRef.close();
  }
}
