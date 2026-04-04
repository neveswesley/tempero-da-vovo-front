// opening-hours.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

// ── Types ────────────────────────────────────────────────────────────────────

interface TimeSlot {
  openTime: string;   // "HH:mm"
  closeTime: string;  // "HH:mm"
}

interface DaySchedule {
  dayOfWeek: number;  // 0 = Sunday … 6 = Saturday (matches C# DayOfWeek enum)
  label: string;
  abbr: string;
  isOpen: boolean;
  slots: TimeSlot[];
  error?: string;
}

interface OpeningHourItemRequest {
  dayOfWeek: number;
  openTime: string;   // "HH:mm:ss"
  closeTime: string;
}

interface UpdateRestaurantOpeningHoursRequest {
  openingHours: OpeningHourItemRequest[];
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-opening-hours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './opening-hours.html',
  styleUrls: ['./opening-hours.css'],
})
export class OpeningHoursComponent implements OnInit {

  restaurantId!: string;

  loading = true;
  error: string | null = null;
  saving = false;
  saveError: string | null = null;
  showSaveModal = false;

  schedule: DaySchedule[] = [
    { dayOfWeek: 0, label: 'Domingo', abbr: 'Dom', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 1, label: 'Segunda-feira', abbr: 'Seg', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 2, label: 'Terça-feira', abbr: 'Ter', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 3, label: 'Quarta-feira', abbr: 'Qua', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 4, label: 'Quinta-feira', abbr: 'Qui', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 5, label: 'Sexta-feira', abbr: 'Sex', isOpen: false, slots: [this.defaultSlot()] },
    { dayOfWeek: 6, label: 'Sábado', abbr: 'Sáb', isOpen: false, slots: [this.defaultSlot()] },
  ];

  constructor(private http: HttpClient, private route: ActivatedRoute, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.parent?.paramMap.get('restaurantId') ?? this.route.snapshot.paramMap.get('restaurantId')!;
    this.loadHours();
  }

  loadHours(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get(`${environment.apiUrl}/api/restaurants/opening-hours/${this.restaurantId}`)
      .subscribe({
        next: (res) => {
          this.applyResponse(Array.isArray(res) ? res : []);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Não foi possível carregar os horários. Tente novamente.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private applyResponse(hours: OpeningHourItemRequest[]): void {
    this.schedule.forEach((d) => {
      d.isOpen = false;
      d.slots = [this.defaultSlot()];
      d.error = undefined;
    });

    const grouped = new Map<number, OpeningHourItemRequest[]>();
    hours.forEach((h) => {
      if (!grouped.has(h.dayOfWeek)) grouped.set(h.dayOfWeek, []);
      grouped.get(h.dayOfWeek)!.push(h);
    });

    grouped.forEach((items, dow) => {
      const day = this.schedule.find((d) => d.dayOfWeek === dow);
      if (!day) return;
      day.isOpen = true;
      day.slots = items.map((i) => ({
        openTime: i.openTime.substring(0, 5),
        closeTime: i.closeTime.substring(0, 5),
      }));
    });
  }


  private defaultSlot(): TimeSlot {
    return { openTime: '08:00', closeTime: '22:00' };
  }

  onToggleDay(day: DaySchedule): void {
    if (day.isOpen && day.slots.length === 0) {
      day.slots = [this.defaultSlot()];
    }
    day.error = undefined;
  }

  addSlot(day: DaySchedule): void {
    if (day.slots.length < 3) {
      day.slots.push(this.defaultSlot());
    }
  }

  removeSlot(day: DaySchedule, index: number): void {
    day.slots.splice(index, 1);
    day.error = undefined;
  }

  onSlotChange(day: DaySchedule): void {
    day.error = undefined;
  }


  openSaveModal(): void {
    if (!this.validateAll()) return;
    this.saveError = null;
    this.showSaveModal = true;
  }

  closeSaveModal(): void {
    this.showSaveModal = false;
  }

  confirmSave(): void {
    this.saving = true;
    this.saveError = null;

    const payload = this.buildPayload();

    this.http.put(`${environment.apiUrl}/api/Restaurants/opening-hours/${this.restaurantId}`, payload)
      .subscribe({
        next: () => {
          this.saving = false;
          this.showSaveModal = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.showSaveModal = false;
          const messages: string[] = err?.error?.errors ?? [];
          this.saveError = messages.length
            ? messages.join(' ')
            : 'Erro ao salvar horários. Verifique os dados e tente novamente.';
          this.cdr.markForCheck();
        },
      });
  }

  private validateAll(): boolean {
    let valid = true;

    this.schedule.forEach((day) => {
      day.error = undefined;
      if (!day.isOpen) return;

      for (let i = 0; i < day.slots.length; i++) {
        const slot = day.slots[i];

        if (!slot.openTime || !slot.closeTime) {
          day.error = 'Preencha todos os horários.';
          valid = false;
          return;
        }

        if (slot.openTime >= slot.closeTime) {
          day.error = 'O horário de abertura deve ser anterior ao de fechamento.';
          valid = false;
          return;
        }

        for (let j = 0; j < i; j++) {
          const prev = day.slots[j];
          if (slot.openTime < prev.closeTime && slot.closeTime > prev.openTime) {
            day.error = 'Os intervalos de horário não podem se sobrepor.';
            valid = false;
            return;
          }
        }
      }
    });

    return valid;
  }


  private buildPayload(): UpdateRestaurantOpeningHoursRequest {
    const openingHours: OpeningHourItemRequest[] = [];

    this.schedule.forEach((day) => {
      if (!day.isOpen) return;
      day.slots.forEach((slot) => {
        openingHours.push({
          dayOfWeek: day.dayOfWeek,
          openTime: `${slot.openTime}:00`,
          closeTime: `${slot.closeTime}:00`,
        });
      });
    });

    return { openingHours };
  }

  trackByDay(_: number, day: DaySchedule): number {
    return day.dayOfWeek;
  }

  trackByIndex(index: number): number {
    return index;
  }
}