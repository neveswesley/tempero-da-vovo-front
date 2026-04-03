import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Order, OrderItem, OrderItemSideDish } from '../../models/order.models';
import { Location } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDeleteModalComponent } from '../../modals/confirm-delete-modal.component';
import { CartExpiryService } from '../../services/cart-expiry.service';



@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, ConfirmDeleteModalComponent],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css'],
})
export class CartComponent implements OnInit {
  order: Order | null = null;
  productImages: Map<string, string> = new Map();
  showDeleteModal = false;
  itemToDelete: OrderItem | null = null;
  showClearCartModal = false;


  constructor(
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private cartExpiryService: CartExpiryService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
    private productService: ProductService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    this.orderService.order$.subscribe((order) => {
      this.order = order ?? null;
      if (this.order?.items) {
        this.loadProductImages();
      }
      this.cdr.detectChanges();
    });

    if (isPlatformBrowser(this.platformId)) {
      const restaurantId = localStorage.getItem('currentRestaurantId');
      const clientSessionId = localStorage.getItem('clientSessionId');

      if (restaurantId && clientSessionId && !this.orderService.snapshot) {
        this.orderService.getCurrentOrder(restaurantId, clientSessionId).subscribe();
      }

      this.cartExpiryService.resumeTracking();
    }
  }

  private loadProductImages(): void {
    if (!this.order) return;

    this.order.items.forEach((item) => {
      if (!this.productImages.has(item.productId)) {
        this.productService.getById(item.productId).subscribe((product) => {
          const imageUrl = this.productService.getFullImageUrl(product?.imageUrl);
          if (imageUrl) {
            this.productImages.set(item.productId, imageUrl);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getProductImage(productId: string): string | null {
    return this.productImages.get(productId) ?? null;
  }

  goBack(): void {
    const restaurantId = localStorage.getItem('currentRestaurantId');
    if (restaurantId) {
      this.router.navigate(['/delivery-home', restaurantId]);
    }
  }

  formatPrice(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  groupSideDishes(
    sideDishes: OrderItemSideDish[],
  ): { groupName: string; items: OrderItemSideDish[] }[] {
    const map = new Map<string, OrderItemSideDish[]>();

    sideDishes.forEach((sd) => {
      const key = sd.groupName ?? 'Complementos';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sd);
    });

    return Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }));
  }

  getTotalItems(): number {
    if (!this.order) return 0;
    return this.order.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  incrementItem(item: OrderItem): void {
    const newQuantity = item.quantity + 1;

    this.orderService.updateOrderItem(item.id, {
      quantity: newQuantity,
      observation: item.observation,
      sideDishes: item.sideDishes.map(sd => ({
        sideDishId: sd.sideDishId,
        quantity: sd.quantity
      }))
    }).subscribe({
      next: () => {
        this.orderService['updateLocalOrder']({
          ...item,
          quantity: newQuantity,
          total: item.unitPrice * newQuantity
        });
      },
      error: () => this.notificationService.show('Erro ao aumentar item')
    });
  }

  decrementItem(item: OrderItem): void {
    if (item.quantity === 1) {
      this.itemToDelete = item;
      this.showDeleteModal = true;
    } else {
      const newQuantity = item.quantity - 1;

      this.orderService.updateOrderItem(item.id, {
        quantity: newQuantity,
        observation: item.observation,
        sideDishes: item.sideDishes.map(sd => ({
          sideDishId: sd.sideDishId,
          quantity: sd.quantity
        }))
      }).subscribe({
        next: () => {
          this.orderService['updateLocalOrder']({
            ...item,
            quantity: newQuantity,
            total: item.unitPrice * newQuantity
          });
        },
        error: () => this.notificationService.show('Erro ao diminuir item')
      });
    }
  }

  onDeleteConfirmed(): void {
    if (!this.itemToDelete) return;

    const item = this.itemToDelete;
    this.showDeleteModal = false;
    this.itemToDelete = null;

    this.orderService.removeOrderItem(item.id).subscribe({
      next: () => {
        this.orderService.getCurrentOrder(
          localStorage.getItem('currentRestaurantId')!,
          localStorage.getItem('clientSessionId')!
        ).subscribe();
      },
      error: () => this.notificationService.show('Erro ao remover item')
    });
  }

  onDeleteCancelled(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  private recalculateTotal(): void {
    if (!this.order) return;
    this.order.total = this.order.items.reduce((acc, i) => acc + i.total, 0);
  }

  editItem(item: OrderItem): void {
    const restaurantId = localStorage.getItem('currentRestaurantId') ?? '';

    this.router.navigate(['/product-details', restaurantId, item.productId], {
      state: {
        editMode: true,
        orderItem: item,
      },
    });
  }

  clearCart(): void {
    if (!this.order?.id) return;

    this.orderService.removeAllItems(this.order.id).subscribe({
      next: () => {
        this.order!.items = [];
        this.order!.total = 0;
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.show('Erro ao limpar carrinho')
    });
  }

  openClearCartModal(): void {
    this.showClearCartModal = true;
  }

  onClearCartConfirmed(): void {
    this.showClearCartModal = false;
    this.cdr.detectChanges();
    if (!this.order?.id) return;

    this.orderService.removeAllItems(this.order.id).subscribe({
      next: () => {
        this.order!.items = [];
        this.order!.total = 0;
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.show('Erro ao limpar carrinho')
    });
  }

  onClearCartCancelled(): void {
    this.showClearCartModal = false;
  }

  advanceToPayment(): void {
    if (!this.order) return;
    this.cartExpiryService.stopTracking();
    this.router.navigate(['/checkout']);
  }

  addMoreItems(): void {
    const restaurantId = localStorage.getItem('currentRestaurantId');
    if (restaurantId) {
      this.router.navigate(['/delivery-home', restaurantId]);
    }
  }
}