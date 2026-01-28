import { Routes } from '@angular/router';
import { RestaurantRegister } from './components/restaurant-register/restaurant-register';
import { UserRegister } from './components/register-user/register-user';
import { LoginUser } from './components/login-user/login-user';
import { CreateProductComponent } from './components/create-product/create-product';
import { ListProducts } from './components/list-products/list-products';
import { CreateCategory } from './components/create-category/create-category';
import { EditProductComponent } from './components/edit-product/edit-product';

export const routes: Routes = [
  {
    path: '',
    component: LoginUser,
    pathMatch: 'full',
  },
  {
    path: 'register-user',
    component: UserRegister,
  },
  {
    path: 'register-restaurant',
    component: RestaurantRegister,
  },
  {
    path: 'create-product',
    component: CreateProductComponent,
  },
  {
    path: 'list-products',
    component: ListProducts,
  },
  {
    path: 'create-category',
    component: CreateCategory,
  },
  {
    path: 'edit-product/:id',
    component: EditProductComponent,
  },
  
];
