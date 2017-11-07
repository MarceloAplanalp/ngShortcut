import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ShortcutService } from './services/shortcut.service';
import { WindowService } from './services/window.service';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
      { provide: WindowService, useValue: window },
      ShortcutService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
