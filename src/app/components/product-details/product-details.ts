import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { AddItemToOrderRequest } from '../../models/product.model';
import { OrderService } from '../../services/order.service';
import { NotificationService } from '../../services/notification.service';

interface SideDish {
  id: string;
  name: string;
  unitPrice: number;
  quantity?: number;
}

interface SideDishGroup {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  sideDish: SideDish[];
  isPaused?: boolean;
}

interface ProductSideDishGroup {
  sideDishGroup: SideDishGroup;
  isRequired: boolean;
}

interface Product {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  productSideDishGroups?: ProductSideDishGroup[];
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-details.html',
  styleUrls: ['./product-details.css'],
})
export class ProductDetailsComponent implements OnInit {
  product: Product | null = null;
  productQuantity: number = 1;
  sideDishSelections: Map<string, Map<string, number>> = new Map();
  observacoes: string = '';
  loading: boolean = true;

  searchTerm: string = '';

  restaurantId: string = '';

  expandedGroups: Set<string> = new Set();

  editMode: boolean = false;
  editingOrderItemId: string | null = null;

  showConfirmModal = false;

  constructor(
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private productService: ProductService,
    private orderService: OrderService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    this.restaurantId = this.route.snapshot.paramMap.get('restaurantId') ?? '';

    if (!this.restaurantId && isPlatformBrowser(this.platformId)) {
      this.restaurantId = localStorage.getItem('currentRestaurantId') ?? '';
    }

    if (productId) {
      this.loadProductDetails(productId);
    }
  }

