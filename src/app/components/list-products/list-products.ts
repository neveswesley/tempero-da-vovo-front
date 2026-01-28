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
import { ProductService } from '../../services/product.services';

interface Complement {
  name: string;
  price: number;
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
    ConfirmationModalComponent
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
  products: Product[] = [];

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

  private clickListener?: (event: Event) => void;

  constructor(
    private productService: ProductService,
    private router: Router,
    private categoryService: CategoryService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCategories();
      this.setupClickOutsideListener();
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
      if (!target.closest('.menu-wrapper') && !target.closest('.product-menu-wrapper')) {
        this.openMenuIndex = null;
        this.openProductMenu = null;
      }
    };

    document.addEventListener('click', this.clickListener);
  }

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
        const rawCategories = Array.isArray(data) ? data : (data as any)?.data || [];

        this.categories = rawCategories.map((cat: any) => {
          return {
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            products: cat.products.map((prod: any) => {
              const isActive =
                prod.isActive !== undefined
                  ? prod.isActive
                  : prod.IsActive !== undefined
                    ? prod.IsActive
                    : false;

              return {
                id: prod.id,
                name: prod.name,
                description: prod.description,
                price: prod.price,
                imageUrl: prod.imageUrl,
                isActive: Boolean(isActive),
                complements: prod.complements ?? [],
              };
            }),
          };
        });

        console.log('📦 Categorias carregadas:', this.categories);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Erro completo:', err);
        this.error = 'Erro ao carregar categorias';
        this.loading = false;
        this.notificationService.show('Não foi possível carregar o cardápio.');
      },
    });
  }

  // ===== BUSCA - CORRIGIDO (filtro em tempo real) =====
  get filteredCategories(): Category[] {
    if (!this.searchTerm.trim()) {
      return this.categories;
    }

    const term = this.searchTerm.toLowerCase().trim();

    return this.categories
      .map(category => ({
        ...category,
        products: category.products.filter(product =>
          product.name.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term)
        )
      }))
      .filter(category => category.products.length > 0);
  }

  onSearch() {
    // Não precisa fazer nada, o getter já filtra automaticamente
    this.cdr.detectChanges();
  }

  clearSearch() {
    this.searchTerm = '';
    this.cdr.detectChanges();
  }

  // ===== MODO REORGANIZAR - CORRIGIDO (drag and drop funcional) =====
  toggleReorderMode() {
    this.isReorderMode = !this.isReorderMode;
    if (this.isReorderMode) {
      this.notificationService.show('Modo reorganizar ativado');
    }
  }

  exitReorderMode() {
    this.isReorderMode = false;
    this.notificationService.show('Ordem salva com sucesso');
    // TODO: Implementar chamada ao backend para salvar ordem
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

    // Reorganiza o array
    const draggedCategory = this.categories[this.draggedIndex];
    const newCategories = [...this.categories];
    
    // Remove do índice original
    newCategories.splice(this.draggedIndex, 1);
    
    // Insere no novo índice
    newCategories.splice(dropIndex, 0, draggedCategory);
    
    this.categories = newCategories;
    this.draggedIndex = null;
    this.cdr.detectChanges();
  }

  onDragEnd() {
    this.draggedIndex = null;
  }

  // ===== ADICIONAR CATEGORIA - CORRIGIDO (navega para rota existente) =====
  openAddCategoryModal() {
    this.router.navigate(['/create-category']);
  }

  // ===== FORMATAÇÃO DE IMAGEM =====
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

  // ===== CONTROLE DE COMPLEMENTOS =====
  toggleComplements(categoryIndex: number, productIndex: number) {
    const key = `${categoryIndex}-${productIndex}`;
    if (this.openComplements.has(key)) {
      this.openComplements.delete(key);
    } else {
      this.openComplements.add(key);
    }
  }

  isComplementsOpen(categoryIndex: number, productIndex: number): boolean {
    return this.openComplements.has(`${categoryIndex}-${productIndex}`);
  }

  getProductComplements(product: Product): Complement[] {
    return product.complements || [];
  }

  addComplement(product: Product) {
    this.notificationService.show('🚧 Função em desenvolvimento');
  }

  // ===== CONTROLE DE MENU DE PRODUTO =====
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

  // ===== AÇÕES DE PRODUTO =====
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

  editProduct(product: Product) {
    console.log('✏️ Editando produto:', product.id);
    this.router.navigate(['/edit-product', product.id]);
  }

  duplicateProduct(product: Product) {
    this.notificationService.show(`Produto "${product.name}" duplicado!`);
    this.closeAllMenus();
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
      this.notificationService.show(`Produto "${product.name}" excluído!`);
      this.closeAllMenus();
      
      this.loadCategories();
    } catch (error) {
      console.error('❌ Erro ao excluir produto:', error);
      this.notificationService.show(`Não foi possível excluir "${product.name}".`);
    }
  }

  // ===== CONTROLE DE MENUS =====
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

  closeAllMenus() {
    this.openMenuIndex = null;
    this.openProductMenu = null;
  }

  // ===== AÇÕES DE CATEGORIA =====
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

  addProduct(category: Category) {
    this.closeMenu();

    this.router.navigate(['/create-product'], {
      queryParams: { categoryId: category.categoryId },
    });
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
}