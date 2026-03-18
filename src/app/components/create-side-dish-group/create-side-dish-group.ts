import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute  } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SideDishService } from '../../services/side-dish.service';
import { NotificationService } from '../../services/notification.service';

interface CreateSideDishGroupRequest {
  restaurantId: string;
  productId: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  isRequired: boolean;
}

@Component({
  selector: 'app-create-side-dish-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-side-dish-group.html',
  styleUrls: ['./create-side-dish-group.css']
})
export class CreateSideDishGroup implements OnInit {
  complementForm: FormGroup;
  loading = false;
  productId: string | null = null;
  restaurantId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private sideDishService: SideDishService,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object  // ⚡ ADICIONAR
  ) {
    this.complementForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      isRequired: [false],
      minQuantity: [0, [Validators.required, Validators.min(0)]],
      maxQuantity: [1, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    // ⚡ ADICIONAR VERIFICAÇÃO DE PLATAFORMA
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Recuperar IDs do localStorage
    this.productId = localStorage.getItem('currentProductId');
    this.restaurantId = localStorage.getItem('restaurantId');

    if (!this.productId || !this.restaurantId) {
      this.notificationService.show('Erro: Produto ou restaurante não identificado');
      this.router.navigate(['/list-products']);
      return;
    }
  }

  // ===== CONTROLES DE QUANTIDADE =====
  get minQuantity(): number {
    return this.complementForm.get('minQuantity')?.value || 0;
  }

  get maxQuantity(): number {
    return this.complementForm.get('maxQuantity')?.value || 0;
  }

  increaseMin(): void {
    const current = this.minQuantity;
    this.complementForm.patchValue({ minQuantity: current + 1 });
  }

  decreaseMin(): void {
    const current = this.minQuantity;
    if (current > 0) {
      this.complementForm.patchValue({ minQuantity: current - 1 });
    }
  }

  increaseMax(): void {
    const current = this.maxQuantity;
    this.complementForm.patchValue({ maxQuantity: current + 1 });
  }

  decreaseMax(): void {
    const current = this.maxQuantity;
    if (current > 0) {
      this.complementForm.patchValue({ maxQuantity: current - 1 });
    }
  }

  // ===== SUBMIT =====
  submitComplement(): void {
    if (this.complementForm.invalid) {
      this.notificationService.show('Por favor, preencha todos os campos obrigatórios');
      this.complementForm.markAllAsTouched();
      return;
    }

    const formValue = this.complementForm.value;

    if (formValue.minQuantity > formValue.maxQuantity) {
      this.notificationService.show('Quantidade mínima não pode ser maior que a máxima');
      return;
    }

    const request: CreateSideDishGroupRequest = {
      restaurantId: this.restaurantId!,
      productId: this.productId!,
      name: formValue.name,
      minQuantity: formValue.minQuantity,
      maxQuantity: formValue.maxQuantity,
      isRequired: formValue.isRequired === 'true' || formValue.isRequired === true
    };

    console.log('📤 Enviando request:', request);

    this.loading = true;

    this.sideDishService.createSideDishGroup(request).subscribe({
      next: (response) => {
        console.log('✅ Grupo de complementos criado:', response);
        this.notificationService.show('Grupo criado com sucesso!');

        // ⚡ VERIFICAR PLATAFORMA ANTES DE USAR LOCALSTORAGE
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('openAddSideDishModal', 'true');
          localStorage.setItem('currentProductId', this.productId!);
        }
        
        this.router.navigate(['/list-products']);
      },
      error: (error) => {
        console.error('❌ Erro ao criar grupo:', error);
        this.loading = false;
        
        const errorMessage = error.error?.message || 'Erro ao criar grupo de complementos';
        this.notificationService.show(errorMessage);
      }
    });
  }

  // ===== CANCELAR =====
  closeModal(): void {
    // ⚡ VERIFICAR PLATAFORMA
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentProductId');
    }
    
    this.router.navigate(['/list-products']);
  }

  cancel(): void {
    this.closeModal();
  }
}