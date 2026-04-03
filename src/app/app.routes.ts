import { Routes } from '@angular/router';
import { RestaurantRegister } from './components/restaurant-register/restaurant-register';
import { UserRegister } from './components/register-user/register-user';
import { LoginUser } from './components/login-user/login-user';
import { CreateProductComponent } from './components/create-product/create-product';
import { ListProducts } from './components/list-products/list-products';
import { CreateCategory } from './components/create-category/create-category';
import { EditProductComponent } from './components/edit-product/edit-product';
import { CreateSideDishGroup } from './components/create-side-dish-group/create-side-dish-group';
import { DeliveryHomeComponent } from './components/delivery-home/delivery-home';
import { ProductDetailsComponent } from './components/product-details/product-details';
import { CartComponent } from './components/cart/cart';
import { CheckoutComponent } from './components/checkout/checkout';
import { FinalizeOrderComponent } from './components/finalize-order/finalize-order';
import { AddressComponent } from './components/address/address';
import { OrdersComponent } from './components/list-orders/list-orders';
import { ConfirmationComponent } from './components/confirmation/confirmation';
import { RestaurantOrdersComponent } from './components/restaurant-orders/restaurant-orders';
import { RestaurantLayoutComponent } from './components/restaurant-layout/restaurant-layout';
import { DeliveryZonesComponent } from './components/delivery-zones/delivery-zones';
import { History } from './components/history/history';
import { OpeningHoursComponent } from './components/opening-hours/opening-hours';
import { RestaurantProfilePublicComponent } from './components/restaurant-profile/restaurant-profile';
import { SettingsComponent } from './components/settings/settings';
import { AccountComponent } from './components/account/account';
import { StoreComponent } from './components/store/store';
import { PaymentComponent } from './components/payment/payment';

import { restaurantGuard } from './guards/restaurant.guard';
import { VerifyTwoFactor } from './components/verify-two-factor/verify-two-factor';
import { ConfirmEmail } from './components/confirm-email/confirm-email';

export const routes: Routes = [
  // públicas
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginUser },
  { path: 'register-user', component: UserRegister },
  { path: 'register-restaurant', component: RestaurantRegister },
  { path: 'confirm-email', component: ConfirmEmail},
{ path: 'verify-2fa', component: VerifyTwoFactor },

  // públicas - cliente
  { path: 'delivery-home/:id', component: DeliveryHomeComponent },
  { path: 'product-details/:restaurantId/:id', component: ProductDetailsComponent },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'finalize-order', component: FinalizeOrderComponent },
  { path: 'address', component: AddressComponent },
  { path: 'orders-list', component: OrdersComponent },
  { path: 'orders', component: OrdersComponent },
  { path: 'confirmation', component: ConfirmationComponent },
  { path: 'profile/:restaurantId', component: RestaurantProfilePublicComponent },

  // privadas - restaurante
  { path: 'create-product', component: CreateProductComponent, canActivate: [restaurantGuard] },
  { path: 'list-products', component: ListProducts, canActivate: [restaurantGuard] },
  { path: 'create-category', component: CreateCategory, canActivate: [restaurantGuard] },
  { path: 'edit-product/:id', component: EditProductComponent, canActivate: [restaurantGuard] },
  { path: 'create-side-dish-group', component: CreateSideDishGroup, canActivate: [restaurantGuard] },

  {
    path: 'restaurant/:restaurantId',
    component: RestaurantLayoutComponent,
    canActivate: [restaurantGuard],
    canActivateChild: [restaurantGuard],
    children: [
      { path: 'orders', component: RestaurantOrdersComponent },
      { path: 'list-products', component: ListProducts },
      { path: 'delivery-zones', component: DeliveryZonesComponent },
      { path: 'history', component: History },
      { path: 'opening-hours', component: OpeningHoursComponent },
      {
        path: 'settings',
        component: SettingsComponent,
        children: [
          { path: 'account', component: AccountComponent },
          { path: 'store', component: StoreComponent },
          { path: 'payment', component: PaymentComponent },
          { path: '', redirectTo: 'account', pathMatch: 'full' },
        ]
      },
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
    ],
  },

  // fallback
  { path: '**', redirectTo: 'login' }
];