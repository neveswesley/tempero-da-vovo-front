import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Neighborhood {
  id: string;
  name: string;
  city: string;
  deliveryFee: number;
}

type AddressName = 'Home' | 'Work' | 'Friends';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './address.html',
  styleUrls: ['./address.css'],
})
export class AddressComponent implements OnInit {
  selectedNeighborhood: Neighborhood | null = null;

  // Campos do endereço
  street: string = '';
  number: string = '';
  noNumber: boolean = false;
  complement: string = '';
  reference: string = '';
  addressName: AddressName = 'Home';

  addressNameOptions: { value: AddressName; label: string }[] = [
    { value: 'Home', label: 'Casa' },
    { value: 'Work', label: 'Trabalho' },
    { value: 'Friends', label: 'Amigos' },
  ];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('selectedNeighborhood');
      if (stored) {
        this.selectedNeighborhood = JSON.parse(stored);
      }

      this.street = localStorage.getItem('addr_street') ?? '';
      this.number = localStorage.getItem('addr_number') ?? '';
      this.noNumber = localStorage.getItem('addr_noNumber') === 'true';
      this.complement = localStorage.getItem('addr_complement') ?? '';
      this.reference = localStorage.getItem('addr_reference') ?? '';
      this.addressName = (localStorage.getItem('addr_name') as AddressName) ?? 'Home';
    }
  }

  // Cidade vem direto do bairro selecionado
  get cityName(): string {
    return this.selectedNeighborhood?.city ?? '';
  }

  get isValid(): boolean {
    const numberOk = this.noNumber || this.number.trim().length > 0;
    return (
      this.street.trim().length > 0 &&
      numberOk &&
      !!this.selectedNeighborhood
    );
  }

  onNoNumberChange(): void {
    if (this.noNumber) this.number = '';
    this.cdr.detectChanges();
  }

  confirm(): void {
    if (!this.isValid) return;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('addr_street', this.street.trim());
      localStorage.setItem('addr_number', this.number.trim());
      localStorage.setItem('addr_noNumber', String(this.noNumber));
      localStorage.setItem('addr_complement', this.complement.trim());
      localStorage.setItem('addr_reference', this.reference.trim());
      localStorage.setItem('addr_name', this.addressName);
    }

    this.router.navigate(['/finalize-order']);
  }

  goBack(): void {
    this.router.navigate(['/finalize-order']);
  }

  formatPrice(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }
}