import { Component, OnInit } from '@angular/core';
import { ShortcutService } from './services/shortcut.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    public active = 1; // don't need to define the type since the param is actually initialized as 1.

    constructor(private service: ShortcutService) { }

    public ngOnInit() {
        this.service.bind('1', () => {
            this.active = 1;
        });
        this.service.bind('shift+2', () => {
            this.active = 2;
        });
        this.service.bind('3', () => {
            this.active = 3;
        });
    }
}
