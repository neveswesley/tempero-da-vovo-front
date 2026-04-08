import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AddItemToOrderRequest, OrderResponse, Product } from '../models/product.model';
import { CategoryWithProducts } from '../models/category.models';
import { ProductWithSideDishes } from '../models/side-dish.models';
import { environment } from '../environments/environment';
import { CategoryService } from '../services/category.service';


@Injectable({
  providedIn: 'root',
})
export class ProductService {

  private apiUrl = `${environment.apiUrl}/api/Products`;

  constructor(private http: HttpClient,
    private categoryService: CategoryService,
  ) { }

  createProduct(productData: any, file?: File): Observable<Product> {
    const formData = new FormData();

    formData.append('restaurantId', productData.restaurantId);
    formData.append('name', productData.name);

    if (productData.description) {
      formData.append('description', productData.description);
    }

    const priceValue =
      typeof productData.price === 'number'
        ? productData.price.toFixed(2)
        : parseFloat(productData.price.toString().replace(',', '.')).toFixed(2);

    formData.append('price', priceValue);
    formData.append('categoryId', productData.categoryId);

    if (file) {
      formData.append('file', file);
    }

    return this.http.post<Product>(this.apiUrl, formData);
  }

  getAllProducts(restaurantId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${restaurantId}`);
  }


  getCategories(restaurantId: string): Observable<CategoryWithProducts[]> {
    return this.http
      .get<Product[]>(this.apiUrl, {
        params: { restaurantId }
      })
      .pipe(
        map(products => {
          const categoriesMap = new Map<string, CategoryWithProducts>();

          products.forEach(product => {
            if (!product.category) return;

            const {
              id,
              categoryName,
              displayOrder
            } = product.category;

            if (!categoriesMap.has(id)) {
              categoriesMap.set(id, {
                categoryId: id,
                categoryName,
                displayOrder: displayOrder ?? 0,
                products: []
              });
            }

            categoriesMap.get(id)!.products.push(product);
          });

          return Array.from(categoriesMap.values()).sort(
            (a, b) => a.displayOrder - b.displayOrder
          );
        })
      );
  }

  deleteProduct(productId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/delete-product/${productId}`, null);
  }


  toggleActiveProduct(productId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${productId}/active`, { isActive });
  }


  getById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`);
  }

  update(productId: string, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${productId}`, payload);
  }

  updateImage(productId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('Image', file);

    return this.http.put(`${this.apiUrl}/${productId}/image`, formData);
  }

  removeImage(productId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${productId}/image`);
  }

  getProductWithSideDishes(productId: string): Observable<ProductWithSideDishes> {
    return this.http.get<ProductWithSideDishes>(
      `${this.apiUrl}/${productId}`
    );
  }

  getFullImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;

    if (
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('data:')
    ) {
      return imageUrl;
    }

    const cleanPath = imageUrl.startsWith('/')
      ? imageUrl.substring(1)
      : imageUrl;

    return `${environment.apiUrl}/${cleanPath}`;
  }

  duplicateProduct(productId: string, newProductName?: string) {
    return this.http.post(
      `${this.apiUrl}/duplicate-product`,
      {
        productId,
        newProductName,
      }
    );
  }

  getProductsByRestaurant(restaurantId: string) {
    return this.http.get<Product[]>(this.apiUrl, {
      params: { restaurantId }
    });
  }

  addItem(payload: AddItemToOrderRequest) {
    return this.http.post<OrderResponse>(
      `${this.apiUrl}/items`,
      payload
    );
  }

  getCurrentOrder(restaurantId: string, sessionId: string) {
    return this.http.get<OrderResponse>(
      `${this.apiUrl}/current`,
      {
        params: {
          restaurantId,
          sessionId
        }
      }
    );
  }

  removeItem(orderItemId: string) {
    return this.http.delete(
      `${this.apiUrl}/items/${orderItemId}`
    );
  }
}
