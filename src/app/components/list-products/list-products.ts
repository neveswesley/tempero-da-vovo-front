import {
  Component,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  Inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationService } from '../../services/confirmation.service';
import { EditCategoryModalComponent } from '../../modals/edit-category-modal';
import { ConfirmationModalComponent } from '../../modals/confirmation-modal';
import { ProductService } from '../../services/product.service';
import { AddSideDishModalComponent } from '../../modals/add-side-dish-modal';
import { SideDishService, SideDishGroup } from '../../services/side-dish.service';
import { EditSideDishGroupModalComponent } from '../../modals/edit-side-dish-modal';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

interface Complement {
  id: string;
  name: string;
  unitPrice: number;
  isActive: boolean;
}

interface ComplementGroup {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  isRequired: boolean;
  complements: Complement[];
  selected?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  imageUrl?: string;
  isActive: boolean;
  category?: Category;
  complements: Complement[];
  complementGroups?: ComplementGroup[];
  sideDishGroups?: Array<{ id: string; name: string }>;
}

interface Category {
  categoryId: string;
  categoryName: string;
  products: Product[];
}

@Component({
  selector: 'app-list-products',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EditCategoryModalComponent,
    ConfirmationModalComponent,
    AddSideDishModalComponent,
    EditSideDishGroupModalComponent,
  ],
  templateUrl: './list-products.html',
  styleUrls: ['./list-products.css'],
})
export class ListProducts implements OnInit, OnDestroy {
  categories: Category[] = [];
  loading = false;
  error: string | null = null;
  openMenuIndex: number | null = null;
  deletingCategoryId: string | null = null;

  // Controle de colapso de categorias
  collapsedCategories: Set<number> = new Set();

  // Controle de complementos abertos
  openComplements: Set<string> = new Set();

  // Controle de menu de produto
  openProductMenu: string | null = null;

  // Modal de edição
  isEditModalOpen = false;
  selectedCategory: Category | null = null;

  // Busca
  searchTerm: string = '';

  // Modo reorganizar
  isReorderMode = false;
  draggedIndex: number | null = null;

  isEditGroupOpen = false;
  selectedGroup: any = null;

  // Modal de grupos de complemento
  isComplementGroupModalOpen = false;
  selectedProductForComplements: Product | null = null;

  // Grupos de complementos do restaurante (virá da API)
  complementGroupsFromRestaurant: SideDishGroup[] = [];

  isAddSideDishModalOpen = false;
  selectedProduct: Product | null = null;

  products: Product[] = [];

  // Estado para controlar grupos de complementos abertos
  private openComplementGroups: Set<string> = new Set();

  private clickListener?: (event: Event) => void;

