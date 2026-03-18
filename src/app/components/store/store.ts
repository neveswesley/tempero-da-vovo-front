// store.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

interface AddressForm {
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

interface StoreForm {
  name: string;
  description: string;
  category: string;
  phone: string;
  address: AddressForm;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './store.html',
  styleUrls: ['./store.css'],
})
export class StoreComponent implements OnInit {

  restaurantId!: string;

  loading = true;
  error: string | null = null;
  saving = false;
  saveError: string | null = null;
  showSaveModal = false;
  fetchingCep = false;

  // Name change restriction
  nameBlocked = false;
  nameWarning: string | null = null;
  daysUntilNameChange = 0;
  lastNameChangedAt: Date | null = null;

  form: StoreForm = {
    name: '',
    description: '',
    category: '',
    phone: '',
    address: {
      zipCode: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      complement: '',
    },
  };

  categories = [
    { value: 'brazilian', label: 'Brasileira' },
    { value: 'pizza', label: 'Pizzaria' },
    { value: 'hamburger', label: 'Hamburguer' },
    { value: 'japanese', label: 'Japonesa' },
    { value: 'arabic', label: 'Árabe' },
    { value: 'italian', label: 'Italiana' },
    { value: 'chinese', label: 'Chinesa' },
    { value: 'seafood', label: 'Frutos do Mar' },
    { value: 'vegetarian', label: 'Vegetariana' },
    { value: 'desserts', label: 'Sobremesas' },
    { value: 'bakery', label: 'Padaria' },
    { value: 'snacks', label: 'Lanches' },
    { value: 'other', label: 'Outros' },
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.parent?.parent?.paramMap.get('restaurantId')
      ?? this.route.snapshot.parent?.paramMap.get('restaurantId')
      ?? this.route.snapshot.paramMap.get('restaurantId')!;
    this.loadStore();
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  loadStore(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<any>(`/api/restaurants/${this.restaurantId}`).subscribe({
      next: (res) => {
        this.applyResponse(res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Não foi possível carregar as informações da loja.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private applyResponse(res: any): void {
    this.form.name = res.name ?? '';
    this.form.description = res.description ?? '';
    this.form.category = res.category ?? '';
    this.form.phone = res.phone ?? '';

    if (res.address) {
      this.form.address = {
        zipCode: res.address.zipCode ?? '',
        street: res.address.street ?? '',
        number: res.address.number ?? '',
        neighborhood: res.address.neighborhood ?? '',
        city: res.address.city ?? '',
        state: res.address.state ?? '',
        complement: res.address.complement ?? '',
      };
    }

    // Name change restriction — 60 days
    if (res.lastNameChangedAt) {
      this.lastNameChangedAt = new Date(res.lastNameChangedAt);
      const daysSince = this.daysSince(this.lastNameChangedAt);

      if (daysSince < 60) {
        this.daysUntilNameChange = 60 - daysSince;
        this.nameBlocked = true;
        this.nameWarning = null;
      } else if (daysSince < 70) {
        this.nameBlocked = false;
        this.nameWarning = 'Após alterar, o nome ficará bloqueado por 60 dias.';
      } else {
        this.nameBlocked = false;
        this.nameWarning = null;
      }
    } else {
      this.nameBlocked = false;
      this.nameWarning = 'Após alterar, o nome ficará bloqueado por 60 dias.';
    }
  }

  private daysSince(date: Date): number {
    const ms = Date.now() - date.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  // ── CEP autocomplete ───────────────────────────────────────────────────────

  onZipCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').substring(0, 8);

    // Format: 00000-000
    if (digits.length > 5) {
      digits = digits.substring(0, 5) + '-' + digits.substring(5);
    }

    this.form.address.zipCode = digits;
    input.value = digits;

    if (digits.replace('-', '').length === 8) {
      this.fetchCep(digits.replace('-', ''));
    }
  }

  private fetchCep(cep: string): void {
    this.fetchingCep = true;
    this.cdr.markForCheck();

    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (res) => {
        if (!res.erro) {
          this.form.address.street = res.logradouro ?? '';
          this.form.address.neighborhood = res.bairro ?? '';
          this.form.address.city = res.localidade ?? '';
          this.form.address.state = res.uf ?? '';
        }
        this.fetchingCep = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.fetchingCep = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Phone mask ─────────────────────────────────────────────────────────────

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let digits = input.value.replace(/\D/g, '').substring(0, 11);

    if (digits.length > 10) {
      digits = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length > 6) {
      digits = `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    } else if (digits.length > 2) {
      digits = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    } else if (digits.length > 0) {
      digits = `(${digits}`;
    }

    this.form.phone = digits;
    input.value = digits;
  }

  // ── Save modal ─────────────────────────────────────────────────────────────

  openSaveModal(): void {
    this.saveError = null;
    this.showSaveModal = true;
  }

  closeSaveModal(): void {
    this.showSaveModal = false;
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  confirmSave(): void {
    this.saving = true;
    this.saveError = null;
    this.cdr.markForCheck();

    const payload = {
      ...this.form,
      phone: this.form.phone.replace(/\D/g, ''), // envia só dígitos
    };

    this.http.put(`/api/restaurants/${this.restaurantId}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showSaveModal = false;
        this.loadStore();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.showSaveModal = false;
        const messages: string[] = err?.error?.errors ?? [];
        this.saveError = messages.length
          ? messages.join(' ')
          : 'Erro ao salvar. Verifique os dados e tente novamente.';
        this.cdr.markForCheck();
      },
    });
  }
}