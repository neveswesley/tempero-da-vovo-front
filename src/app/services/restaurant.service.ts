import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { RestaurantResponse, OpeningHourResponse } from "../models/restaurant.models";
import { environment } from "../environments/environment";

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  constructor(private http: HttpClient) {}

  getRestaurant(id: string): Observable<RestaurantResponse> {
    return this.http.get<RestaurantResponse>(`${environment.apiUrl}/api/Restaurants/${id}`);
  }

  isCurrentlyOpen(openingHours: OpeningHourResponse[]): boolean {
    if (!openingHours?.length) return false;

    const now = new Date();
    const todayHours = openingHours.find(h => h.dayOfWeek === now.getDay());
    if (!todayHours) return false;

    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const current = now.getHours() * 60 + now.getMinutes();
    return current >= toMinutes(todayHours.openTime) && current < toMinutes(todayHours.closeTime);
  }
}