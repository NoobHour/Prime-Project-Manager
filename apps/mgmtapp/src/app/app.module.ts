import { provideZoneChangeDetection } from '@angular/core';
import { providePrimeNG } from 'primeng/config';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SharedCoreModule } from '@mgmt/shared/core';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    NgbModule,
    SharedCoreModule.forRoot(environment),
  ],
  providers: [provideZoneChangeDetection(), providePrimeNG({ unstyled: true })],
  bootstrap: [AppComponent],
})
export class AppModule {}
