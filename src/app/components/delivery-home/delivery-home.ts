import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product.model';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { Category, CategoryWithProducts } from '../../models/category.models';
import { ProductWithSideDishes, SelectedSideDish, CartItem } from '../../models/side-dish.models';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.models';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-delivery-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './delivery-home.html',
  styleUrls: ['./delivery-home.css'],
})
export class DeliveryHomeComponent implements OnInit {
  categories: CategoryWithProducts[] = [];
  restaurantId: string = '';
  loading = true;

  restaurantName = '';

  activeTab: string = 'home';
  activeCategory: string = '';
  cartItemCount: number = 0;

  // Horario de funcionamento
  storeStatusLabel = '';
  storeCloseOrOpenTime = '';
  isStoreOpen = false;

  // Ordem atual (para calcular cartTotal)
  private currentOrder: Order | null = null;

  // Modal
  showProductModal = false;
  selectedProduct: ProductWithSideDishes | null = null;
  productQuantity = 1;

  isStoreClosed: boolean = false;

  // groupId -> (sideDishId -> quantity)
  sideDishSelections: Map<string, Map<string, number>> = new Map();

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private titleService: Title,
    private orderService: OrderService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) { }

  ngOnInit(): void {
    this.orderService.order$.subscribe((order) => {
      this.currentOrder = order;
      this.cartItemCount = order ? order.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
      this.cdr.detectChanges();
    });

    this.route.paramMap.subscribe((params) => {
      const routeId = params.get('id');

      if (routeId) {
        this.restaurantId = routeId;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('currentRestaurantId', routeId);
        }
        this.loadCategories();
      } else if (isPlatformBrowser(this.platformId)) {
        const userData = localStorage.getItem('user');
        if (userData) {
          this.restaurantId = JSON.parse(userData).restaurantId;
          localStorage.setItem('currentRestaurantId', this.restaurantId);
          this.loadCategories();
        } else {
          console.error('RestaurantId não encontrado');
          this.loading = false;
          return;
        }
      }

      this.loadCurrentOrder(this.restaurantId);
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.restaurantId) {
        this.loadCurrentOrder(this.restaurantId);
      }
    });
  }

  get cartTotal(): number {
    return this.currentOrder?.total ?? 0;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const offset = 160;
    let current = this.categories[0]?.categoryId ?? '';

    for (const category of this.categories) {
      const el = document.getElementById(`category-${category.categoryId}`);
      if (el && el.getBoundingClientRect().top <= offset) {
        current = category.categoryId;
      }
    }

    if (this.activeCategory !== current) {
      this.activeCategory = current;
      this.cdr.detectChanges();
    }
  }

  private loadCurrentOrder(restaurantId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const clientSessionId = localStorage.getItem('clientSessionId');
    if (!clientSessionId) return;

    if (localStorage.getItem('orderJustCompleted') === 'true') {
      localStorage.removeItem('orderJustCompleted');
      return;
    }

    this.orderService.getCurrentOrder(restaurantId, clientSessionId).subscribe();
  }

  loadCategories(): void {
    this.loading = true;
    this.loadStoreStatus();

    this.productService.getProductsByRestaurant(this.restaurantId).subscribe({
      next: (response: any) => {
        const products = Array.isArray(response) ? response : response.data || [];
        const activeProducts = products.filter((p: Product) => p.isActive !== false);
        this.categories = this.mapProductsToCategories(activeProducts);

        if (this.categories.length > 0) {
          this.activeCategory = this.categories[0].categoryId;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar categorias:', err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private mapProductsToCategories(products: Product[]): CategoryWithProducts[] {
    const categoriesMap = new Map<string, CategoryWithProducts>();

    products.forEach((product) => {
      if (!product.category) return;

      const categoryId = product.category.id;

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          categoryId,
          categoryName: product.category.categoryName,
          displayOrder: product.category.displayOrder ?? 0,
          products: [],
        });
      }

      categoriesMap.get(categoryId)!.products.push(product);
    });

    return Array.from(categoriesMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  mapCategories(response: CategoryWithProducts[]): Category[] {
    return response.map((c) => ({
      id: c.categoryId,
      name: c.categoryName,
      displayOrder: 0,
      products: c.products,
    }));
  }

  addToCart(product: Product): void {
    this.router.navigate(['/product-details', this.restaurantId, product.id]);
  }

  closeModal(): void {
    this.showProductModal = false;
    this.selectedProduct = null;
    this.sideDishSelections.clear();
  }

  incrementQuantity(): void {
    this.productQuantity++;
  }

  decrementQuantity(): void {
    if (this.productQuantity > 1) this.productQuantity--;
  }

  incrementSideDish(groupId: string, sideDishId: string, maxQuantity: number): void {
    let groupMap = this.sideDishSelections.get(groupId);
    if (!groupMap) {
      groupMap = new Map<string, number>();
      this.sideDishSelections.set(groupId, groupMap);
    }

    if (this.getTotalInGroup(groupId) >= maxQuantity) return;

    const currentQty = groupMap.get(sideDishId) ?? 0;
    groupMap.set(sideDishId, currentQty + 1);
  }

  decrementSideDish(groupId: string, sideDishId: string): void {
    const groupMap = this.sideDishSelections.get(groupId);
    if (!groupMap) return;

    const currentQty = groupMap.get(sideDishId) ?? 0;
    if (currentQty <= 1) {
      groupMap.delete(sideDishId);
    } else {
      groupMap.set(sideDishId, currentQty - 1);
    }

    if (groupMap.size === 0) this.sideDishSelections.delete(groupId);
  }

  canAddToCart(): boolean {
    if (!this.selectedProduct?.productSideDishGroups) return true;

    for (const psdg of this.selectedProduct.productSideDishGroups) {
      if (!psdg.isRequired) continue;
      if (this.getTotalInGroup(psdg.sideDishGroup.id) < psdg.sideDishGroup.minQuantity) {
        return false;
      }
    }

    return true;
  }

  confirmAddToCart(): void {
    if (!this.selectedProduct || !this.canAddToCart()) return;

    const selectedSideDishes: any[] = [];
    this.sideDishSelections.forEach((groupMap, groupId) => {
      groupMap.forEach((qty, sideDishId) => {
        selectedSideDishes.push({ groupId, sideDishId, quantity: qty });
      });
    });

    this.sideDishSelections.clear();
    this.productQuantity = 1;
    this.closeModal();
  }

  getTotalInGroup(groupId: string): number {
    const groupMap = this.sideDishSelections.get(groupId);
    if (!groupMap) return 0;
    let total = 0;
    groupMap.forEach((qty) => (total += qty));
    return total;
  }

  calculateTotalPrice(): number {
    if (!this.selectedProduct) return 0;

    let total = this.selectedProduct.price * this.productQuantity;

    this.selectedProduct.productSideDishGroups?.forEach((psdg) => {
      const group = psdg.sideDishGroup;
      if (!group) return;
      const selections = this.sideDishSelections.get(group.id);
      if (!selections) return;
      group.sideDish.forEach((sd) => {
        const qty = selections.get(sd.id) ?? 0;
        total += sd.unitPrice * qty * this.productQuantity;
      });
    });

    return total;
  }

  getImageUrl(imageUrl?: string | null): string {
    return imageUrl
      ? (this.productService.getFullImageUrl(imageUrl) ?? 'images/no-image.png')
      : 'images/no-image.png';
  }

  formatPrice(price: number | string): string {
    const value = typeof price === 'string' ? parseFloat(price) : price;
    return value.toFixed(2).replace('.', ',');
  }

  scrollToCategory(categoryId: string): void {
    const el = document.getElementById(`category-${categoryId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'images/no-image.png';
  }

  getSideDishQuantity(groupId: string, sideDishId: string): number {
    return this.sideDishSelections.get(groupId)?.get(sideDishId) ?? 0;
  }

  navigate(tab: string): void {
    this.activeTab = tab;
    switch (tab) {
      case 'home':
        this.router.navigate(['/delivery-home', this.restaurantId]);
        break;
      case 'orders':
        this.router.navigate(['/orders-list']);
        break;
      case 'cart':
        this.router.navigate(['/cart']);
        break;
      case 'promos':
        this.router.navigate(['/promos']);
        break;
      case 'profile':
        this.router.navigate(['/profile', this.restaurantId]);
        break;
    }
  }

  private computeStoreStatus(openingHours: any[]): void {
    const now = new Date();
    const todayDow = now.getDay();
    const todayEntry = openingHours.find(h => h.dayOfWeek === todayDow);

    const parseTime = (raw: string) => {
      // suporta "HH:mm:ss" e ISO datetime "2024-01-01T10:00:00"
      const time = raw.includes('T') ? raw.split('T')[1] : raw;
      return time.substring(0, 5);
    };

    if (todayEntry) {
      const openStr = parseTime(todayEntry.openTime);
      const closeStr = parseTime(todayEntry.closeTime);
      const [oh, om] = openStr.split(':').map(Number);
      const [ch, cm] = closeStr.split(':').map(Number);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;

      if (nowMin >= openMin && nowMin < closeMin) {
        this.isStoreOpen = true;
        this.storeStatusLabel = `Loja aberta até às ${closeStr}h`;
        return;
      }

      if (nowMin < openMin) {
        this.isStoreOpen = false;
        this.storeStatusLabel = `Loja fechada, abre hoje às ${openStr}h`;
        return;
      }
    }

    for (let i = 1; i <= 7; i++) {
      const nextDow = (todayDow + i) % 7;
      const next = openingHours.find(h => h.dayOfWeek === nextDow);
      if (next) {
        const label = i === 1 ? 'amanhã' : ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][nextDow];
        const openStr = parseTime(next.openTime);
        this.isStoreOpen = false;
        this.storeStatusLabel = `Loja fechada, abre ${label} às ${openStr}h`;
        return;
      }
    }

    this.isStoreOpen = false;
    this.storeStatusLabel = 'Loja fechada';
  }

  private loadStoreStatus(): void {
    this.http.get<any>(`${environment.apiUrl}/api/Restaurants/${this.restaurantId}`).subscribe({
      next: (res) => {
        this.restaurantName = res.name;
        this.titleService.setTitle(`${res.name} - NvsFood`);
        this.computeStoreStatus(res.openingHours ?? []);
        this.cdr.detectChanges();
      }
    });
  }

  goHome(): void {
    const restaurantId = localStorage.getItem('currentRestaurantId');
    if (restaurantId) {
      this.router.navigate(['/delivery-home', restaurantId]);
    }
  }
}
