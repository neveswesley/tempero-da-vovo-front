// payment.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

export enum PaymentWay {
  Pix = 0,
  Cash = 1,
  Card = 2
}

interface PaymentMethodItem {
  id: PaymentWay;
  name: string;
  type: string;
  emoji: string;
  selected: boolean;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.css'],
})
export class PaymentComponent implements OnInit {

  restaurantId!: string;

  loading = true;
  error: string | null = null;
  saving = false;
  saveError: string | null = null;
  showSaveModal = false;

  paymentMethods: PaymentMethodItem[] = [
    { id: PaymentWay.Cash, name: 'Dinheiro', type: 'Pagamento na entrega', emoji: '💵', selected: false },
    { id: PaymentWay.Card, name: 'Cartão', type: 'Crédito ou débito', emoji: '💳', selected: false },
    { id: PaymentWay.Pix, name: 'Pix', type: 'Pagamento instantâneo', emoji: '⚡', selected: false },
  ];

  get selectedCount(): number {
    return this.paymentMethods.filter(m => m.selected).length;
  }

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.restaurantId =
      this.route.snapshot.parent?.parent?.paramMap.get('restaurantId') ??
      this.route.snapshot.parent?.paramMap.get('restaurantId') ??
      this.route.snapshot.paramMap.get('restaurantId')!;

    this.load();
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  load(): void {

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<{ paymentWays: any[] }>(`${environment.apiUrl}/api/restaurants/${this.restaurantId}`).subscribe({
      next: (res) => {
        console.log('resposta da api:', res);
        const saved = (res.paymentWays ?? []).map(v => Number(v));
        this.paymentMethods.forEach(m => m.selected = saved.includes(Number(m.id)));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Não foi possível carregar as formas de pagamento.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Toggle ─────────────────────────────────────────────────────────────────

  toggle(method: PaymentMethodItem): void {
    method.selected = !method.selected;
    this.saveError = null;
  }

  // ── Modal ──────────────────────────────────────────────────────────────────

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
      paymentWays: this.paymentMethods.filter(m => m.selected).map(m => m.id),
    };

    this.http.put(`${environment.apiUrl}/api/restaurants/update-payment-way/${this.restaurantId}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showSaveModal = false;
        this.load();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.showSaveModal = false;
        const messages: string[] = err?.error?.errors
          ? Object.values(err.error.errors).flat() as string[]
          : [];
        this.saveError = messages.length
          ? messages.join(' ')
          : 'Erro ao salvar. Verifique os dados e tente novamente.';
        this.cdr.markForCheck();
      },
    });
  }
}