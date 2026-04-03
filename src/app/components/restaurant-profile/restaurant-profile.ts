// restaurant-profile-public.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// ── Enums ─────────────────────────────────────────────────────────────────────

enum PaymentWay {
  Pix  = 0,
  Cash = 1,
  Card = 2,
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicProfile {
  name: string;
  phone: string;
  restaurantCategory: string;
  description: string;
  noMinimumOrder: boolean;
  minimumOrderValue: number;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement: string;
  } | null;
  paymentWays: number[];
  openingHours: {
    dayOfWeek: number;
    openTime: string;   // "HH:mm:ss"
    closeTime: string;
  }[];
}

interface PaymentMethodDisplay {
  id: number;
  name: string;
  type: string;
  iconUrl: string;
  enabled: boolean;
}

interface OpeningHourDisplay {
  dayOfWeek: number;
  label: string;
  isOpen: boolean;
  isToday: boolean;
  openTime: string;
  closeTime: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-restaurant-profile-public',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyPipe],
  templateUrl: './restaurant-profile.html',
  styleUrls: ['./restaurant-profile.css'],
})
export class RestaurantProfilePublicComponent implements OnInit {

  restaurantId!: string;

  loading = true;
  error: string | null = null;

  profile!: PublicProfile;

  isOpen = false;
  statusLabel = '';
  nextOpenLabel = '';
  addressFormatted = '';
  mapsUrl = '';
  mapsEmbedUrl: SafeResourceUrl | null = null;

  openingHours: OpeningHourDisplay[] = [];
  enabledPaymentMethods: PaymentMethodDisplay[] = [];

  // ── Payment method catalogue (id = valor do enum no backend) ─────────────

  private readonly allMethods: Omit<PaymentMethodDisplay, 'enabled'>[] = [
    {
      id: PaymentWay.Pix,
      name: 'Pix',
      type: 'Pagamento instantâneo',
      iconUrl: 'https://logospng.org/download/pix/logo-pix-icone-512.png',
    },
    {
      id: PaymentWay.Cash,
      name: 'Dinheiro',
      type: 'Pagamento na entrega',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
    },
    {
      id: PaymentWay.Card,
      name: 'Cartão',
      type: 'Crédito ou débito',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/633/633611.png',
    },
  ];

  private readonly DAY_LABELS = [
    'Domingo', 'Segunda-feira', 'Terça-feira',
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado',
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('restaurantId')!;
    this.load();
  }

  // ── Load ───────────────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<PublicProfile>(`/api/Restaurants/${this.restaurantId}`).subscribe({
      next: (res) => {
        this.profile = res;
        this.buildOpeningHours(res.openingHours);
        this.buildPaymentMethods(res.paymentWays);
        this.buildAddress(res.address);
        this.computeOpenStatus();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Não foi possível carregar o perfil do restaurante.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Builders ───────────────────────────────────────────────────────────────

  private buildOpeningHours(raw: PublicProfile['openingHours']): void {
    const todayDow = new Date().getDay();

    this.openingHours = this.DAY_LABELS.map((label, dow) => {
      const entry = raw?.find(h => h.dayOfWeek === dow);
      return {
        dayOfWeek: dow,
        label,
        isOpen: !!entry,
        isToday: dow === todayDow,
        openTime:  entry ? entry.openTime.substring(0, 5)  : '',
        closeTime: entry ? entry.closeTime.substring(0, 5) : '',
      };
    });
  }

  private buildPaymentMethods(ways: number[]): void {
    if (!ways?.length) {
      this.enabledPaymentMethods = [];
      return;
    }

    // Garante comparação numérica independente do que vier da API
    const normalized = ways.map(v => Number(v));

    this.enabledPaymentMethods = this.allMethods
      .filter(m => normalized.includes(m.id))
      .map(m => ({ ...m, enabled: true }));
  }

  private buildAddress(addr: PublicProfile['address']): void {
    if (!addr) {
      this.addressFormatted = '';
      return;
    }

    const parts = [
      addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
      addr.complement,
      addr.neighborhood,
      addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
      addr.zipCode ? addr.zipCode : '',
      'Brasil',
    ].filter(Boolean);

    this.addressFormatted = parts.join(', ');

    const query = encodeURIComponent(this.addressFormatted);
    this.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    this.mapsEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${query}&output=embed&z=15`
    );
  }

  // ── Open status ────────────────────────────────────────────────────────────

  private computeOpenStatus(): void {
    const now = new Date();
    const todayDow = now.getDay();
    const todayEntry = this.openingHours.find(h => h.dayOfWeek === todayDow);

    if (todayEntry?.isOpen) {
      const [oh, om] = todayEntry.openTime.split(':').map(Number);
      const [ch, cm] = todayEntry.closeTime.split(':').map(Number);
      const nowMin   = now.getHours() * 60 + now.getMinutes();
      const openMin  = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (nowMin >= openMin && nowMin < closeMin) {
        this.isOpen = true;
        this.statusLabel = 'Aberto';
        this.nextOpenLabel = `Fecha às ${todayEntry.closeTime}h`;
        return;
      }

      if (nowMin < openMin) {
        this.isOpen = false;
        this.statusLabel = `Abre hoje às ${todayEntry.openTime}h`;
        this.nextOpenLabel = `Abre hoje às ${todayEntry.openTime}h`;
        return;
      }
    }

    for (let i = 1; i <= 7; i++) {
      const nextDow   = (todayDow + i) % 7;
      const nextEntry = this.openingHours.find(h => h.dayOfWeek === nextDow);
      if (nextEntry?.isOpen) {
        const label = i === 1 ? 'amanhã' : nextEntry.label.toLowerCase();
        this.isOpen = false;
        this.statusLabel  = `Abre ${label} às ${nextEntry.openTime}h`;
        this.nextOpenLabel = `Abre ${label} às ${nextEntry.openTime}h`;
        return;
      }
    }

    this.isOpen = false;
    this.statusLabel  = 'Fechado';
    this.nextOpenLabel = '';
  }

  // ── Icon fallback ──────────────────────────────────────────────────────────

  onIconError(event: Event, method: PaymentMethodDisplay): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.icon-fallback')) {
      const span = document.createElement('span');
      span.className = 'icon-fallback';
      span.textContent = method.name.charAt(0).toUpperCase();
      span.style.cssText = 'font-size:0.85rem;font-weight:700;color:#740300;';
      parent.appendChild(span);
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/delivery-home', this.restaurantId]);
  }
}