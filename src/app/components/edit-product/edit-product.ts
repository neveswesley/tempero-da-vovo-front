import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, NgZone, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.services';
import { NotificationService } from '../../services/notification.service';
import { Category } from '../../services/category.service';
import { Product } from '../../models/product.model';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-product.html',
  styleUrls: ['./edit-product.css'],
})
export class EditProductComponent implements OnInit {
  form!: FormGroup;
  productId!: string;
  categories: Category[] = [];
  selectedCategoryId: string = '';
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  originalImageUrl: string | null = null;
  imageWasRemoved = false;
  isLoading = true; // Para mostrar loading

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private notification: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit() {
    console.log('🔵 EditProductComponent - ngOnInit iniciado');
    
    this.buildForm();

    const id = this.route.snapshot.paramMap.get('id');
    console.log('🆔 ID capturado da rota:', id);
    
    if (!id) {
      console.error('❌ ID não encontrado na rota!');
      this.notification.show('Produto inválido');
      this.router.navigate(['/list-products']);
      return;
    }
    
    this.productId = id;
    console.log('✅ ProductId definido:', this.productId);

    // Carregar categorias PRIMEIRO, depois o produto
    this.loadCategories().then(() => {
      console.log('✅ Categorias carregadas, agora carregando produto...');
      this.loadProduct();
    }).catch(err => {
      console.error('❌ Erro ao carregar categorias:', err);
      this.isLoading = false;
    });
  }

  get categoryName(): string {
    const cat = this.categories.find((c) => c.categoryId === this.selectedCategoryId);
    return cat ? cat.categoryName : '';
  }