  constructor(
    private productService: ProductService,
    private router: Router,
    private categoryService: CategoryService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private sideDishService: SideDishService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupClickOutsideListener();
      this.loadCategories();
    }
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId) && this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  private setupClickOutsideListener() {
    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('.menu-wrapper') &&
        !target.closest('.product-menu-wrapper') &&
        !target.closest('.complement-group-menu-wrapper')
      ) {
        this.openMenuIndex = null;
        this.openProductMenu = null;
        this.openComplementGroupMenuIndex = null;
      }
    };

    document.addEventListener('click', this.clickListener);
  }

  openAddSideDishModal(product: Product) {
    console.log('🔓 Abrindo modal para produto:', product.id);

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      console.error('❌ Restaurant ID não encontrado');
      this.notificationService.show('Erro: Restaurante não identificado');
      return;
    }

    console.log('🔄 Carregando grupos de complementos...');

    forkJoin({
      allGroups: this.sideDishService.getSideDishGroupsByRestaurant(restaurantId),
      linkedGroups: this.sideDishService.getSideDishGroupsByProduct(product.id),
    }).subscribe({
      next: ({ allGroups, linkedGroups }) => {
        console.log('📦 Todos os grupos do restaurante:', allGroups);
        console.log('🔗 Grupos vinculados ao produto:', linkedGroups);

        const linkedGroupIds = new Set(linkedGroups.map((g) => g.id));

        this.complementGroupsFromRestaurant = allGroups.map((g) => ({
          ...g,
          selected: linkedGroupIds.has(g.id),
        }));

        console.log('✅ Grupos preparados para exibição:', this.complementGroupsFromRestaurant);

        this.selectedProduct = product;
        this.isAddSideDishModalOpen = true;

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar cardápio:', err);
        this.notificationService.show('Erro ao carregar grupos de complementos');
      },
    });
  }

  closeAddSideDishModal() {
    console.log('🔒 Fechando modal de adicionar complementos');
    this.isAddSideDishModalOpen = false;
    this.selectedProduct = null;
    this.complementGroupsFromRestaurant = [];
    this.cdr.detectChanges();
  }
  // ===== CARREGAR DADOS =====
  loadCategories() {
  const restaurantId = localStorage.getItem('restaurantId');

  if (!restaurantId) {
    this.error = 'Restaurant ID não encontrado';
    this.notificationService.show('Restaurante não identificado. Faça login novamente.');
    return;
  }

  this.loading = true;
  this.error = null;

  this.categoryService.getWithProducts(restaurantId).subscribe({
    next: (data) => {
      const rawCategories = Array.isArray(data)
        ? data
        : (data as any)?.data || [];

      this.categories = rawCategories.map((cat: any) => {
        return {
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,

          products: (cat.products ?? [])
            .filter((prod: any) => {
              const isActive =
                prod.isActive !== undefined
                  ? prod.isActive
                  : prod.IsActive !== undefined
                    ? prod.IsActive
                    : false;

              return Boolean(isActive);
            })
            .map((prod: any) => {
              return {
                id: prod.id,
                name: prod.name,
                description: prod.description,
                price: prod.price,
                imageUrl: prod.imageUrl,
                isActive: true, // aqui sempre true, pois já filtrou
                complements: prod.complements ?? [],
                complementGroups: [],
              };
            }),
        };
      });

      console.log('📦 Categorias carregadas:', this.categories);
      

      this.loading = false;

      this.cdr.detectChanges();

      this.checkForModalOpen();
    },

    error: (err) => {
      console.error('❌ Erro completo:', err);
      this.error = 'Erro ao carregar cardápio';
      this.loading = false;
      this.notificationService.show('Não foi possível carregar o cardápio.');
      this.cdr.detectChanges();
    },
  });
}

  private checkForModalOpen(): void {
    const openModal = localStorage.getItem('openAddSideDishModal');
    const productId = localStorage.getItem('currentProductId');

    console.log('🔍 Verificando modal:', { openModal, productId });

    if (openModal === 'true' && productId) {
      console.log('🔍 Procurando produto:', productId);
      console.log('📦 Categorias disponíveis:', this.categories.length);

      let foundProduct: Product | null = null;

      for (const category of this.categories) {
        console.log(
          '🔎 Verificando categoria:',
          category.categoryName,
          'com',
          category.products.length,
          'produtos',
        );
        const product = category.products.find((p) => p.id === productId);
        if (product) {
          foundProduct = product;
          console.log('✅ Produto encontrado:', product.name);
          break;
        }
      }

      if (foundProduct) {
        console.log('✅ Abrindo modal para:', foundProduct.name);
        // ⚡ Pequeno delay para garantir que a UI está pronta
        setTimeout(() => {
          this.openAddSideDishModal(foundProduct!);
        }, 300);
      } else {
        console.warn('⚠️ Produto não encontrado nas categorias carregadas');
      }

      // Limpa os sinais
      localStorage.removeItem('openAddSideDishModal');
    }
  }
  /**
   * Formata o preço corretamente, mostrando R$ 0,00 quando for 0
   */
  formatPrice(price: number | string): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) {
      return '0,00';
    }
    return numericPrice.toFixed(2).replace('.', ',');
  }

  // ===== BUSCA =====
  get filteredCategories(): Category[] {
    if (!this.searchTerm.trim()) {
      return this.categories;
    }

    const term = this.searchTerm.toLowerCase().trim();

    return this.categories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) =>
            product.name.toLowerCase().includes(term) ||
            product.description?.toLowerCase().includes(term),
        ),
      }))
      .filter((category) => category.products.length > 0);
  }

  onSearch() {
    this.cdr.detectChanges();
  }

  clearSearch() {
    this.searchTerm = '';
    this.cdr.detectChanges();
  }

  // ===== MODO REORGANIZAR =====
  toggleReorderMode() {
    this.isReorderMode = !this.isReorderMode;
    if (this.isReorderMode) {
      this.notificationService.show('Modo reorganizar ativado');
    }
  }

  exitReorderMode() {
    const restaurantId = localStorage.getItem('restaurantId');

    if (!restaurantId) {
      this.notificationService.show('Erro ao salvar ordem');
      this.isReorderMode = false;
      return;
    }

    const categoryIds = this.categories.map((cat) => cat.categoryId);

    this.categoryService.updateCategoryOrder(restaurantId, categoryIds).subscribe({
      next: () => {
        this.isReorderMode = false;
        this.notificationService.show('Ordem salva com sucesso');
      },
      error: (err) => {
        console.error('❌ Erro ao salvar ordem:', err);
        this.notificationService.show('Erro ao salvar ordem das categorias');
        this.loadCategories();
        this.isReorderMode = false;
      },
    });
  }

  onDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', index.toString());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();

    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      return;
    }

    const draggedCategory = this.categories[this.draggedIndex];
    const newCategories = [...this.categories];

    newCategories.splice(this.draggedIndex, 1);
    newCategories.splice(dropIndex, 0, draggedCategory);

    this.categories = newCategories;
    this.draggedIndex = null;
    this.cdr.detectChanges();
  }

  onDragEnd() {
    this.draggedIndex = null;
  }

  // ===== CATEGORIAS =====
  openAddCategoryModal() {
    const restaurantId = localStorage.getItem('restaurantId');
    this.router.navigate(['/restaurant', restaurantId, 'create-category']);

  }

  editCategory(category: Category) {
    this.selectedCategory = category;
    this.isEditModalOpen = true;
    this.closeMenu();
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.selectedCategory = null;
  }

  onCategoryUpdated() {
    this.loadCategories();
  }

  async deleteCategory(category: Category) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Excluir categoria',
      message: `Tem certeza que deseja excluir "${category.categoryName}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.openMenuIndex = null;

    try {
      await this.categoryService.deleteCategory(category.categoryId).toPromise();
      this.notificationService.show('Categoria excluída com sucesso!');
      this.loadCategories();
    } catch (error) {
      console.error('❌ Erro ao excluir categoria:', error);
      this.notificationService.show('Erro ao excluir categoria. Tente novamente.');
    }
  }

  isDeletingCategory(categoryId: string): boolean {
    return this.deletingCategoryId === categoryId;
  }

  // ===== CONTROLE DE COLAPSO =====
  toggleCollapse(index: number) {
    if (this.collapsedCategories.has(index)) {
      this.collapsedCategories.delete(index);
    } else {
      this.collapsedCategories.add(index);
    }
  }

  isCollapsed(index: number): boolean {
    return this.collapsedCategories.has(index);
  }

  // ===== PRODUTOS =====
  addProduct(category: Category) {
    this.closeMenu();
    this.router.navigate(['/create-product'], {
      queryParams: { categoryId: category.categoryId },
    });
  }

  editProduct(product: Product) {
    console.log('✏️ Editando produto:', product.id);
    this.router.navigate(['/edit-product', product.id]);
  }

  // list-products.component.ts

  async duplicateProduct(product: Product) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Duplicar item',
      message: `Deseja duplicar o item "${product.name}"? O item duplicado ficará pausado.`,
      confirmText: 'Sim, duplicar',
      cancelText: 'Cancelar',
      type: 'info',
    });

    if (!confirmed) return;

    console.log('📋 Duplicando produto:', product.id);

    this.productService.duplicateProduct(product.id).subscribe({
      next: (response) => {
        console.log('✅ Produto duplicado:', response);
        this.notificationService.show(`Item "${product.name}" duplicado com sucesso!`);
        this.closeAllMenus();
        this.loadCategories(); // Recarrega para mostrar o novo produto
      },
      error: (error) => {
        console.error('❌ Erro ao duplicar produto:', error);
        this.notificationService.show(`Erro ao duplicar "${product.name}". Tente novamente.`);
      },
    });
  }

  async deleteProduct(product: Product) {
    const confirmed = await this.confirmationService.confirm({
      title: 'Excluir produto',
      message: `Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, excluir',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) return;

    console.log('🗑️ Deletando produto:', product.id);

    try {
      await this.productService.deleteProduct(product.id).toPromise();
      this.notificationService.show(`Cardápio atualizado com sucesso`);
      this.closeAllMenus();
      this.loadCategories();
    } catch (error) {
      console.error('❌ Erro ao excluir produto:', error);
      this.notificationService.show(`Não foi possível excluir "${product.name}".`);
    }
  }

  async togglePauseProduct(product: Product) {
    try {
      const newStatus = !product.isActive;
      await this.productService.toggleActiveProduct(product.id, newStatus).toPromise();
      product.isActive = newStatus;
      this.notificationService.show('Cardápio atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error);
      this.notificationService.show('Erro ao alterar status.');
    }
  }

  // ===== IMAGENS =====
  getImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) {
      return null;
    }

    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
      return imageUrl;
    }

    return this.productService.getFullImageUrl(imageUrl);
  }

  onImageError(event: any): void {
    console.warn('❌ Erro ao carregar imagem:', event.target.src);
    event.target.style.display = 'none';
  }

  isComplementsOpen(categoryIndex: number, productIndex: number): boolean {
    return this.openComplements.has(`${categoryIndex}-${productIndex}`);
  }

  getProductComplements(product: Product): Complement[] {
    return product.complements || [];
  }

  // ===== CONTROLE DE COMPLEMENTOS =====
  toggleComplements(categoryIndex: number, productIndex: number) {
    const key = `${categoryIndex}-${productIndex}`;
    const product = this.categories[categoryIndex].products[productIndex];

    // Se está fechando, apenas fecha
    if (this.openComplements.has(key)) {
      this.openComplements.delete(key);
      this.cdr.detectChanges();
      return;
    }

    // ⚡ SEMPRE recarrega os grupos (mesmo que já tenha carregado antes)
    console.log('🔄 Recarregando grupos para:', product.name);

    // ⚡ Limpa os grupos existentes antes de recarregar
    product.complementGroups = [];

    this.loadProductComplementGroups(product);

    // Abre o accordion
    this.openComplements.add(key);
    this.cdr.detectChanges();
  }

  // ===== GRUPOS DE COMPLEMENTOS =====
  private getComplementGroupKey(
    categoryIndex: number,
    productIndex: number,
    groupIndex: number,
  ): string {
    return `${categoryIndex}-${productIndex}-${groupIndex}`;
  }

  isComplementGroupOpen(categoryIndex: number, productIndex: number, groupIndex: number): boolean {
    const key = this.getComplementGroupKey(categoryIndex, productIndex, groupIndex);
    return this.openComplementGroups.has(key);
  }

  toggleComplementGroup(categoryIndex: number, productIndex: number, groupIndex: number): void {
    const key = this.getComplementGroupKey(categoryIndex, productIndex, groupIndex);
    if (this.openComplementGroups.has(key)) {
      this.openComplementGroups.delete(key);
    } else {
      this.openComplementGroups.add(key);
    }
    this.cdr.detectChanges(); // ⚡ FORÇAR DETECÇÃO IMEDIATA
  }

  getProductComplementGroups(product: Product): any[] {
    // Simplesmente retorna o que já está carregado (não carrega automaticamente)
    return product.complementGroups || [];
  }

  private loadProductComplementGroups(product: Product): void {
    this.sideDishService.getSideDishGroupsByProduct(product.id).subscribe({
      next: (groups) => {
        product.complementGroups = groups;
        console.log('✅ Grupos carregados para', product.name, ':', groups);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar grupos:', err);
        this.cdr.detectChanges();
      },
    });
  }

  onComplementsLinked(): void {
    console.log('🎉 Complementos vinculados com sucesso!');

    const productId = this.selectedProduct?.id;

    this.isAddSideDishModalOpen = false;
    this.selectedProduct = null;
    this.complementGroupsFromRestaurant = [];

    this.notificationService.show('Cardápio atualizado com sucesso');

    if (productId) {
      let targetProduct: Product | null = null;
      let categoryIndex = -1;
      let productIndex = -1;

      for (let catIdx = 0; catIdx < this.categories.length; catIdx++) {
        const cat = this.categories[catIdx];
        const prodIdx = cat.products.findIndex((p) => p.id === productId);
        if (prodIdx !== -1) {
          targetProduct = cat.products[prodIdx];
          categoryIndex = catIdx;
          productIndex = prodIdx;
          break;
        }
      }

      if (targetProduct) {
        const key = `${categoryIndex}-${productIndex}`;
        const isOpen = this.openComplements.has(key);

        console.log('🔍 Produto encontrado:', targetProduct.name, '- Accordion aberto:', isOpen);

        if (isOpen) {
          console.log('🔄 Recarregando grupos do produto...');
          this.loadProductComplementGroups(targetProduct);
        }
      }
    }

    this.cdr.detectChanges();
  }

  async togglePauseComplement(complement: Complement): Promise<void> {
    try {
      const newStatus = !complement.isActive;
      await this.sideDishService.toggleSideDishActive(complement.id, newStatus).toPromise();
      complement.isActive = newStatus;
      this.notificationService.show('Cardápio atualizado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao alterar status do complemento:', error);
      this.notificationService.show('Erro ao alterar status do complemento.');
    }
  }

  addComplement(product: Product): void {
    const restaurantId = localStorage.getItem('restaurantId');
    console.log('➕ Criar novo grupo para produto:', product.id);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentProductId', product.id);
      localStorage.setItem('openAddSideDishModal', 'true');
    }

    this.router.navigate(['/restaurant', restaurantId, 'create-side-dish-group']);
  }

  openAddComplementGroupModal(product: Product) {
    console.log('🔓 Tentando abrir modal para produto:', product.id);

    const restaurantId = localStorage.getItem('restaurantId');
    if (!restaurantId) {
      console.error('❌ Restaurant ID não encontrado');
      return;
    }

    console.log('🔍 Carregando grupos para produto:', product.id);

    forkJoin({
      allGroups: this.sideDishService.getSideDishGroupsByRestaurant(restaurantId),
      linkedGroups: this.sideDishService.getSideDishGroupsByProduct(product.id),
    }).subscribe({
      next: ({ allGroups, linkedGroups }) => {
        console.log('📦 Todos os grupos do restaurante:', allGroups);
        console.log('🔗 Grupos já vinculados ao produto:', linkedGroups);

        const linkedGroupIds = new Set(linkedGroups.map((g) => g.id));
        console.log('🆔 IDs vinculados:', Array.from(linkedGroupIds));

        this.complementGroupsFromRestaurant = allGroups.map((g) => ({
          ...g,
          selected: linkedGroupIds.has(g.id),
        }));

        console.log('✅ Grupos com seleção aplicada:', this.complementGroupsFromRestaurant);

        this.selectedProductForComplements = product;
        this.isComplementGroupModalOpen = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro ao carregar grupos:', err);
        this.notificationService.show('Erro ao carregar grupos de complementos');
        this.cdr.detectChanges();
      },
    });
  }

  closeComplementGroupModal() {
    console.log('🔒 Fechando modal de grupos de complementos');
    this.isComplementGroupModalOpen = false;
    this.selectedProductForComplements = null;
    this.complementGroupsFromRestaurant = [];
    this.cdr.detectChanges();
  }

  get hasAnyComplementSelected(): boolean {
    // TODO: Implementar lógica de seleção no modal
    return false;
  }

  toggleMenu(index: number, event: Event) {
    event.stopPropagation();

    if (this.openMenuIndex === index) {
      this.openMenuIndex = null;
    } else {
      this.openMenuIndex = index;
    }
  }

  closeMenu() {
    this.openMenuIndex = null;
  }

  toggleProductMenu(categoryIndex: number, productIndex: number, event: Event) {
    event.stopPropagation();
    const key = `${categoryIndex}-${productIndex}`;

    if (this.openProductMenu === key) {
      this.openProductMenu = null;
    } else {
      this.openProductMenu = key;
    }
  }

  isProductMenuOpen(categoryIndex: number, productIndex: number): boolean {
    return this.openProductMenu === `${categoryIndex}-${productIndex}`;
  }

  closeAllMenus() {
    this.openMenuIndex = null;
    this.openProductMenu = null;
    this.openComplementGroupMenuIndex = null;
  }

  // Gerenciamento de menu de grupos de complementos
  openComplementGroupMenuIndex: {
    categoryIndex: number;
    productIndex: number;
    groupIndex: number;
  } | null = null;

  toggleComplementGroupMenu(
    categoryIndex: number,
    productIndex: number,
    groupIndex: number,
    event: Event,
  ): void {
    event.stopPropagation();

    if (
      this.openComplementGroupMenuIndex &&
      this.openComplementGroupMenuIndex.categoryIndex === categoryIndex &&
      this.openComplementGroupMenuIndex.productIndex === productIndex &&
      this.openComplementGroupMenuIndex.groupIndex === groupIndex
    ) {
      this.openComplementGroupMenuIndex = null;
    } else {
      this.openComplementGroupMenuIndex = { categoryIndex, productIndex, groupIndex };
    }
  }

  isComplementGroupMenuOpen(
    categoryIndex: number,
    productIndex: number,
    groupIndex: number,
  ): boolean {
    return (
      this.openComplementGroupMenuIndex !== null &&
      this.openComplementGroupMenuIndex.categoryIndex === categoryIndex &&
      this.openComplementGroupMenuIndex.productIndex === productIndex &&
      this.openComplementGroupMenuIndex.groupIndex === groupIndex
    );
  }

  hasOpenComplementGroupMenu(): boolean {
    return this.openComplementGroupMenuIndex !== null;
  }

  editComplementGroup(group: any, product: Product): void {
    console.log('✏️ Editar grupo:', group, 'do produto:', product);

    this.openComplementGroupMenuIndex = null;

    this.selectedGroup = { ...group, productId: product.id }; // ⬅️ Define qual grupo editar
    this.isEditGroupOpen = true;

    this.cdr.detectChanges();
  }

  async removeComplementGroupFromProduct(group: any, product: Product): Promise<void> {
    if (!group || !product) return;

    const confirmed = await this.confirmationService.confirm({
      title: 'Remover grupo de complemento',
      message: `Deseja realmente remover o grupo "${group.name}" do produto "${product.name}"?`,
      confirmText: 'Sim, remover',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) return;

    this.http.delete(`${environment.apiUrl}/api/SideDishes/remove-side-dish-groups`, {
        body: { productId: product.id, sideDishGroupIds: [group.id] },
      })
      .subscribe({
        next: () => {
          this.notificationService.show(`Cardápio atualizado com sucesso.`);

          setTimeout(() => window.location.reload(), 500);
        },
        error: () => {
          this.notificationService.show(
            `Erro ao remover o grupo "${group.name}" do produto "${product.name}".`,
          );
        },
      });
  }

  openEditGroup(group: any) {
    this.selectedGroup = group;
    this.isEditGroupOpen = true;
    this.cdr.detectChanges();
  }

  closeEditGroup() {
    this.isEditGroupOpen = false;
    this.selectedGroup = null;
    this.cdr.detectChanges();
  }

  reloadProduct() {
    this.loadCategories();
    if (this.selectedProduct) {
      const updatedProduct = this.products.find((p) => p.id === this.selectedProduct!.id);
      if (updatedProduct) {
        this.selectedProduct = updatedProduct;
        this.isAddSideDishModalOpen = true;
      }
    }
  }

  onGroupUpdated() {
    console.log('✅ Grupo atualizado com sucesso');

    const groupProductId = this.selectedGroup?.productId;

    this.closeEditGroup();

    if (groupProductId) {
      let targetProduct: Product | null = null;
      let categoryIndex = -1;
      let productIndex = -1;

      for (let catIdx = 0; catIdx < this.categories.length; catIdx++) {
        const cat = this.categories[catIdx];
        const prodIdx = cat.products.findIndex((p) => p.id === groupProductId);
        if (prodIdx !== -1) {
          targetProduct = cat.products[prodIdx];
          categoryIndex = catIdx;
          productIndex = prodIdx;
          break;
        }
      }

      if (targetProduct) {
        const key = `${categoryIndex}-${productIndex}`;
        const isOpen = this.openComplements.has(key);

        if (isOpen) {
          console.log('🔄 Recarregando grupos após edição...');
          this.loadProductComplementGroups(targetProduct);
        }
      }
    }

    this.notificationService.show('Cardápio atualizado com sucesso');
    this.cdr.detectChanges();
  }

  toggleComplement(c: any) {
    const newStatus = !c.isActive;

    this.sideDishService.toggleSideDishActive(c.id, newStatus).subscribe({
      next: () => {
        c.isActive = newStatus;
        this.notificationService.show(
          newStatus ? 'Cardápio atualizado com sucesso' : 'Cardápio atualizado com sucesso',
        );
      },
      error: () => {
        this.notificationService.show('Erro ao atualizar status do complemento');
      },
    });
  }
}