  loadProductDetails(productId: string) {
    this.loading = true;

    this.productService.getProductWithSideDishes(productId).subscribe({
      next: (data) => {
        this.product = data;
        this.loading = false;

        if (this.product?.productSideDishGroups && this.product.productSideDishGroups.length > 0) {
          this.initializeSideDishSelections();

          this.product.productSideDishGroups.forEach((psdg) => {
            if (!psdg.sideDishGroup.isPaused) {
              this.expandedGroups.add(psdg.sideDishGroup.id);
            }
          });
        }

        if (isPlatformBrowser(this.platformId)) {
          const state = history.state;
          if (state?.editMode && state?.orderItem) {
            this.editMode = true;
            this.editingOrderItemId = state.orderItem.id;
            this.prefillFromOrderItem(state.orderItem);
          }
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao carregar produto:', error);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private prefillFromOrderItem(orderItem: any): void {
    console.log('Campos do orderItem:', Object.keys(orderItem));
    console.log('orderItem completo:', JSON.stringify(orderItem));
    this.productQuantity = orderItem.quantity ?? 1;
    this.observacoes = orderItem.observation ?? '';

    // Pré-preenche os acompanhamentos
    if (orderItem.sideDishes && orderItem.sideDishes.length > 0) {
      orderItem.sideDishes.forEach((sd: any) => {
        // Encontra o grupo ao qual esse sideDish pertence
        this.product?.productSideDishGroups?.forEach((psdg) => {
          const found = psdg.sideDishGroup.sideDish.find((s) => s.id === sd.sideDishId);
          if (found) {
            const groupMap = this.sideDishSelections.get(psdg.sideDishGroup.id);
            if (groupMap) {
              groupMap.set(sd.sideDishId, sd.quantity);
            }
          }
        });
      });
    }
  }

  initializeSideDishSelections() {
    console.log('🎯 initializeSideDishSelections chamado');

    if (!this.product?.productSideDishGroups) {
      console.log('❌ Não há productSideDishGroups');
      return;
    }

    console.log('📋 Processando', this.product.productSideDishGroups.length, 'grupos');

    this.product.productSideDishGroups.forEach((psdg, index) => {
      console.log(
        `  Grupo ${index + 1}:`,
        psdg.sideDishGroup?.name,
        '- Pausado?',
        psdg.sideDishGroup?.isPaused,
      );

      if (!psdg.sideDishGroup?.isPaused) {
        const groupMap = new Map<string, number>();
        psdg.sideDishGroup.sideDish?.forEach((sd) => {
          groupMap.set(sd.id, 0);
          console.log(`    ✅ Complemento adicionado:`, sd.name);
        });
        this.sideDishSelections.set(psdg.sideDishGroup.id, groupMap);
      } else {
        console.log(`    ⏸️ Grupo pausado, ignorando`);
      }
    });

    console.log('✅ sideDishSelections final:', this.sideDishSelections);
  }

  selectSingleSideDish(groupId: string, sideDishId: string) {
    const groupMap = this.sideDishSelections.get(groupId);
    if (!groupMap) return;

    // Reseta todos para 0
    groupMap.forEach((_, key) => {
      groupMap.set(key, 0);
    });

    // Marca o selecionado como 1
    groupMap.set(sideDishId, 1);

    this.cdr.detectChanges();
  }

  getSideDishQuantity(groupId: string, sideDishId: string): number {
    return this.sideDishSelections.get(groupId)?.get(sideDishId) || 0;
  }

  getTotalInGroup(groupId: string): number {
    const groupMap = this.sideDishSelections.get(groupId);
    if (!groupMap) return 0;

    let total = 0;
    groupMap.forEach((qty) => (total += qty));
    return total;
  }

  getRemainingInGroup(groupId: string): number {
    const psdg = this.product?.productSideDishGroups?.find((p) => p.sideDishGroup.id === groupId);
    if (!psdg) return 0;

    const maxQuantity = psdg.sideDishGroup.maxQuantity;
    const currentTotal = this.getTotalInGroup(groupId);
    return maxQuantity - currentTotal;
  }

  incrementSideDish(groupId: string, sideDishId: string, maxQuantity: number) {
    const currentTotal = this.getTotalInGroup(groupId);
    if (currentTotal >= maxQuantity) return;

    const groupMap = this.sideDishSelections.get(groupId);
    if (groupMap) {
      const current = groupMap.get(sideDishId) || 0;
      groupMap.set(sideDishId, current + 1);
    }
  }

  decrementSideDish(groupId: string, sideDishId: string) {
    const groupMap = this.sideDishSelections.get(groupId);
    if (groupMap) {
      const current = groupMap.get(sideDishId) || 0;
      if (current > 0) {
        groupMap.set(sideDishId, current - 1);
      }
    }
  }

  incrementQuantity() {
    this.productQuantity++;
  }

  decrementQuantity() {
    if (this.productQuantity > 1) {
      this.productQuantity--;
    }
  }

  toggleGroup(groupId: string): void {
    if (this.expandedGroups.has(groupId)) {
      this.expandedGroups.delete(groupId);
    } else {
      this.expandedGroups.add(groupId);
    }
  }

  isGroupExpanded(groupId: string): boolean {
    return this.expandedGroups.has(groupId);
  }

  onSearchChange(term: string): void {
    this.searchTerm = term.toLowerCase();
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  shouldShowSideDish(sideDish: SideDish): boolean {
    if (!this.searchTerm) return true;
    return sideDish.name.toLowerCase().includes(this.searchTerm);
  }

  getFilteredSideDishes(sideDishes: SideDish[]): SideDish[] {
    if (!this.searchTerm) return sideDishes;
    return sideDishes.filter((sd) => this.shouldShowSideDish(sd));
  }

  calculateTotalPrice(): number {
    if (!this.product) return 0;

    let total = this.product.price;

    if (this.product.productSideDishGroups) {
      this.product.productSideDishGroups.forEach((psdg) => {
        psdg.sideDishGroup.sideDish.forEach((sd) => {
          const qty = this.getSideDishQuantity(psdg.sideDishGroup.id, sd.id);
          total += sd.unitPrice * qty;
        });
      });
    }

    return total * this.productQuantity;
  }

  canAddToCart(): boolean {
    if (!this.product?.productSideDishGroups || this.product.productSideDishGroups.length === 0) {
      return true;
    }

    for (const psdg of this.product.productSideDishGroups) {
      if (psdg.isRequired && !psdg.sideDishGroup.isPaused) {
        const total = this.getTotalInGroup(psdg.sideDishGroup.id);
        if (total < psdg.sideDishGroup.minQuantity) {
          return false;
        }
      }
    }

    return true;
  }

  confirmAddToCart() {
    if (!this.canAddToCart() || !this.product) return;

    if (this.editMode && this.editingOrderItemId) {
      const payload = {
        quantity: this.productQuantity,
        observation: this.observacoes,
        sideDishes: this.getSelectedSideDishes().map((sd) => ({
          sideDishId: sd.sideDishId,
          quantity: sd.quantity,
        })),
      };

      this.orderService.updateOrderItem(this.editingOrderItemId, payload).subscribe({
        next: () => {
          this.notificationService.show('Item atualizado com sucesso!');
          this.router.navigate(['/cart']);
        },
        error: (err) => {
          console.error('❌ Erro:', err);
          this.notificationService.show('Erro ao atualizar item');
        },
      });
    } else {
      const payload: AddItemToOrderRequest = {
        restaurantId: this.restaurantId,
        clientSessionId: this.getClientSessionId(),
        productId: this.product.id,
        quantity: this.productQuantity,
        observation: this.observacoes,
        sideDishes: this.getSelectedSideDishes().map((sd) => ({
          sideDishId: sd.sideDishId,
          quantity: sd.quantity,
        })),
      };

      this.orderService.addItem(payload).subscribe({
        next: () => {
          console.log('✅ Item adicionado, abrindo modal');
          this.showConfirmModal = true;
          this.cdr.detectChanges();
        },
        error: () => this.notificationService.show('Erro ao adicionar produto'),
      });
    }
  }

  closeModal() {
    this.showConfirmModal = false;
  }

  goToCart() {
    this.showConfirmModal = false;
    this.router.navigate(['/cart']);
  }

  getSelectedSideDishes() {
    const selected: any[] = [];

    if (!this.product?.productSideDishGroups) {
      return selected;
    }

    this.sideDishSelections.forEach((groupMap, groupId) => {
      groupMap.forEach((qty, sideDishId) => {
        if (qty > 0) {
          const group = this.product?.productSideDishGroups?.find(
            (psdg) => psdg.sideDishGroup.id === groupId,
          );
          const sideDish = group?.sideDishGroup.sideDish.find((sd) => sd.id === sideDishId);

          if (sideDish) {
            selected.push({
              groupId,
              groupName: group?.sideDishGroup.name,
              sideDishId,
              sideDishName: sideDish.name,
              unitPrice: sideDish.unitPrice,
              quantity: qty,
            });
          }
        }
      });
    });

    return selected;
  }

  goBack() {
    if (this.product?.restaurantId) {
      this.router.navigate(['/delivery-home', this.product.restaurantId]);
    } else if (isPlatformBrowser(this.platformId)) {
      window.history.back();
    }
  }

  formatPrice(price: number): string {
    return price.toFixed(2).replace('.', ',');
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'assets/placeholder.jpg';

    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    return `https://localhost:44356${imageUrl}`;
  }

  getClientSessionId(): string {
    let sessionId = localStorage.getItem('clientSessionId');

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('clientSessionId', sessionId);
    }

    return sessionId;
  }
}
