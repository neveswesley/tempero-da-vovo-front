import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface SideDishItem {
  id: string;
  name: string;
  unitPrice: number;
  isActive: boolean;
}

export interface CreateSideDishGroupRequest {
  restaurantId: string;
  productId: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  isRequired: boolean;
}

export interface CreateSideDishRequest {
  sideDishGroupId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface SideDishGroup {
  id: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  isRequired: boolean;
  complements: SideDishItem[];
}

export interface LinkSideDishGroupRequest {
  productId: string;
  sideDishGroupIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SideDishService {
  private baseUrl = `${environment.apiUrl}/api/SideDishes`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Cria um novo grupo de complementos
   */
  createSideDishGroup(payload: CreateSideDishGroupRequest): Observable<SideDishGroup> {
    return this.http.post<SideDishGroup>(`${this.baseUrl}/create-side-dish-group`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Cria um novo complemento dentro de um grupo
   */
  createSideDish(payload: CreateSideDishRequest): Observable<SideDishItem> {
    return this.http.post<SideDishItem>(`${this.baseUrl}/create-side-dish`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Busca todos os grupos de complementos de um restaurante
   */
  getSideDishGroupsByRestaurant(restaurantId: string): Observable<SideDishGroup[]> {
    return this.http.get<SideDishGroup[]>(
      `${this.baseUrl}/products/get-all-side-dish-groups/${restaurantId}`,
      { headers: this.getAuthHeaders() },
    );
  }

  /**
   * Busca grupos de complementos de um produto específico
   */
  getSideDishGroupsByProduct(productId: string): Observable<SideDishGroup[]> {
    return this.http
      .get<
        any[]
      >(`${this.baseUrl}/products/side-dish-groups/${productId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map((groups) =>
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            minQuantity: g.minQuantity,
            maxQuantity: g.maxQuantity,
            isRequired: g.isRequired,
            complements: (g.sideDish || g.complements || []).map((sd: any) => ({
              id: sd.id,
              name: sd.name,
              unitPrice: sd.unitPrice || sd.price,
              isActive: sd.isActive,
            })),
          })),
        ),
      );
  }

  /**
   * Vincula grupos de complementos existentes a um produto
   */
  linkSideDishGroupsToProduct(payload: LinkSideDishGroupRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/link-groups`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Atualiza um grupo de complementos
   */
  updateSideDishGroup(
    groupId: string,
    request: {
      name: string;
      minQuantity: number;
      maxQuantity: number;
      isRequired: boolean;
    },
  ): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${groupId}`, request, {
      headers: this.getAuthHeaders(),
    });
  }

  deleteSideDishGroup(groupId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/delete-group/${groupId}`, { headers: this.getAuthHeaders() });
  }

  toggleSideDishActive(sideDishId: string, isActive: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/active/${sideDishId}`,
      { isActive },
      { headers: this.getAuthHeaders() },
    );
  }

  addComplementToGroup(
    groupId: string,
    payload: { name: string; unitPrice: number },
  ): Observable<SideDishItem> {
    return this.http.post<SideDishItem>(
      `${this.baseUrl}/side-dish-groups/${groupId}/side-dishes`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  removeComplementFromGroup(groupId: string, complementId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/side-dish-groups/${groupId}/side-dishes/${complementId}`,
      { headers: this.getAuthHeaders() },
    );
  }

  /**
   * Deleta um complemento específico
   */
  deleteSideDish(sideDishId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete-side-dish/${sideDishId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  removeSideDishGroupsFromProduct(payload: { productId: string; sideDishGroupIds: string[] }) {
    return this.http.delete(`${this.baseUrl}/remove-side-dish-groups`, { body: payload });
  }

  updateSideDish(
  sideDishId: string,
  payload: { name: string; unitPrice: number }
): Observable<void> {
  return this.http.put<void>(
    `${this.baseUrl}/update-side-dish/${sideDishId}`,
    payload,
    { headers: this.getAuthHeaders() }
  );
}
}