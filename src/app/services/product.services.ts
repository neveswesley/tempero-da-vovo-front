import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { Category } from './category.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = '/api/Products';
  private categoryApiUrl = '/api/Categories';

  constructor(private http: HttpClient) {}

  // Criar produto
  createProduct(productData: any, file?: File): Observable<Product> {
    const formData = new FormData();
    formData.append('restaurantId', productData.restaurantId);
    formData.append('name', productData.name);
    formData.append('description', productData.description);

    const priceValue =
      typeof productData.price === 'number'
        ? productData.price.toFixed(2).replace('.', ',')
        : parseFloat(productData.price).toFixed(2).replace('.', ',');

    formData.append('price', priceValue);
    formData.append('categoryId', productData.categoryId);

    if (file) {
      formData.append('file', file);
    }

    console.log('💰 Price enviado:', priceValue);
    return this.http.post<Product>(this.apiUrl, formData);
  }

  // Listar produtos de um restaurante
  getAllProducts(restaurantId: string): Observable<Product[]> {
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.get<Product[]>(this.apiUrl, { params });
  }

  // Buscar categorias com produtos
  getCategories(restaurantId: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.categoryApiUrl}/with-products/${restaurantId}`);
  }

  // Deletar produto
  deleteProduct(productId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${productId}`);
  }

  // Ativar/desativar produto
  toggleActiveProduct(productId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${productId}/active`, { isActive });
  }

  // Buscar produto por ID
  getById(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${productId}`);
  }

  // Atualizar produto
  update(productId: string, payload: any) {
    return this.http.put(`${this.apiUrl}/${productId}`, payload);
  }

  // Atualizar imagem (SÓ imagem) - CORRIGIDO: o backend espera "Image", não "file"
  updateImage(productId: string, file: File) {
    const formData = new FormData();
    formData.append('Image', file);

    return this.http.put(`${this.apiUrl}/${productId}/image`, formData);
  }

  // NOVO: Remover imagem do produto
  removeImage(productId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${productId}/image`);
  }

  // Helper para construir URL completa da imagem - CORRIGIDO
  getFullImageUrl(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) return null;
    
    // Se já é uma URL completa, retorna como está
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Remove barra inicial se existir
    const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;

    // Constrói a URL completa com o domínio da API
    const apiBaseUrl = this.getApiBaseUrl();
    return `${apiBaseUrl}/${cleanPath}`; // ← CORRIGIDO: sempre uma barra
  }

  private getApiBaseUrl(): string {
    // Pega a base URL do navegador
    const origin = window.location.origin;
    
    // Se estiver em desenvolvimento local, usa a porta da API
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://localhost:44356';
    }
    
    // Em produção, retorna a origem atual
    return origin;
  }
}