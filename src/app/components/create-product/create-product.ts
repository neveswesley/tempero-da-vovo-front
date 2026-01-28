import { Component, ChangeDetectorRef, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.services';
import { Category } from '../../services/category.service';
import { NotificationService } from '../../services/notification.service';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-product.html',
  styleUrls: ['./create-product.css'],
})
export class CreateProductComponent implements OnInit {
  form: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  categories: Category[] = [];
  loadingCategories = false;

  categoryLockedFromUrl = false;
  selectedCategoryName: string = '';

  constructor(
    private fb: FormBuilder,
    private ngZone: NgZone,
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      price: ['0.00', [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required],
      imageUrl: [''],
    });
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Inicia com 0.00 formatado
    this.form.get('price')?.setValue('0.00', { emitEvent: false });

    // Captura o categoryId da URL
    this.route.queryParams.subscribe((params) => {
      const categoryIdFromUrl = params['categoryId'];

      if (categoryIdFromUrl) {
        this.categoryLockedFromUrl = true;
        sessionStorage.setItem('preSelectedCategoryId', categoryIdFromUrl);
      }
    });

    this.loadCategories();
  }

  getSelectedCategoryName(): string {
    if (this.loadingCategories) {
      return 'Carregando...';
    }

    const selectedCategoryId = this.form.get('categoryId')?.value;

    const category = this.categories.find((c) => c.categoryId === selectedCategoryId);

    return category?.categoryName ?? 'Categoria';
  }

  loadCategories() {
    if (!isPlatformBrowser(this.platformId)) return;

    const restaurantId = localStorage.getItem('restaurantId');

    if (!restaurantId) {
      console.error('RestaurantId não encontrado');
      return;
    }

    this.loadingCategories = true;
    this.form.get('categoryId')?.disable();

    this.productService.getCategories(restaurantId).subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loadingCategories = false;

        this.form.get('categoryId')?.enable();

        const preSelectedCategoryId = sessionStorage.getItem('preSelectedCategoryId');

        if (preSelectedCategoryId) {
          const selected = categories.find((c) => c.categoryId === preSelectedCategoryId);

          if (selected) {
            this.form.get('categoryId')?.setValue(selected.categoryId);
            this.selectedCategoryName = selected.categoryName;

            if (this.categoryLockedFromUrl) {
              this.form.get('categoryId')?.disable();
            }

          }

          sessionStorage.removeItem('preSelectedCategoryId');
        } else if (categories.length > 0) {
          this.form.get('categoryId')?.setValue(categories[0].categoryId);
          this.selectedCategoryName = categories[0].categoryName;
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao carregar categorias:', error);
        this.loadingCategories = false;
        this.form.get('categoryId')?.enable();
      },
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile = file;

    this.form.get('imageUrl')?.setValue(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      this.ngZone.run(() => {
        this.imagePreview = reader.result as string;
        this.cdr.detectChanges();
      });
    };

    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.form.get('imageUrl')?.setValue('');

    if (isPlatformBrowser(this.platformId)) {
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  onPriceInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Remove tudo que não é número
    value = value.replace(/[^\d]/g, '');

    // Se vazio, volta pra 0
    if (value === '') {
      value = '0';
    }

    // Remove zeros à esquerda, mas mantém pelo menos um zero
    value = value.replace(/^0+/, '') || '0';

    // Limita a 10 dígitos totais (para não estourar o decimal(10,2))
    if (value.length > 10) {
      value = value.substring(0, 10);
    }

    // Converte para centavos (inteiro)
    const cents = parseInt(value);

    // Converte de volta para formato decimal
    const formatted = (cents / 100).toFixed(2);

    // Atualiza o input
    input.value = formatted;
    
    // Atualiza o form control
    this.form.get('price')?.setValue(formatted, { emitEvent: false });

    // Move o cursor para o final
    this.ngZone.run(() => {
      setTimeout(() => {
        input.setSelectionRange(formatted.length, formatted.length);
      }, 0);
    });
  }

  onPriceBlur() {
    const value = this.form.get('price')?.value;
    
    // Garante que sempre tenha 2 casas decimais
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
    // Move o cursor para o final quando focar
    this.ngZone.run(() => {
      setTimeout(() => {
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
    });
  }

  goBack() {
    window.history.back();
  }

  submit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const restaurantId = localStorage.getItem('restaurantId');

    this.form.markAllAsTouched();
    this.form.updateValueAndValidity();

    if (this.form.invalid) {
      console.warn('Formulário inválido');
      return;
    }

    const formValue = this.form.getRawValue();

    // Converte o price formatado para número
    const priceValue = parseFloat(formValue.price.toString().replace(',', '.'));

    const payload = {
      restaurantId,
      name: formValue.name,
      description: formValue.description || '',
      price: priceValue,
      categoryId: formValue.categoryId,
    };


    this.productService.createProduct(payload, this.selectedFile || undefined).subscribe({
      next: () => {
        this.notificationService.show('Cardápio atualizado com sucesso!');
        setTimeout(() => {
          this.router.navigate(['/list-products']);
        }, 600);
      },
      error: (error) => {
        console.error('Erro ao criar produto:', error);
        this.notificationService.show('Erro ao criar produto');
        this.cdr.detectChanges();
      },
    });
  }
}