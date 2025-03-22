import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// Import the standalone components
import { LoginComponent } from './components/login/login.component';
import { ChatComponent } from './components/chat/chat.component';

import { AuthInterceptor } from './AuthInterceptor';
import { UserService } from './services/UserService';
import { AuthenticationService } from './services/authentication.service';

@NgModule({
  declarations: [
    AppComponent,
    // Remove standalone components from declarations
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    CommonModule,
    AppRoutingModule,
    // Import the standalone components
    LoginComponent,
    ChatComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    UserService,
    AuthenticationService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}