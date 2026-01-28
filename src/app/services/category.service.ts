import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryWithProducts } from '../models/category.models';

export interface CreateCategoryResponse {
  id: string;
  name: string;
}

export interface Category {
  categoryId: string;
  categoryName: string;
  products: any[];
}

export interface CreateCategoryRequest {
  name: string;
}

export interface UpdateCategoryRequest {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly apiUrl = 'https://localhost:44356/api/Categories';

  constructor(private http: HttpClient) {}

  create(data: CreateCategoryRequest): Observable<CreateCategoryResponse> {
    const restaurantId = localStorage.getItem('restaurantId');

    return this.http.post<CreateCategoryResponse>(
      this.apiUrl,
      data,
      {
        headers: {
          'X-Restaurant-Id': restaurantId ?? ''
        }
      }
    );
  }

  getAllByRestaurant(restaurantId: string): Observable<Category[]> {
    return this.http.get<Category[]>(
      `${this.apiUrl}/restaurant/${restaurantId}`
    );
  }

  getWithProducts(restaurantId: string): Observable<CategoryWithProducts[]> {
    return this.http.get<CategoryWithProducts[]>(
      `${this.apiUrl}/with-products/${restaurantId}`
    );
  }

  update(categoryId: string, data: UpdateCategoryRequest): Observable<any> {
    const restaurantId = localStorage.getItem('restaurantId');

    return this.http.put(
      `${this.apiUrl}/with-products/${categoryId}`,
      data,
      {
        headers: {
          'X-Restaurant-Id': restaurantId ?? ''
        }
      }
    );
  }

  deleteCategory(categoryId: string): Observable<any> {
    const restaurantId = localStorage.getItem('restaurantId');

    return this.http.delete(
      `${this.apiUrl}/${categoryId}`,
      {
        headers: {
          'X-Restaurant-Id': restaurantId ?? ''
        }
      }
    );
  }
}