import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface Neighborhood {
  id: string;
  name: string;
  deliveryFee: number;
  baseDeliveryTimeInMinutes: number;
}

interface City {
  id: string;
  name: string;
  neighborhoods: Neighborhood[];
}

interface DeleteTarget {
  type: 'city' | 'neighborhood';
  name: string;
  id: string;
  cityId?: string;
}

@Component({
  selector: 'app-delivery-zones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-zones.html',
  styleUrls: ['./delivery-zones.css'],
})
export class DeliveryZonesComponent implements OnInit {

  cities: City[] = [];
  loading = true;
  error: string | null = null;

  private restaurantId!: string;
  private openCities = new Set<string>();

  // ── City modal ────────────────────────────────────
  showCityModal = false;
  editingCity: City | null = null;
  cityForm = { name: '' };
  cityError = '';
  savingCity = false;

  // ── Neighborhood modal ────────────────────────────
  showNeighborhoodModal = false;
  editingNeighborhood: Neighborhood | null = null;
  selectedCityForNeighborhood: City | null = null;
  neighborhoodForm = { name: '', deliveryFee: 0, baseDeliveryTimeInMinutes: 30 };
  // Campo de texto com máscara para taxa — ex: "R$ 5,00"
  deliveryFeeRaw = 'R$ 0,00';
  neighborhoodError = '';
  savingNeighborhood = false;

  // ── Delete modal ──────────────────────────────────
  showDeleteModal = false;
  deleteTarget: DeleteTarget | null = null;
  deleting = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const restaurantId =
      this.route.snapshot.params['restaurantId'] ??
      this.route.snapshot.parent?.params['restaurantId'];

