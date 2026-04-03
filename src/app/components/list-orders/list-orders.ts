import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { SignalrService } from '../../services/signalr.service';
import {
  Order,
  OrderStatus,
  DeliveryMode,
  PaymentWay,
  TimelineEvent,
  CancelOrderRequest,
  CancellationReasonType,
  CancellationRequestStatus,
} from '../../models/order.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: '../list-orders/list-orders.html',
  styleUrls: ['../list-orders/list-orders.css'],
})
export class OrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = true;
  error: string | null = null;

  OrderStatus = OrderStatus;
  DeliveryMode = DeliveryMode;
  PaymentWay = PaymentWay;
  CancellationReasonType = CancellationReasonType;

  showCancelModal = false;
  orderToCancel: Order | null = null;
  cancelReason: CancellationReasonType = CancellationReasonType.ChangedMind;
  cancelDescription: string = '';
  cancelError: string = '';

  showFeedbackModal = false;
  feedbackSuccess = false;

  cancellationRequestStatus?: number;

  feedbackMessage = '';

  get safeOrder(): Order {
    return this.selectedOrder as Order;
  }

  statusLabel: Record<OrderStatus, string> = {
    [OrderStatus.Draft]: 'Pedido criado',
    [OrderStatus.PendingConfirmation]: 'Aguardando confirmação',
    [OrderStatus.Preparing]: 'Em preparo',
    [OrderStatus.OnTheWay]: 'Saiu para entrega',
    [OrderStatus.Ready]: 'Pronto',
    [OrderStatus.CancellationRequested]: 'Cancelamento solicitado',
    [OrderStatus.Canceled]: 'Cancelado',
    [OrderStatus.Abandoned]: 'Abandonado',
  };

  paymentLabel: Record<PaymentWay, string> = {
    [PaymentWay.Pix]: 'Pix',
    [PaymentWay.Cash]: 'Dinheiro',
    [PaymentWay.Card]: 'Cartão',
  };

  constructor(
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
    private signalrService: SignalrService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initializeSignalR();

    this.route.queryParams.subscribe(params => {
      const orderId = params['orderId'];

      if (orderId) {
        this.orderService.getOrdersBySession(
          localStorage.getItem('clientSessionId') ?? ''
        ).subscribe(orders => {
          this.orders = orders.filter(o => o.status !== OrderStatus.Draft);
          this.loading = false;
          this.cdr.detectChanges();
          const order = orders.find(o => o.id === orderId);
          if (order) this.showDetail(order);
        });
      } else {
        this.loadOrders();
      }
    });
  }

  async ngOnDestroy(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const clientSessionId = this.getClientSessionId();
    if (clientSessionId) {
      await this.signalrService.leaveCustomerGroup(clientSessionId);
    }
    this.signalrService.offOrderUpdated();
  }

  private async initializeSignalR(): Promise<void> {
    const clientSessionId = this.getClientSessionId();
    if (!clientSessionId) return;

    try {
      await this.signalrService.start();
      await this.signalrService.joinCustomerGroup(clientSessionId);

      this.signalrService.onOrderUpdated((payload: unknown) => {
        this.ngZone.run(() => {
          this.handleOrderUpdate(payload);
        });
      });
    } catch (error) {
      console.error('Erro ao inicializar SignalR', error);
    }
  }

  private handleOrderUpdate(payload: unknown): void {
    const p = payload as any;
    const updated = p?.id ? p : p?.order ?? p?.data;

    if (!updated?.id) {
      this.loadOrders();
      return;
    }

    this.orders = this.orders.map(o =>
      o.id === updated.id ? { ...o, ...updated } : o
    );

    if (this.selectedOrder?.id === updated.id) {
      this.selectedOrder = { ...this.selectedOrder, ...updated };
    }

    if (updated.cancellationRequestStatus === CancellationRequestStatus.Rejected) {
      this.feedbackSuccess = false;
      this.feedbackMessage = 'O restaurante recusou o cancelamento. Seu pedido continua em andamento.';
      this.showFeedbackModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.cdr.detectChanges();
  }

  private getClientSessionId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('clientSessionId');
  }

  loadOrders(): void {
    const clientSessionId = this.getClientSessionId();

    if (!clientSessionId) {
      this.orders = [];
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;

    this.orderService.getOrdersBySession(clientSessionId).subscribe({
      next: (orders) => {
        this.orders = orders.filter(o => o.status !== OrderStatus.Draft);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Erro ao carregar pedidos. Tente novamente.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getDisplayStatusLabel(order: Order): string {
    if (order.cancellationRequestStatus === CancellationRequestStatus.Pending) {
      return 'Cancelamento solicitado';
    }

    return this.statusLabel[this.getStatus(order)];
  }

  showDetail(order: Order): void {
    this.selectedOrder = { ...order };
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  backToList(): void {
    this.selectedOrder = null;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (this.selectedOrder) {
      this.backToList();
    } else {
      const restaurantId = isPlatformBrowser(this.platformId)
        ? localStorage.getItem('currentRestaurantId')
        : null;
      this.router.navigate(['/delivery-home', restaurantId]);
    }
  }

  repeatOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
  }

  cancelOrder(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderToCancel = order;
    this.cancelReason = CancellationReasonType.ChangedMind;
    this.cancelDescription = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
    this.cancelError = '';
  }

  formatTimeOnly(dateStr?: string): string {
    if (!dateStr) return '';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    return new Date(str).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    });
  }

  confirmCancel(): void {
    if (!this.orderToCancel) return;

    if (!this.cancelDescription.trim()) {
      this.cancelError = 'Informe o motivo da solicitação.';
      this.cdr.detectChanges();
      return;
    }

    const canceledOrderId = this.orderToCancel.id;

    const request: CancelOrderRequest = {
      orderId: this.orderToCancel.id ?? '',
      clientSessionId: this.getClientSessionId() ?? '',
      reason: this.cancelReason,
      description: this.cancelDescription.trim(),
    };

    this.orderService.cancelOrder(request).pipe(
      catchError((error) => {
        this.closeCancelModal();
        this.feedbackSuccess = false;
        this.feedbackMessage =
          error?.error?.errors?.[0] ??
          error?.error?.message ??
          'Não foi possível enviar a solicitação de cancelamento.';
        this.showFeedbackModal = true;
        this.cdr.detectChanges();
        return EMPTY;
      })
    ).subscribe(() => {
      this.closeCancelModal();
      this.feedbackSuccess = true;
      this.feedbackMessage = 'Solicitação de cancelamento enviada com sucesso.';
      this.showFeedbackModal = true;

      this.loadOrders();

      if (this.selectedOrder?.id === canceledOrderId) {
        this.selectedOrder = null;
      }

      this.cdr.detectChanges();
    });
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
  }

  getTimeline(order: Order): TimelineEvent[] {
    const toTime = (dateStr?: string): string => {
      if (!dateStr) return '';
      const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
      return new Date(str).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });
    };

    const createdAtStr = order.createdAt
      ? (order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z')
      : undefined;

    const status = order.status ?? OrderStatus.PendingConfirmation;
    const isPickup = order.deliveryMode === DeliveryMode.Pickup;

    const steps: { label: string; minStatus: OrderStatus; timestamp?: string }[] = [
      { label: 'Pedido realizado', minStatus: OrderStatus.PendingConfirmation, timestamp: createdAtStr },
      { label: 'Em preparo', minStatus: OrderStatus.Preparing, timestamp: order.preparingStartedAt },
      { label: isPickup ? 'Pronto para retirada' : 'Saiu para entrega', minStatus: OrderStatus.OnTheWay, timestamp: order.onTheWayAt },
      { label: isPickup ? 'Retirado' : 'Entregue', minStatus: OrderStatus.Ready, timestamp: order.readyAt },
    ];

    return steps.map((s, index) => {
      const isLast = index === steps.length - 1;
      const reached = status >= s.minStatus;

      // último step: done (verde) quando Ready; active (destaque) nunca — já é o fim
      // demais steps: done quando já passou, active quando é o atual
      const done = isLast ? reached : status > s.minStatus;
      const active = isLast ? false : status === s.minStatus;

      return {
        time: reached ? toTime(s.timestamp) : '',
        label: s.label,
        done,
        active,
      };
    });
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    const str = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const d = new Date(str);
    return (
      d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    );
  }

  formatCurrency(value: number | undefined | null): string {
    if (value == null) return '-';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  getStatus(order: Order): OrderStatus {
    return order.status ?? OrderStatus.PendingConfirmation;
  }

  trackByOrderId(_: number, order: Order): string {
    return order.id ?? '';
  }

  trackByItemId(_: number, item: { id: string }): string {
    return item.id;
  }

  getEstimatedDeliveryWindow(order: Order): string {
    if (!order.estimatedDeliveryTimeInMinutes) return '';

    const createdAtStr = order.createdAt!.endsWith('Z')
      ? order.createdAt!
      : order.createdAt! + 'Z';

    const created = new Date(createdAtStr);
    const min = new Date(created.getTime() + order.estimatedDeliveryTimeInMinutes * 60000);
    const max = new Date(created.getTime() + (order.estimatedDeliveryTimeInMinutes + 10) * 60000);

    const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    return `entre ${fmt(min)} e ${fmt(max)}`;
  }

  markAsDelivered(order: Order, event?: Event): void {
    event?.stopPropagation();
    this.orderService.markAsDelivered(order.id!).subscribe({
      next: () => {
        order.status = OrderStatus.Ready;
        this.cdr.detectChanges();
      },
      error: () => console.error('Erro ao marcar como entregue')
    });
  }
}