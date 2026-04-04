import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

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

  form: any = {
    name: '',
    description: '',
    restaurantCategory: null,
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

  // ✅ CORRIGIDO
  loadStore(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${environment.apiUrl}/api/Restaurants/${this.restaurantId}`)
      .subscribe({
        next: (res) => {
          this.form = res;
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

  openSaveModal(): void {
    this.saveError = null;
    this.showSaveModal = true;
  }

  closeSaveModal(): void {
    this.showSaveModal = false;
  }

  confirmSave(): void {
    this.saving = true;
    this.saveError = null;

    const payload = {
      ...this.form,
      phone: this.form.phone.replace(/\D/g, ''),
    };

    this.http.put(`${environment.apiUrl}/api/restaurants/${this.restaurantId}`, payload)
      .subscribe({
        next: () => {
          this.saving = false;
          this.showSaveModal = false;
          this.loadStore();
        },
        error: (err) => {
          this.saving = false;
          this.showSaveModal = false;
          const messages: string[] = err?.error?.errors ?? [];
          this.saveError = messages.length
            ? messages.join(' ')
            : 'Erro ao salvar.';
        },
      });
  }
}