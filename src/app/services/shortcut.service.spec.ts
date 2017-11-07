import { TestBed, inject } from '@angular/core/testing';

import { ShortcutService } from './shortcut.service';
import { WindowService } from './window.service';

describe('ShortcutService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ShortcutService,
                { provide: WindowService, useValue: window }
            ]
        });
    });

    it('should be created', inject([ShortcutService], (service: ShortcutService) => {
        expect(service).toBeTruthy();
    }));
});
