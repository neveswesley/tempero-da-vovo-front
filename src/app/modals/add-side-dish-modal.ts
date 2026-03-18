import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SideDishService } from '../services/side-dish.service';
import { ConfirmationService } from '../services/confirmation.service';
import { forkJoin } from 'rxjs';

interface Complement {
  name: string;
  unitPrice: number;
  isActive: boolean;
}

interface ComplementGroup {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
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
  complements: Complement[];
  complementGroups?: ComplementGroup[];
}

@Component({
  selector: 'app-add-side-dish-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `<!-- Modal de Grupos de Complemento -->
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeComplementGroupModal()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2>Adicionar grupo de complementos</h2>
          <button class="close-btn" (click)="closeComplementGroupModal()" aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <h4>Escolher complementos</h4>
          <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0;">
            Selecione os grupos de complementos que deseja adicionar a este produto
          </p>

          <div class="complement-group-list">
            <div class="complement-group-option" *ngFor="let group of complementGroups">
              <label>
                <input type="checkbox" [(ngModel)]="group.selected" />
                <span>{{ group.name }}</span>
              </label>

              <button
                class="btn-delete"
                (click)="deleteGroup(group, $event)"
                aria-label="Excluir grupo"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>

            <div *ngIf="complementGroups.length === 0" class="empty-state">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                style="width: 48px; height: 48px; margin: 0 auto 12px; color: #d1d5db;"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <line
                  x1="9"
                  y1="9"
                  x2="15"
                  y2="15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <line
                  x1="15"
                  y1="9"
                  x2="9"
                  y2="15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <p style="margin: 0; color: #6b7280;">Nenhum grupo de complemento cadastrado</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <!-- ESQUERDA -->
          <button class="btn-link" (click)="addComplement(product!)">
            + Criar grupo de complementos
          </button>

          <!-- DIREITA -->
          <div class="footer-actions">
            <button class="btn-cancel" (click)="closeComplementGroupModal()">Cancelar</button>

            <button class="btn-primary" [disabled]="!hasChanges" (click)="save()">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>`,
  styles: [
    `
      :host {
        display: contents;
      }

      /* ===== MODAL DE GRUPOS DE COMPLEMENTO ===== */

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        padding: 16px;
        backdrop-filter: blur(2px);
      }

      .modal-container {
        width: 100%;
        max-width: 520px;
        background: #fff;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
        max-height: 90vh;
        overflow: hidden;
        z-index: 100000;
      }

      /* Header do Modal */
      .modal-header {
        padding: 24px 24px 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f9fafb;
        flex-shrink: 0;
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

      /* Body do Modal */
      .modal-body {
        padding: 24px;
        flex: 1;
        overflow-y: auto;
        min-height: 0;
      }

      .modal-body h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #111827;
      }

      /* Lista de Grupos */
      .complement-group-list {
        max-height: 280px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #f9fafb;
        padding: 12px;
        margin-top: 12px;
      }

      .complement-group-list::-webkit-scrollbar {
        width: 6px;
      }

      .complement-group-list::-webkit-scrollbar-track {
        background: #f1f3f5;
        border-radius: 3px;
      }

      .complement-group-list::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }

      .complement-group-list::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }

      .complement-group-option {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-right: 12px;
      }

      .complement-group-option:last-child {
        margin-bottom: 0;
      }

      .complement-group-option:hover {
        border-color: #740300;
        box-shadow: 0 2px 4px rgba(116, 3, 0, 0.1);
      }

      .complement-group-option label {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        cursor: pointer;
        margin: 0;
        font-weight: normal;
        flex: 1;
      }

      .complement-group-option input[type='checkbox'] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #740300;
        margin: 0;
        flex-shrink: 0;
      }

      .complement-group-option span {
        font-size: 14px;
        color: #374151;
        font-weight: 500;
      }

      .btn-delete {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .btn-delete:hover {
        background: #fef2f2;
      }

      .btn-delete svg {
        width: 18px;
        height: 18px;
        color: #740300;
        transition: color 0.2s;
      }

      .btn-delete:hover svg {
        color: #b91c1c;
      }

      /* Estado Vazio */
      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
        font-size: 14px;
        background: white;
        border-radius: 8px;
        border: 2px dashed #e5e7eb;
      }

      /* Footer do Modal */
      .modal-footer {
        width: 100%;
        padding: 20px 24px !important;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 16px;
        flex-shrink: 0;
      }

      .footer-left {
        display: flex;
        align-items: center;
        gap: 16px;
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
        margin: 0;
      }

      .modal-footer .btn-link:hover {
        color: #5a1010 !important;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .modal-footer .btn-link:active {
        transform: scale(0.98);
      }

      .modal-footer .footer-actions {
        display: flex;
        align-items: center;
        gap: 18px;
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

      .modal-footer .btn-cancel:active {
        transform: scale(0.98);
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
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
      }

      .modal-footer .btn-primary:disabled {
        background: #d1d5db !important;
        cursor: not-allowed;
        opacity: 0.6;
        box-shadow: none !important;
      }

      /* Responsivo - CORRIGIDO */
      @media (max-width: 768px) {
        .modal-overlay {
          padding: 0;
          align-items: flex-end;
        }

        .modal-container {
          max-width: 100%;
          width: 100%;
          border-radius: 12px 12px 0 0;
          max-height: 92vh;
          min-height: auto;
        }

        .modal-header {
          padding: 20px 16px;
        }

        .modal-header h2 {
          font-size: 18px;
        }

        .modal-body {
          padding: 16px;
        }

        .modal-footer {
          padding: 12px 16px !important;
          flex-direction: column;
          gap: 12px;
        }

        .modal-footer .btn-link {
          width: 100%;
          justify-content: center;
        }

        .modal-footer .footer-actions {
          width: 100%;
          margin-left: 0;
        }

        .modal-footer .btn-cancel,
        .modal-footer .btn-primary {
          width: 100%;
        }

        .complement-group-list {
          max-height: none;
          height: auto;
        }
      }

      @media (max-width: 480px) {
        .modal-container {
          max-height: 95vh;
        }

        .modal-header {
          padding: 16px;
        }

        .modal-header h2 {
          font-size: 16px;
        }

        .modal-body {
          padding: 12px;
        }

        .modal-footer {
          padding: 10px 12px !important;
        }
      }
    `,
  ],
})
export class AddSideDishModalComponent implements OnInit, OnChanges {
  // Inputs
  @Input() isOpen = false;
  @Input() product: Product | null = null;
  @Input() complementGroups: ComplementGroup[] = [];

  // Outputs
  @Output() closeModal = new EventEmitter<void>();
  @Output() complementsLinked = new EventEmitter<void>();

  constructor(
    private router: Router,
    private sideDishService: SideDishService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  private originallySelectedGroupIds: string[] = [];

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['complementGroups'] && this.complementGroups?.length) {
      this.originallySelectedGroupIds = this.complementGroups
        .filter((g) => g.selected)
        .map((g) => g.id.toString());

      console.log('📌 Estado original capturado:', this.originallySelectedGroupIds);
    }
  }

  // ===== MODAL DE GRUPOS DE COMPLEMENTO =====
  closeComplementGroupModal() {
    this.closeModal.emit();
  }

  get hasAnyComplementSelected(): boolean {
    return this.complementGroups.some((g) => g.selected);
  }

  addComplement(product: Product): void {
    localStorage.setItem('currentProductId', product.id);
    localStorage.setItem('openAddSideDishModal', 'true');
    this.closeModal.emit();
    this.router.navigate(['/create-side-dish-group']);
  }

  save(): void {
    if (!this.product) return;

    const currentlySelectedIds = this.complementGroups.filter((g) => g.selected).map((g) => g.id);

    const idsToAdd = currentlySelectedIds.filter(
      (id) => !this.originallySelectedGroupIds.includes(id),
    );

    const idsToRemove = this.originallySelectedGroupIds.filter(
      (id) => !currentlySelectedIds.includes(id),
    );

    const requests = [];

    if (idsToAdd.length > 0) {
      requests.push(
        this.sideDishService.linkSideDishGroupsToProduct({
          productId: this.product.id,
          sideDishGroupIds: idsToAdd,
        }),
      );
    }

    if (idsToRemove.length > 0) {
      requests.push(
        this.sideDishService.removeSideDishGroupsFromProduct({
          productId: this.product.id,
          sideDishGroupIds: idsToRemove,
        }),
      );
    }

    if (requests.length === 0) {
      this.closeModal.emit();
      return;
    }

    forkJoin(requests).subscribe({
      next: () => {
        this.complementsLinked.emit();
        this.closeModal.emit();
      },
      error: (err) => {
        console.error('❌ Erro ao salvar complementos', err);
        alert('Erro ao salvar complementos');
      },
    });
  }

  get hasChanges(): boolean {
    const current = this.complementGroups
      .filter((g) => g.selected)
      .map((g) => g.id)
      .sort();

    const original = [...this.originallySelectedGroupIds].sort();

    return JSON.stringify(current) !== JSON.stringify(original);
  }

  deleteGroup(group: ComplementGroup, event: Event) {
    event.stopPropagation(); // evita que marque o checkbox

    this.confirmationService
      .confirm({
        title: 'Excluir grupo',
        message: `Tem certeza que deseja excluir o grupo "${group.name}"?`,
        type: 'danger',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
      })
      .then((confirmed) => {
        if (!confirmed) return;

        this.sideDishService.deleteSideDishGroup(group.id).subscribe({
          next: () => {
            this.complementGroups = this.complementGroups.filter((g) => g.id !== group.id);
            this.cdr.detectChanges(); // atualiza o modal sem recarregar
            console.log(`✅ Grupo ${group.name} excluído`);
          },
          error: (err) => {
            console.error('❌ Erro ao excluir:', err);
            alert('Erro ao excluir grupo: ' + (err.error?.title || 'Erro desconhecido'));
          },
        });
      });
  }
}