  buildForm() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: ['0.00', Validators.required],
      categoryId: [''],
    });
    console.log('📝 Formulário criado');
  }

  loadProduct() {
    console.log('📦 Iniciando carregamento do produto:', this.productId);
    
    this.productService.getById(this.productId).subscribe({
      next: (product: Product) => {
        console.log('✅ Produto recebido do backend:', product);
        console.log('📊 Dados do produto:', {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          imageUrl: product.imageUrl
        });

        const formattedPrice = parseFloat(product.price.toString()).toFixed(2);
        console.log('💰 Preço formatado:', formattedPrice);

        let categoryId = '';

        // Tratamento da categoria
        if (product.category) {
          console.log('🏷️ Categoria recebida:', product.category);
          console.log('🏷️ Tipo da categoria:', typeof product.category);
          
          // Se a categoria é um objeto com id
          if (typeof product.category === 'object' && 'id' in product.category) {
            categoryId = (product.category as any).id;
            console.log('✅ CategoryId extraído do objeto (id):', categoryId);
          }
          // Se a categoria é um objeto com categoryId
          else if (typeof product.category === 'object' && 'categoryId' in product.category) {
            categoryId = (product.category as any).categoryId;
            console.log('✅ CategoryId extraído do objeto (categoryId):', categoryId);
          }
          // Se a categoria é uma string (nome)
          else if (typeof product.category === 'string') {
            const categoryName = product.category;
            console.log('🔍 Procurando categoria por nome:', categoryName);
            const foundCategory = this.categories.find((c) => c.categoryName === categoryName);
            categoryId = foundCategory?.categoryId ?? '';
            console.log('✅ Categoria encontrada:', foundCategory);
          }
          // Se a categoria tem categoryName
          else if (typeof product.category === 'object') {
            const categoryName = (product.category as any).categoryName || (product.category as any).name;
            console.log('🔍 Procurando categoria por categoryName/name:', categoryName);
            const foundCategory = this.categories.find((c) => c.categoryName === categoryName);
            categoryId = foundCategory?.categoryId ?? '';
            console.log('✅ Categoria encontrada:', foundCategory);
          }
        } else {
          console.warn('⚠️ Produto sem categoria');
        }

        console.log('🏷️ CategoryId final:', categoryId);
        console.log('📋 Categorias disponíveis:', this.categories.map(c => ({ id: c.categoryId, name: c.categoryName })));

        // Atualiza o formulário
        const formData = {
          name: product.name,
          description: product.description || '',
          price: formattedPrice,
          categoryId: categoryId,
        };
        
        console.log('📝 Dados que serão preenchidos no form:', formData);
        
        this.form.patchValue(formData);
        this.selectedCategoryId = categoryId;

        // Trata a imagem
        if (product.imageUrl) {
          this.originalImageUrl = product.imageUrl;
          this.imagePreview = this.productService.getFullImageUrl(product.imageUrl);
          console.log('🖼️ Imagem:', {
            original: product.imageUrl,
            preview: this.imagePreview
          });
        } else {
          console.log('📷 Produto sem imagem');
        }

        this.form.get('categoryId')?.updateValueAndValidity();
        this.isLoading = false;
        this.cdr.detectChanges();
        
        console.log('✅ Produto carregado com sucesso!');
        console.log('📝 Valores finais do form:', this.form.value);
      },
      error: (err) => {
        console.error('❌ ERRO ao carregar produto:', err);
        console.error('❌ Status do erro:', err.status);
        console.error('❌ Mensagem do erro:', err.message);
        console.error('❌ Erro completo:', err);
        
        this.notification.show('Erro ao carregar produto');
        this.isLoading = false;
        
        // Se o produto não for encontrado, volta para a lista
        if (err.status === 404) {
          setTimeout(() => {
            this.router.navigate(['/list-products']);
          }, 2000);
        }
      },
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🏷️ Iniciando carregamento de categorias');
      
      if (!isPlatformBrowser(this.platformId)) {
        console.log('⚠️ Não está no browser, pulando categorias');
        resolve();
        return;
      }

      const restaurantId = localStorage.getItem('restaurantId');
      const fallbackId = '089364D2-0D9F-48E9-9535-F31CF78A3D5F';
      const finalId = restaurantId || fallbackId;

      console.log('🏪 RestaurantId:', {
        localStorage: restaurantId,
        usando: finalId
      });

      this.productService.getCategories(finalId).subscribe({
        next: (cats) => {
          this.categories = cats;
          console.log('✅ Categorias carregadas:', cats.length);
          console.log('📋 Lista de categorias:', cats.map(c => ({ id: c.categoryId, name: c.categoryName })));

          if (cats.length === 0) {
            console.warn('⚠️ ATENÇÃO: Nenhuma categoria encontrada!');
          }

          resolve();
        },
        error: (err) => {
          console.error('❌ ERRO ao carregar categorias:', err);
          this.notification.show('Erro ao carregar categorias');
          reject(err);
        },
      });
    });
  }

  submit() {
    console.log('📤 Submit iniciado');
    console.log('📝 Form válido?', this.form.valid);
    console.log('📝 Form values:', this.form.value);
    
    if (this.form.invalid) {
      console.error('❌ Formulário inválido!');
      this.notification.show('Preencha todos os campos obrigatórios');
      return;
    }

    const payload: any = {
      name: this.form.value.name,
      description: this.form.value.description,
      price: Number(this.form.value.price),
    };

    if (this.selectedCategoryId) {
      payload.categoryId = this.selectedCategoryId;
    }

    console.log('📤 Payload que será enviado:', payload);

    this.productService.update(this.productId, payload).subscribe({
      next: () => {
        console.log('✅ Produto atualizado com sucesso');

        // Se usuário REMOVEU a imagem
        if (this.imageWasRemoved && this.originalImageUrl) {
          console.log('🗑️ Removendo imagem...');
          this.productService.removeImage(this.productId).subscribe({
            next: () => {
              console.log('✅ Imagem removida');
              this.finishSuccess();
            },
            error: (err) => {
              console.error('❌ Erro ao remover imagem:', err);
              this.notification.show('Erro ao remover imagem');
            },
          });
        }
        // Se usuário SELECIONOU nova imagem
        else if (this.selectedFile) {
          console.log('📤 Enviando nova imagem...');
          this.productService.updateImage(this.productId, this.selectedFile).subscribe({
            next: () => {
              console.log('✅ Imagem atualizada');
              this.finishSuccess();
            },
            error: (err) => {
              console.error('❌ Erro ao atualizar imagem:', err);
              this.notification.show('Erro ao atualizar imagem');
            },
          });
        }
        // Nenhuma mudança na imagem
        else {
          this.finishSuccess();
        }
      },
      error: (err) => {
        console.error('❌ Erro ao atualizar produto:', err);
        this.notification.show('Erro ao atualizar produto');
      },
    });
  }

  private finishSuccess() {
    this.notification.show('Produto atualizado com sucesso');
    this.router.navigate(['/list-products']);
  }

  removeImage() {
    console.log('🗑️ Removendo preview da imagem');
    this.imagePreview = null;
    this.selectedFile = null;
    this.imageWasRemoved = true;
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', file.name, file.type, file.size);

    this.selectedFile = file;
    this.imageWasRemoved = false;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      console.log('✅ Preview da imagem carregado');
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  goBack() {
    this.router.navigate(['/list-products']);
  }

  onPriceInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    value = value.replace(/[^\d]/g, '');

    if (value === '' || value === '0') {
      value = '0';
    }

    value = value.replace(/^0+/, '') || '0';

    if (value.length > 8) {
      value = value.substring(0, 8);
    }

    const numValue = parseInt(value, 10);
    const formatted = (numValue / 100).toFixed(2).replace('.', ',');

    input.value = formatted;

    const valueForForm = (numValue / 100).toFixed(2);
    this.form.get('price')?.setValue(valueForForm, { emitEvent: false });

    this.ngZone.run(() => {
      setTimeout(() => {
        input.setSelectionRange(formatted.length, formatted.length);
      }, 0);
    });
  }

  onPriceBlur() {
    const value = this.form.get('price')?.value;

    if (value === '' || value === null || value === undefined) {
      this.form.get('price')?.setValue('0.00', { emitEvent: false });
      return;
    }

    const num = parseFloat(value.toString().replace(',', '.'));
    if (isNaN(num)) {
      this.form.get('price')?.setValue('0.00', { emitEvent: false });
    } else {
      this.form.get('price')?.setValue(num.toFixed(2), { emitEvent: false });
    }
  }

  onPriceFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ngZone.run(() => {
      setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    });
  }
}