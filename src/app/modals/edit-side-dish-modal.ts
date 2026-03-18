import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SideDishService } from '../services/side-dish.service';
import { NotificationService } from '../services/notification.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-side-dish-group-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen && group" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>Editar grupo de complementos</h2>
          <button class="close-btn" (click)="close()">✕</button>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" class="modal-body">
          <div class="form-group">
            <label>Nome do grupo</label>
            <input formControlName="name" />
          </div>

          <div class="grid">
            <div class="form-group">
              <label>Mínimo</label>
              <input type="number" formControlName="minQuantity" />
            </div>

            <div class="form-group">
              <label>Máximo</label>
              <input type="number" formControlName="maxQuantity" />
            </div>
          </div>

          <label class="checkbox">
            <input type="checkbox" formControlName="isRequired" />
            Obrigatório
          </label>

          <hr />

          <section class="complements">
            <h3>Complementos</h3>

            <div class="complement-list">
              <!-- Cards existentes -->
              <div class="complement-card" *ngFor="let c of group.complements; let i = index">
                <div class="card-main">
                  <div class="card-row">
                    <!-- Nome editável -->
                    <input
                      class="name-input"
                      [(ngModel)]="c.name"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="Nome do complemento"
                      (input)="markComplementAsEdited(i)"
                    />

                    <!-- Preço editável -->
                    <input
                      class="price-input"
                      [value]="formatPrice(c.unitPrice || c.price || 0)"
                      (input)="onPriceInput($event, c, i)"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <!-- Botões de ação -->
                <div class="card-actions">
                  <!-- Botão confirmar alteração (aparece apenas se editado) -->
                  <button
                    *ngIf="isComplementEdited(i)"
                    type="button"
                    class="btn-action btn-confirm"
                    (click)="confirmUpdateComplement(c, i)"
                    title="Confirmar alteração"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="icon"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </button>

                  <!-- Botão remover -->
                  <button
                    type="button"
                    class="btn-remove"
                    (click)="removeComplement(c)"
                    title="Remover complemento"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="trash-icon"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Card de adicionar novo complemento -->
              <div class="complement-card add-card" *ngIf="isAddingComplement">
                <div class="card-main">
                  <div class="card-row">
                    <!-- Nome -->
                    <input
                      class="name-input"
                      [(ngModel)]="newComplementName"
                      [ngModelOptions]="{ standalone: true }"
                      placeholder="Nome do complemento"
                      autofocus
                    />

                    <!-- Preço -->
                    <input
                      class="price-input"
                      [value]="formatPrice(newComplementPrice)"
                      (input)="onNewComplementPriceInput($event)"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <!-- Botões de ação -->
                <div class="add-card-actions">
                  <button
                    type="button"
                    class="btn-action btn-save"
                    (click)="saveNewComplement()"
                    title="Salvar complemento"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="2"
                      stroke="currentColor"
                      class="icon"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="btn-action btn-cancel-add"
                    (click)="cancelAddComplement()"
                    title="Cancelar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="trash-icon"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <footer class="modal-footer">
            <button type="button" class="btn-link" (click)="openAddComplement()">
              + Adicionar complemento
            </button>

            <div class="footer-actions">
              <button type="button" class="btn-cancel" (click)="close()">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar</button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000000000000000;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-content {
        background: #fff;
        width: 540px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .modal-header {
        padding: 24px 24px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f9fafb;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #111827;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        line-height: 1;
        padding: 0;
      }

      .close-btn:hover {
        background: #e5e7eb;
        color: #374151;
      }

      .modal-body {
        padding: 24px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 20px;
      }

      .form-group label {
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
      }

      input {
        padding: 14px 16px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        font-size: 15px;
        background: white;
        transition: all 0.2s;
      }

      input::placeholder {
        color: #9ca3af;
        font-size: 14px;
      }

      input:focus {
        outline: none;
        border-color: #740300;
        box-shadow: 0 0 0 3px rgba(116, 3, 0, 0.1);
      }

      input[type='number'] {
        -moz-appearance: textfield;
      }

      input[type='number']::-webkit-outer-spin-button,
      input[type='number']::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 16px 0 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .checkbox input[type='checkbox'] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        padding: 0;
      }

      hr {
        margin: 24px 0;
        border: none;
        border-top: 1px solid #eee;
      }

      .complements h3 {
        margin: 0 0 16px;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }

      .complement-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .complement-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        gap: 12px;
        transition: all 0.2s;
      }

      .complement-card:hover {
        border-color: #d1d5db;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .card-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
      }

      .card-row {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .name-input {
        flex: 1;
        min-width: 0;
        font-size: 15px;
        font-weight: 500;
        border: 1px solid #d1d5db !important;
        outline: none;
        padding: 12px 14px;
        background: white;
        border-radius: 8px;
        color: #111827;
        transition: all 0.2s;
      }

      .name-input::placeholder {
        color: #9ca3af;
        font-size: 14px;
        font-weight: 400;
      }

      .name-input:focus {
        border-color: #740300 !important;
        box-shadow: 0 0 0 3px rgba(116, 3, 0, 0.1);
        background: white;
      }

      .price-input {
        width: 100px;
        flex-shrink: 0;
        text-align: right;
        font-weight: 600;
        color: #16a34a;
        border: 1px solid #d1d5db !important;
        padding: 12px 14px;
        background: white;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .price-input::placeholder {
        color: #9ca3af;
        font-size: 14px;
      }

      .price-input:focus {
        border-color: #16a34a !important;
        box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
        background: white;
      }

      .card-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .btn-action {
        background: white;
        border: 1px solid #e5e7eb;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .btn-action .icon {
        width: 20px;
        height: 20px;
      }

      .btn-confirm {
        color: #2563eb;
        border-color: #dbeafe;
        animation: pulse 0.3s ease-out;
      }

      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      .btn-confirm:hover {
        background: #dbeafe;
        border-color: #bfdbfe;
        transform: scale(1.05);
      }

      .btn-remove {
        background: white;
        border: 1px solid #fee2e2;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 8px;
        transition: all 0.2s;
        flex-shrink: 0;
        color: #740300;
      }

      .btn-remove:hover {
        background: #fee2e2;
        border-color: #fecaca;
        transform: scale(1.05);
      }

      .btn-remove:active,
      .btn-action:active {
        transform: scale(0.95);
      }

      .trash-icon {
        width: 20px;
        height: 20px;
      }

      .add-card {
        border: 2px dashed #d1d5db !important;
        background: white !important;
      }

      .add-card:hover {
        border-color: #740300 !important;
        background: #fef2f2 !important;
      }

      .add-card-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .btn-save {
        color: #16a34a;
        border-color: #dcfce7;
      }

      .btn-save:hover {
        background: #dcfce7;
        border-color: #bbf7d0;
        transform: scale(1.05);
      }

      .btn-cancel-add {
        color: #dc2626;
        border-color: #fee2e2;
      }

      .btn-cancel-add:hover {
        background: #fee2e2;
        border-color: #fecaca;
        transform: scale(1.05);
      }

      .modal-footer {
        margin: 0 -24px;
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        align-items: center;
      }

      .modal-footer .btn-link {
        background: none !important;
        border: none !important;
        color: #740300 !important;
        font-weight: 600 !important;
        cursor: pointer;
        font-size: 14px !important;
        padding: 8px 4px !important;
        transition: all 0.2s;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
      }

      .modal-footer .btn-link:hover {
        color: #5a1010 !important;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .footer-actions {
        display: flex;
        gap: 12px;
        margin-left: auto;
      }

      .modal-footer .btn-cancel {
        padding: 12px 24px !important;
        background: white !important;
        border: 1.5px solid #d1d5db !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #4b5563 !important;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 100px;
        font-family: inherit;
      }

      .modal-footer .btn-cancel:hover {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
        color: #1f2937 !important;
      }

      .modal-footer .btn-primary {
        padding: 12px 28px !important;
        background: #740300 !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        color: white !important;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 100px;
        font-family: inherit;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
      }

      .modal-footer .btn-primary:hover:not(:disabled) {
        background: #5a1010 !important;
        box-shadow: 0 4px 6px -1px rgba(116, 3, 0, 0.3) !important;
        transform: translateY(-1px);
      }

      .modal-footer .btn-primary:active:not(:disabled) {
        transform: translateY(0);
      }

      @media (max-width: 768px) {
        .modal-content {
          width: 100%;
          max-width: 100%;
          margin: 0;
          border-radius: 12px 12px 0 0;
          max-height: 95vh;
        }

        .modal-overlay {
          padding: 0;
          align-items: flex-end;
        }

        .modal-header,
        .modal-body {
          padding: 16px;
        }

        .modal-footer {
          padding: 12px 16px !important;
          margin: 0 -16px;
          flex-wrap: wrap;
        }

        .modal-footer .btn-link {
          width: 100%;
          justify-content: center;
          order: 2;
        }

        .footer-actions {
          width: 100%;
          margin-left: 0;
          order: 1;
          gap: 8px;
        }

        .modal-footer .btn-cancel,
        .modal-footer .btn-primary {
          flex: 1;
          min-width: 0;
        }

        .grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .card-row {
          flex-direction: column;
          gap: 8px;
        }

        .name-input,
        .price-input {
          width: 100%;
        }

        .price-input {
          text-align: left;
        }

        .complement-card {
          padding: 12px;
        }

        .btn-remove,
        .btn-action {
          width: 40px;
          height: 40px;
        }

        .card-actions {
          flex-direction: row;
        }
      }
    `,
  ],
})
export class EditSideDishGroupModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() group: any;

  @Output() closeModal = new EventEmitter<void>();
  @Output() groupUpdated = new EventEmitter<void>();

  form: FormGroup;
  complementForm: FormGroup;

  loading = false;
  isAddingComplement = false;
  newComplementMin = 0;
  newComplementMax = 1;
  newComplementName = '';
  newComplementPrice = 0;
  newComplementQuantity = 0;

  editedComplementsIndexes: Set<number> = new Set();

  constructor(
    private fb: FormBuilder,
    private sideDishService: SideDishService,
    private notification: NotificationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      minQuantity: [0, Validators.required],
      maxQuantity: [1, Validators.required],
      isRequired: [false],
    });

    this.complementForm = this.fb.group({
      name: ['', Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnChanges(): void {
    if (!this.group) return;

    console.log('🔄 ngOnChanges - Grupo recebido:', JSON.parse(JSON.stringify(this.group)));

    this.editedComplementsIndexes.clear();

    this.form.patchValue({
      name: this.group.name,
      minQuantity: this.group.minQuantity,
      maxQuantity: this.group.maxQuantity,
      isRequired: this.group.isRequired,
    });

    if (!this.group.complements) {
      this.group.complements = [];
    } else {
      this.group.complements.forEach((c: any, index: number) => {
        console.log(`📋 Complemento [${index}] ANTES:`, { 
          id: c.id, 
          name: c.name, 
          price: c.price, 
          unitPrice: c.unitPrice 
        });

        if (c.minQuantity === undefined || c.minQuantity === null) {
          c.minQuantity = 0;
        }
        if (c.maxQuantity === undefined || c.maxQuantity === null) {
          c.maxQuantity = 1;
        }
        if (c.price === undefined || c.price === null) {
          c.price = c.unitPrice || 0;
        }
        if (c.unitPrice === undefined || c.unitPrice === null) {
          c.unitPrice = c.price || 0;
        }

        console.log(`📋 Complemento [${index}] DEPOIS:`, { 
          id: c.id, 
          name: c.name, 
          price: c.price, 
          unitPrice: c.unitPrice 
        });
      });
    }
  }

  close() {
    this.editedComplementsIndexes.clear();
    this.closeModal.emit();
  }

  formatPrice(value: number): string {
    return (value ?? 0).toFixed(2).replace('.', ',');
  }

  onPriceInput(event: Event, complement: any, index: number) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const number = Number(digits) / 100;
    
    console.log('💰 onPriceInput:', {
      index,
      inputValue: input.value,
      digits,
      calculatedNumber: number,
      complementBefore: { ...complement }
    });
    
    // Atualiza ambas as propriedades
    complement.price = number;
    complement.unitPrice = number;
    
    input.value = this.formatPrice(number);
    
    console.log('💰 Complemento APÓS atualização:', {
      name: complement.name,
      price: complement.price,
      unitPrice: complement.unitPrice
    });
    
    this.markComplementAsEdited(index);
  }

  markComplementAsEdited(index: number): void {
    console.log(`✏️ Marcando complemento [${index}] como editado`);
    this.editedComplementsIndexes.add(index);
    console.log('📝 Complementos editados:', Array.from(this.editedComplementsIndexes));
  }

  isComplementEdited(index: number): boolean {
    return this.editedComplementsIndexes.has(index);
  }

  confirmUpdateComplement(c: any, index: number): void {
    if (!c.id) {
      console.error('❌ Complemento sem ID!', c);
      return;
    }

    const dataToSend = {
      name: c.name,
      unitPrice: c.unitPrice,
    };

    console.log('🚀 ENVIANDO ATUALIZAÇÃO:');
    console.log('  - ID:', c.id);
    console.log('  - Dados:', dataToSend);
    console.log('  - Complemento completo:', JSON.parse(JSON.stringify(c)));

    this.sideDishService
      .updateSideDish(c.id, dataToSend)
      .subscribe({
        next: (response) => {
          console.log('✅ RESPOSTA DO BACKEND:', response);
          this.notification.show('Complemento atualizado');
          this.editedComplementsIndexes.delete(index);
          setTimeout(() => this.cdr.detectChanges(), 0);
        },
        error: (err) => {
          console.error('❌ ERRO AO ATUALIZAR:');
          console.error('  - Status:', err.status);
          console.error('  - Message:', err.message);
          console.error('  - Error completo:', err);
          this.notification.show('Erro ao atualizar complemento');
        },
      });
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;

    this.sideDishService.updateSideDishGroup(this.group.id, this.form.value).subscribe({
      next: () => {
        this.notification.show('Cardápio atualizado com sucesso');
        this.groupUpdated.emit();
        this.close();
        this.loading = false;
      },
      error: () => {
        this.notification.show('Erro ao atualizar grupo');
        this.loading = false;
      },
    });
  }

  openAddComplement() {
    this.isAddingComplement = true;
    this.newComplementMin = 0;
    this.newComplementMax = 1;
    this.newComplementName = '';
    this.newComplementPrice = 0;
  }

  cancelAddComplement() {
    this.isAddingComplement = false;
    this.newComplementMin = 0;
    this.newComplementMax = 1;
    this.newComplementName = '';
    this.newComplementPrice = 0;
  }

  saveNewComplement() {
    if (!this.newComplementName || this.newComplementName.trim() === '') {
      this.notification.show('Preencha o nome do complemento');
      return;
    }

    console.log('➕ Criando novo complemento:', {
      sideDishGroupId: this.group.id,
      name: this.newComplementName,
      unitPrice: this.newComplementPrice,
      quantity: this.newComplementQuantity,
    });

    this.sideDishService
      .createSideDish({
        sideDishGroupId: this.group.id,
        name: this.newComplementName,
        unitPrice: this.newComplementPrice,
        quantity: this.newComplementQuantity,
      })
      .subscribe((created) => {
        console.log('✅ Complemento criado:', created);

        const complementToAdd = {
          ...created,
          price: created.unitPrice || 0,
          unitPrice: created.unitPrice || 0,
          minQuantity: 0,
          maxQuantity: 1,
        };

        console.log('➕ Adicionando à lista:', complementToAdd);

        this.group.complements.push(complementToAdd);
        this.notification.show('Complemento adicionado');
        this.cancelAddComplement();
        setTimeout(() => this.cdr.detectChanges(), 0);
      });
  }

  onNewComplementPriceInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const number = Number(digits) / 100;
    this.newComplementPrice = number;
    input.value = this.formatPrice(number);
  }

  removeComplement(c: any) {
    console.log('🗑️ Removendo complemento:', c.id);
    this.sideDishService.deleteSideDish(c.id).subscribe(() => {
      this.group.complements = this.group.complements.filter((x: any) => x.id !== c.id);
      this.editedComplementsIndexes.clear();
      setTimeout(() => this.cdr.detectChanges(), 0);
    });
  }
}