import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'safeUserName' })
export class SafeUserNamePipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    let name = `${value.name ?? ''} ${value.surname ?? ''}`.trim();
    // Mask or replace offensive words (add more as needed)
    const blacklist = [/nigg[a|er]/gi];
    blacklist.forEach(pattern => {
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
@Component({
  selector: 'app-book-visitor',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SafeUserNamePipe],
  templateUrl: './book-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class BookVisitor implements OnInit {
residentSearch: any;
  constructor(@Optional() @Inject(MAT_DIALOG_DATA) public data: any) {
    if (data && data.resident) {
      this.selectedUser = data.resident;
      this.userSearch = `${data.resident.name ?? ''} ${data.resident.surname ?? ''}`.trim();
    }
  }
    users: any[] = [];
    filteredUsers: any[] = [];
    selectedUser: any = null;
    userSearch: string = '';
    ngOnInit(): void {
      // Fetch all users (residents/tenants) from the /user endpoint
      this.service.get<any>('user').subscribe(response => {
        console.log('[BookVisitor][ngOnInit] users from API:', response);
        let users = response && Array.isArray(response.payload) ? response.payload : [];
        // Get current guard's assigned complexes/communities from localStorage
        let assignedComplexes: string[] = [];
        let assignedCommunities: string[] = [];
        try {
          const rawUser = localStorage.getItem('current-user');
          if (rawUser) {
            const currentUser = JSON.parse(rawUser);
            assignedComplexes = Array.isArray(currentUser.assignedComplexes) ? currentUser.assignedComplexes : [];
            assignedCommunities = Array.isArray(currentUser.assignedCommunities) ? currentUser.assignedCommunities : [];
          }
        } catch (e) { console.warn('Could not parse current-user from localStorage', e); }
        // Only show users (tenants) that belong to the guard's assigned complexes/communities
        users = users.filter((u: any) => {
          // Complex match
          if (u.complex && u.complex._id && assignedComplexes.includes(u.complex._id)) return true;
          // Community match (if user has a communityId or similar field)
          if (u.communityId && assignedCommunities.includes(u.communityId)) return true;
          return false;
        });
        this.users = users;
        console.log('[BookVisitor][ngOnInit] filtered users:', this.users);
        this.filteredUsers = this.users;
        // If resident was passed, ensure selectedUser is in users
        if (this.selectedUser) {
          const match = this.users.find(u => u._id === this.selectedUser._id);
          if (match) {
            this.selectedUser = match;
            this.userSearch = `${match.name ?? ''} ${match.surname ?? ''}`.trim();
          }
        }
      });
    }


  onResidentSearchChange(): void {
    const query = this.residentSearch.trim().toLowerCase();
    this.filteredUsers = this.users.filter(u =>
      u && typeof u === 'object' && u._id && (`${u.name ?? ''} ${u.surname ?? ''}`.toLowerCase().includes(query))
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
      this.filteredUsers = this.users.filter(u =>
        u && typeof u === 'object' && u._id && (`${u.name ?? ''} ${u.surname ?? ''}`.toLowerCase().includes(query))
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

  visitorIdNumber: string = '' //Encryption still in dev
  newVehicle: vehicleDTO = {
    colour: '',
    make: '',
    model: '',
    registrationNumber: ''
  }; 
  newVisitor: visitorDTO = {
    access: true,
    contact: '',
    driving: false,
    name: '',
    surname: '',
    validity: true,
    vehicle: {
      make: '',
      model: '',
      registrationNumber: '',
      colour: ''
    },
  };

  closeModal() {
    this.dialogRef.close();
  }

  openConfirmationModal() {
    console.log('[openConfirmationModal] selectedUser:', this.selectedUser);
    if (!this.selectedUser) {
      alert('Please select a resident/tenant for this visitor.');
      return;
    }
    if (!this.newVisitor.driving) 
      this.newVisitor.vehicle = undefined;
    else
      this.newVisitor.vehicle = this.newVehicle;
    // Accept selectedUser with _id, id, or (complexId or gatedCommunityId)
    if (
      this.selectedUser && typeof this.selectedUser === 'object' && (
        this.selectedUser._id ||
        this.selectedUser.id ||
        this.selectedUser.complexId ||
        this.selectedUser.gatedCommunityId
      )
    ) {
      // Only include allowed fields for the user object
      const allowedFields = [
        '_id', 'cellNumber', 'emailAddress', 'idNumber', 'movedOut', 'name', 'profilePhoto', 'surname',
        // Optionally include: 'complex', 'complexId', 'gatedCommunityId', 'unit', 'houseNumber', etc.
        'complex', 'complexId', 'gatedCommunityId', 'unit', 'houseNumber'
      ];
      const sanitizedUser: any = {};
      for (const key of allowedFields) {
        if (this.selectedUser[key] !== undefined) {
          sanitizedUser[key] = this.selectedUser[key];
        }
      }
      // Mask offensive words in name and surname
      const mask = (str: string) => str?.replace(/nigg[a|er]/gi, '***');
      if (sanitizedUser.name) sanitizedUser.name = mask(sanitizedUser.name);
      if (sanitizedUser.surname) sanitizedUser.surname = mask(sanitizedUser.surname);
      this.newVisitor.user = sanitizedUser;
      console.log('[openConfirmationModal] newVisitor.user:', this.newVisitor.user);
    } else {
      console.error('[openConfirmationModal] Invalid selectedUser:', this.selectedUser);
      alert('Invalid resident/tenant selected. Please try again.');
      return;
    }
    this.dialog.open(ConfirmVisitor, {
      data: { ...this.newVisitor },
    });
    this.dialogRef.close();
  }
}