    this.restaurantId = restaurantId;
    this.loadZones();
  }

  // ── Data ──────────────────────────────────────────
  loadZones(): void {
    this.loading = true;
    this.error = null;

    this.http
      .get<City[]>(`${environment.apiUrl}/api/Cities/${this.restaurantId}/restaurants`)
      .subscribe({
        next: (cities) => {
          this.cities = [...cities];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Erro ao carregar zonas de entrega.';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ── Collapse ──────────────────────────────────────
  toggleCity(id: string): void {
    if (this.openCities.has(id)) this.openCities.delete(id);
    else this.openCities.add(id);
    this.cdr.detectChanges();
  }

  isCityOpen(id: string): boolean {
    return this.openCities.has(id);
  }

  // ── Máscara monetária ─────────────────────────────
  onDeliveryFeeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove tudo que não for dígito
    const digits = input.value.replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const formatted = (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    this.deliveryFeeRaw = formatted;
    this.neighborhoodForm.deliveryFee = cents / 100;
    // Força o input a mostrar o valor formatado
    input.value = formatted;
  }

  private parseFeeRaw(raw: string): number {
    const digits = raw.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
  }

  private feeToRaw(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // ── City modal ────────────────────────────────────
  openAddCityModal(): void {
    this.editingCity = null;
    this.cityForm = { name: '' };
    this.cityError = '';
    this.showCityModal = true;
  }

  openEditCityModal(city: City): void {
    this.editingCity = city;
    this.cityForm = { name: city.name };
    this.cityError = '';
    this.showCityModal = true;
  }

  closeCityModal(): void {
    this.showCityModal = false;
    this.editingCity = null;
    this.cityError = '';
  }

  saveCity(): void {
    if (!this.cityForm.name.trim()) {
      this.cityError = 'Nome da cidade é obrigatório.';
      return;
    }

    this.savingCity = true;
    this.cityError = '';

    if (this.editingCity) {
      const editingId = this.editingCity.id;
      const editingName = this.cityForm.name;
      this.http
        .put(`${environment.apiUrl}/api/Cities/${editingId}`, { name: editingName })
        .subscribe({
          next: () => {
            this.cities = this.cities.map(c =>
              c.id === editingId ? { ...c, name: editingName } : c
            );
            this.savingCity = false;
            this.closeCityModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.cityError = 'Erro ao salvar cidade.';
            this.savingCity = false;
            this.cdr.detectChanges();
          },
        });
    } else {
      const body = { name: this.cityForm.name, restaurantId: this.restaurantId };
      this.http
        .post<City>(`${environment.apiUrl}/api/Cities`, body)
        .subscribe({
          next: (newId: any) => {
            const newCity: City = {
              id: typeof newId === 'string' ? newId : newId.id,
              name: this.cityForm.name,
              neighborhoods: [],
            };
            this.cities = [...this.cities, newCity];
            this.openCities.add(newCity.id);
            this.savingCity = false;
            this.closeCityModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.cityError = 'Erro ao criar cidade.';
            this.savingCity = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  // ── Neighborhood modal ────────────────────────────
  openAddNeighborhoodModal(city: City): void {
    this.selectedCityForNeighborhood = city;
    this.editingNeighborhood = null;
    this.neighborhoodForm = { name: '', deliveryFee: 0, baseDeliveryTimeInMinutes: 30 };
    this.deliveryFeeRaw = 'R$ 0,00';
    this.neighborhoodError = '';
    this.showNeighborhoodModal = true;
    if (!this.isCityOpen(city.id)) this.openCities.add(city.id);
  }

  openEditNeighborhoodModal(city: City, nb: Neighborhood): void {
    this.selectedCityForNeighborhood = city;
    this.editingNeighborhood = nb;
    this.neighborhoodForm = {
      name: nb.name,
      deliveryFee: nb.deliveryFee,
      baseDeliveryTimeInMinutes: nb.baseDeliveryTimeInMinutes,
    };
    this.deliveryFeeRaw = this.feeToRaw(nb.deliveryFee);
    this.neighborhoodError = '';
    this.showNeighborhoodModal = true;
  }

  closeNeighborhoodModal(): void {
    this.showNeighborhoodModal = false;
    this.editingNeighborhood = null;
    this.selectedCityForNeighborhood = null;
    this.neighborhoodError = '';
  }

  saveNeighborhood(): void {
    if (!this.neighborhoodForm.name.trim()) {
      this.neighborhoodError = 'Nome do bairro é obrigatório.';
      return;
    }

    // Garante que o valor numérico está sincronizado com a máscara
    this.neighborhoodForm.deliveryFee = this.parseFeeRaw(this.deliveryFeeRaw);

    this.savingNeighborhood = true;
    this.neighborhoodError = '';

    if (this.editingNeighborhood) {
      this.http
        .put(`${environment.apiUrl}/api/Neighborhoods/${this.editingNeighborhood.id}`, this.neighborhoodForm)
        .subscribe({
          next: () => {
            this.cities = this.cities.map(c => {
              if (c.id !== this.selectedCityForNeighborhood!.id) return c;
              return {
                ...c,
                neighborhoods: c.neighborhoods.map(n =>
                  n.id === this.editingNeighborhood!.id
                    ? { ...n, ...this.neighborhoodForm }
                    : n
                ),
              };
            });
            this.savingNeighborhood = false;
            this.closeNeighborhoodModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.neighborhoodError = 'Erro ao salvar bairro.';
            this.savingNeighborhood = false;
            this.cdr.detectChanges();
          },
        });
    } else {
      const body = {
        cityId: this.selectedCityForNeighborhood!.id,
        name: this.neighborhoodForm.name,
        deliveryFee: this.neighborhoodForm.deliveryFee,
        baseDeliveryTimeInMinutes: this.neighborhoodForm.baseDeliveryTimeInMinutes,
      };
      this.http
        .post<Neighborhood>(`${environment.apiUrl}/api/Neighborhoods`, body)
        .subscribe({
          next: (nb) => {
            const cityId = this.selectedCityForNeighborhood!.id;
            // Novo array: adiciona bairro na cidade correta
            this.cities = this.cities.map(c => {
              if (c.id !== cityId) return c;
              // Se o back não retornou os campos, usa o que foi enviado
              const newNb: Neighborhood = {
                id: nb.id,
                name: nb.name ?? this.neighborhoodForm.name,
                deliveryFee: nb.deliveryFee ?? this.neighborhoodForm.deliveryFee,
                baseDeliveryTimeInMinutes:
                  nb.baseDeliveryTimeInMinutes ?? this.neighborhoodForm.baseDeliveryTimeInMinutes,
              };
              return { ...c, neighborhoods: [...c.neighborhoods, newNb] };
            });
            this.savingNeighborhood = false;
            this.closeNeighborhoodModal();
            this.cdr.detectChanges();
          },
          error: () => {
            this.neighborhoodError = 'Erro ao criar bairro.';
            this.savingNeighborhood = false;
            this.cdr.detectChanges();
          },
        });
    }
  }

  // ── Delete modal ──────────────────────────────────
  openDeleteModal(type: 'city' | 'neighborhood', item: City | Neighborhood, cityId?: string): void {
    this.deleteTarget = { type, name: item.name, id: item.id, cityId };
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleting = false;
  }

  confirmDelete(): void {
  if (!this.deleteTarget) return;

  this.deleting = true;

  const { type, id } = this.deleteTarget;

  const url =
    type === 'city'
      ? `${environment.apiUrl}/api/Cities/delete/${id}`
      : `${environment.apiUrl}/api/Neighborhoods/delete/${id}`;

  this.http.put(url, {}).subscribe({
    next: () => {
      if (type === 'city') {
        this.cities = this.cities.filter(c => c.id !== id);
        this.openCities.delete(id);
      } else {
        this.cities = this.cities.map(c => ({
          ...c,
          neighborhoods: c.neighborhoods.filter(n => n.id !== id),
        }));
      }

      this.closeDeleteModal();
      this.cdr.detectChanges();
    },
    error: () => {
      this.deleting = false;
      this.cdr.detectChanges();
    },
  });
}

  // ── Helpers ───────────────────────────────────────
  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  trackByCityId(_: number, city: City): string { return city.id; }
  trackByNeighborhoodId(_: number, nb: Neighborhood): string { return nb.id; }
}