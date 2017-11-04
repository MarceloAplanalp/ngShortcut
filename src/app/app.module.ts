import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ShortcutService } from './services/shortcut.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
      ShortcutService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
