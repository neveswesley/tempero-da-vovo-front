// cart-expiry.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

const CART_ORDER_ID_KEY  = 'cartOrderId';
const CART_CREATED_AT_KEY = 'cartCreatedAt';
const EXPIRY_MS = 20 * 60 * 1000; // 20 minutos

@Injectable({ providedIn: 'root' })
export class CartExpiryService implements OnDestroy {

  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ── Chamado ao adicionar o primeiro item ──────────────────────────────────

  startTracking(orderId: string): void {
    localStorage.setItem(CART_ORDER_ID_KEY, orderId);
    localStorage.setItem(CART_CREATED_AT_KEY, Date.now().toString());
    this.startWatcher();
  }

  // ── Chamado ao abrir o carrinho (retorno de página) ───────────────────────

  resumeTracking(): void {
    const createdAt = Number(localStorage.getItem(CART_CREATED_AT_KEY));
    if (!createdAt) return;

    // Já expirou enquanto estava fora?
    if (Date.now() - createdAt >= EXPIRY_MS) {
      this.expire();
      return;
    }

    this.startWatcher();
  }

  // ── Chamado ao finalizar o pedido (não deve mais expirar) ─────────────────

  stopTracking(): void {
    this.clearInterval();
    localStorage.removeItem(CART_ORDER_ID_KEY);
    localStorage.removeItem(CART_CREATED_AT_KEY);
  }

  // ── Watcher ───────────────────────────────────────────────────────────────

  private startWatcher(): void {
    this.clearInterval();

    this.intervalRef = setInterval(() => {
      const createdAt = Number(localStorage.getItem(CART_CREATED_AT_KEY));
      if (!createdAt) { this.clearInterval(); return; }

      if (Date.now() - createdAt >= EXPIRY_MS) {
        this.expire();
      }
    }, 30_000); // verifica a cada 30s
  }

  private expire(): void {
    this.clearInterval();

    const orderId   = localStorage.getItem(CART_ORDER_ID_KEY);
    const restaurantId = localStorage.getItem('currentRestaurantId');

    // Notifica o backend
    if (orderId) {
      this.http.patch(`${environment.apiUrl}/api/Orders/abandon/${orderId}`, {}).subscribe();
    }

    // Limpa tudo
    localStorage.removeItem(CART_ORDER_ID_KEY);
    localStorage.removeItem(CART_CREATED_AT_KEY);
    localStorage.removeItem('clientSessionId');

    // Redireciona pro restaurante ou home
    if (restaurantId) {
      this.router.navigate(['/delivery-home', restaurantId]);
    } else {
      this.router.navigate(['/']);
    }
  }

  private clearInterval(): void {
    if (this.intervalRef !== null) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }
}