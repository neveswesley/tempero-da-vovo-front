// restaurant-profile-public.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  paymentMethods: string[];       // array of method IDs
  openingHours: {
    dayOfWeek: number;            // 0 = Sunday
    openTime: string;             // "HH:mm:ss"
    closeTime: string;
  }[];
}

interface PaymentMethodDisplay {
  id: string;
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

  // ── Payment method catalogue ─────────────────────────────────────────────

  private readonly allMethods: Omit<PaymentMethodDisplay, 'enabled'>[] = [
    {
      id: 'pix',
      name: 'Pix',
      type: 'Pagamento online',
      iconUrl: 'https://logospng.org/download/pix/logo-pix-icone-512.png',
    },
    {
      id: 'credit_online',
      name: 'Cartão de crédito (Online)',
      type: 'Pagamento online',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/633/633611.png',
    },
    {
      id: 'debit_online',
      name: 'Cartão de débito (Online)',
      type: 'Pagamento online',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/633/633611.png',
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      type: 'Pagamento online',
      iconUrl: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/googlepay.svg',
    },
    {
      id: 'nubank',
      name: 'Nubank',
      type: 'Pagamento online',
      iconUrl: 'https://logodownload.org/wp-content/uploads/2019/10/nubank-logo-0.png',
    },
    {
      id: 'cash',
      name: 'Dinheiro',
      type: 'Pagamento na entrega',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png',
    },
    {
      id: 'credit_delivery',
      name: 'Cartão de crédito',
      type: 'Pagamento na entrega',
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/633/633611.png',
    },
    {
      id: 'debit_delivery',
      name: 'Cartão de débito',
      type: 'Pagamento na entrega',
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
        this.buildPaymentMethods(res.paymentMethods);
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

  private buildPaymentMethods(ids: string[]): void {
    if (!ids?.length) {
      this.enabledPaymentMethods = [];
      return;
    }
    this.enabledPaymentMethods = ids
      .map(id => {
        const meta = this.allMethods.find(m => m.id === id);
        return meta ? { ...meta, enabled: true } : null;
      })
      .filter((m): m is PaymentMethodDisplay => m !== null);
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
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const openMin  = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (nowMin >= openMin && nowMin < closeMin) {
        this.isOpen = true;
        this.statusLabel = 'Aberto';
        this.nextOpenLabel = `Fecha às ${todayEntry.closeTime}h`;
        return;
      }

      // Before opening today
      if (nowMin < openMin) {
        this.isOpen = false;
        this.statusLabel = `Abre hoje às ${todayEntry.openTime}h`;
        this.nextOpenLabel = `Abre hoje às ${todayEntry.openTime}h`;
        return;
      }
    }

    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDow = (todayDow + i) % 7;
      const nextEntry = this.openingHours.find(h => h.dayOfWeek === nextDow);
      if (nextEntry?.isOpen) {
        const label = i === 1 ? 'amanhã' : nextEntry.label.toLowerCase();
        this.isOpen = false;
        this.statusLabel = `Abre ${label} às ${nextEntry.openTime}h`;
        this.nextOpenLabel = `Abre ${label} às ${nextEntry.openTime}h`;
        return;
      }
    }

    this.isOpen = false;
    this.statusLabel = 'Fechado';
    this.nextOpenLabel = '';
  }

  // ── Icon fallback ──────────────────────────────────────────────────────────

  onIconError(event: Event, method: PaymentMethodDisplay): void {
    const img = event.target as HTMLImageElement;
    // Render the first letter as fallback by hiding the broken image
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