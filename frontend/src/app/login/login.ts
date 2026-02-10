import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly gatedCommunities = [
    {
      id: 'gated-paradise',
      name: 'Paradise Estate',
      houses: [
        { id: 'paradise-h1', name: 'House 1' },
        { id: 'paradise-h2', name: 'House 2' },
        { id: 'paradise-h5', name: 'House 5' },
        { id: 'paradise-h12', name: 'House 12' },
      ],
      complexes: [
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
          id: 'complex-harbor',
          name: 'Harbor Heights',
          units: [
            { id: 'harbor-11', name: 'Unit 11' },
            { id: 'harbor-12', name: 'Unit 12' },
            { id: 'harbor-21', name: 'Unit 21' },
            { id: 'harbor-22', name: 'Unit 22' },
          ],
        },
      ],
    },
    {
      id: 'gated-greenvalley',
      name: 'Green Valley Security Estate',
      houses: [
        { id: 'greenvalley-h3', name: 'House 3' },
        { id: 'greenvalley-h7', name: 'House 7' },
      ],
      complexes: [
        {
          id: 'complex-oakwood',
          name: 'Oakwood Manor',
          units: [
            { id: 'oakwood-1a', name: 'Unit 1A' },
            { id: 'oakwood-1b', name: 'Unit 1B' },
            { id: 'oakwood-2a', name: 'Unit 2A' },
          ],
        },
      ],
    },
  ];

  protected readonly standaloneComplexes = [
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
      id: 'complex-sunset',
      name: 'Sunset Towers',
      units: [
        { id: 'sunset-301', name: 'Unit 301' },
        { id: 'sunset-302', name: 'Unit 302' },
        { id: 'sunset-401', name: 'Unit 401' },
      ],
    },
  ];

  protected filteredUnits: Array<{ id: string; name: string }> = [];
  protected selectedGatedCommunityId = '';
  protected selectedGatedCommunityName = '';
  protected selectedComplexId = '';
  protected selectedUnitId = '';
  protected gatedCommunitySearch = '';
  protected complexSearch = '';
  protected unitSearch = '';
  protected selectedComplexName = '';
  protected selectedUnitName = '';
  protected isGatedCommunity = false;
  protected isGatedCommunityLocked = false;
  protected isComplexLocked = false;
  protected isUnitLocked = false;
  protected showGatedCommunityOptions = false;
  protected showComplexOptions = false;
  protected showUnitOptions = false;

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

  protected onPinKeydown(event: KeyboardEvent, index: number): void {
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

  protected updateGatedCommunitySearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) {
      return;
    }
    this.gatedCommunitySearch = input.value;
    this.showGatedCommunityOptions = true;
    if (this.isGatedCommunityLocked) {
      this.clearGatedCommunitySelection();
    }
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

  protected setGatedCommunityDropdown(visible: boolean): void {
    this.showGatedCommunityOptions = visible;
  }

  protected setUnitDropdown(visible: boolean): void {
    this.showUnitOptions = visible;
  }

  protected selectGatedCommunityOption(gatedCommunity: { id: string; name: string }): void {
    this.selectedGatedCommunityId = gatedCommunity.id;
    this.selectedGatedCommunityName = gatedCommunity.name;
    this.gatedCommunitySearch = gatedCommunity.name;
    this.isGatedCommunity = true;
    this.isGatedCommunityLocked = true;
    this.showGatedCommunityOptions = false;
    
    // Load houses from gated community as available units
    const selectedGC = this.gatedCommunities.find(gc => gc.id === gatedCommunity.id);
    this.filteredUnits = selectedGC?.houses || [];
    
    this.clearComplexSelection();
  }

  protected clearGatedCommunitySelection(): void {
    this.selectedGatedCommunityId = '';
    this.selectedGatedCommunityName = '';
    this.gatedCommunitySearch = '';
    this.isGatedCommunity = false;
    this.isGatedCommunityLocked = false;
    this.showGatedCommunityOptions = false;
    this.filteredUnits = [];
    this.clearComplexSelection();
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
    // Don't clear filteredUnits if we're in a gated community (houses should remain)
    if (!this.isGatedCommunity || !this.selectedGatedCommunityId) {
      this.filteredUnits = [];
    } else {
      // Restore houses from gated community
      const selectedGC = this.gatedCommunities.find(gc => gc.id === this.selectedGatedCommunityId);
      this.filteredUnits = selectedGC?.houses || [];
    }
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

  protected get filteredGatedCommunities(): Array<{ id: string; name: string }> {
    const query = this.gatedCommunitySearch.trim().toLowerCase();
    const communities = this.gatedCommunities.map(gc => ({ id: gc.id, name: gc.name }));
    
    if (!query) {
      return communities;
    }
    
    return communities.filter((community) => community.name.toLowerCase().includes(query));
  }

  protected get filteredComplexes(): Array<{ id: string; name: string; units: Array<{ id: string; name: string }> }> {
    const query = this.complexSearch.trim().toLowerCase();
    let complexes: Array<{ id: string; name: string; units: Array<{ id: string; name: string }> }> = [];
    
    // Get complexes based on gated community selection
    if (this.isGatedCommunity && this.selectedGatedCommunityId) {
      // Find the selected gated community and get its complexes
      const selectedGC = this.gatedCommunities.find(gc => gc.id === this.selectedGatedCommunityId);
      complexes = selectedGC?.complexes || [];
    } else {
      // Show standalone complexes
      complexes = this.standaloneComplexes;
    }
    
    // Filter by search query
    if (query) {
      complexes = complexes.filter((complex) => complex.name.toLowerCase().includes(query));
    }
    
    return complexes;
  }

  protected get filteredUnitOptions(): Array<{ id: string; name: string }> {
    const query = this.unitSearch.trim().toLowerCase();
    if (!query) {
      return this.filteredUnits;
    }
    return this.filteredUnits.filter((unit) => unit.name.toLowerCase().includes(query));
  }

  protected goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

}
