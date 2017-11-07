import { Injectable, Inject, NgZone } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { WindowService } from './window.service';
import * as _ from 'lodash';

import { keyEvent } from '../types/key-event';
import { KeyInfo } from '../interfaces/key-info';
import { KEYUP, KEYPRESS, KEYDOWN, SHIFT } from '../constants';
import { BindingInfo } from '../interfaces/binding-info';

@Injectable()
export class ShortcutService {
    // mapping of special keycodes to their corresponding keys. Everything in this dictionary cannot use keypress events
    // so it has to be here to map to the correct keycodes for keyup/keydown events
    private specialKeysMap: Map<string, string> = new Map<string, string>([
        ['Backspace', 'backspace'],
        ['Tab', 'tab'],
        ['Enter', 'enter'],
        ['Shift', 'shift'],
        ['Control', 'ctrl'],
        ['Alt', 'alt'],
        ['CapsLock', 'capslock'],
        ['Escape', 'esc'],
        [' ', 'space'],
        ['PageUp', 'pageup'],
        ['PageDown', 'pagedown'],
        ['End', 'end'],
        ['Home', 'home'],
        ['ArrowLeft', 'left'],
        ['ArrowUp', 'up'],
        ['ArrowRight', 'right'],
        ['ArrowDown', 'down'],
        ['Left', 'left'],
        ['Up', 'up'],
        ['Right', 'right'],
        ['Down', 'down'],
        ['Insert', 'ins'],
        ['Delete', 'del'],
        ['Meta', 'meta'],
        ['OS', 'meta'],
    ]);

    // mapping for special characters so they can support.
    // this dictionary is only used incase you want to bind a keyup or keydown event to one of these keys
    private keycodeMap: Map<string, string> = new Map<string, string>([
        ['Multiply', '*'],
        ['*', '*'],
        ['Add', '+'],
        ['+', '+'],
        ['Subtract', '-'],
        ['-', '-'],
        ['Decimal', '.'],
        ['.', '.'],
        ['Divide', '/'],
        ['/', '/']
    ]);

    // this is a mapping of keys that require shift on a US keypad back to the non-shift equivalents.
    // this is so you can use keyup events with these keys
    // WARNING: this will only work reliably on US keyboards
    private shiftMap: Map<string, string> = new Map<string, string>([
        ['~', '`'],
        ['!', '1'],
        ['@', '2'],
        ['#', '3'],
        ['$', '4'],
        ['%', '5'],
        ['^', '6'],
        ['&', '7'],
        ['*', '8'],
        ['(', '9'],
        [')', '0'],
        ['_', '-'],
        ['+', '='],
        [':', ';'],
        ['\"', '\''],
        ['<', ','],
        ['>', '.'],
        ['?', '/'],
        ['|', '\\']
    ]);

    // since we aren't working with KeyCodes anymore, we need to transform the keys when shift is part of the string
    private unshiftMap: Map<string, string> = new Map();

    private aliasesMap: Map<string, string>;
    private reverseMapping: Map<string, string> = new Map();

    // map to store all global callbacks
    private callbacks: Map<string, BindingInfo[]> = new Map();

    private static keysFromString(str: string): string[] {
        if (str === '+') {
            return ['+'];
        } else {
            // in case that str was something like meta++
            str = str.replace(/\+{2}/g, '+plus');
            return str.split('+');
        }
    }

    private static isModifier(key: string): boolean {
        return key === SHIFT || key === 'ctrl' || key === 'alt' || key === 'meta';
    }

    private static modifiersMatch(m1: string[], m2: string[]): boolean {
        return m1.sort().join(',') === m2.sort().join(',');
    }

    private static getEventModifiers(e: KeyboardEvent) {
        const modifiers = [];
        if (e.shiftKey) {
            modifiers.push(SHIFT);
        }
        if (e.altKey) {
            modifiers.push('alt');
        }
        if (e.ctrlKey) {
            modifiers.push('ctrl');
        }
        if (e.metaKey) {
            modifiers.push('meta');
        }

        return modifiers;
    }

    constructor(@Inject(WindowService) window: Window,
                @Inject(DOCUMENT) _document: HTMLDocument,
                private ngZone: NgZone) {
        this.aliasesMap = new Map<string, string>([
            ['option', 'alt'],
            ['command', 'meta'],
            ['return', 'enter'],
            ['escape', 'esc'],
            ['plus', '+'],
            ['os', 'meta'],
            ['mod', /Mac|iPod|iPhone|iPad/.test(window.navigator.platform) ? 'meta' : 'ctrl']
        ]);

        // loop through the f keys, f1 to f20 and add them to the specialKeys map
        for (let i = 1; i <= 20; i++) {
            this.specialKeysMap.set(`F${i}`, `f${i}`);
        }

        // This needs to use a string cause otherwise since 0 is falsy it will never fire for numpad 0 pressed as part
        // of a keydown event.
        for (let i = 0; i < 10; i++) {
            this.specialKeysMap.set(i.toString(), i.toString());
        }

        this.specialKeysMap.forEach((value, key) => {
            // pull out the numeric keypad from here because keypress should be able to detect the keys from
            // the character
            if (isNaN(parseInt(value, 10))) {
                this.reverseMapping.set(value, key);
            }
        });

        this.shiftMap.forEach((value, key) => {
            this.unshiftMap.set(value, key);
        });

        // needs to be called outside angular since it's a vanilla method and it doesn't respect the angular lifecycle
        ngZone.runOutsideAngular(() => {
            _document.addEventListener(KEYUP, (event) => this.handleKeyEvent(event as KeyboardEvent));
            _document.addEventListener(KEYPRESS, (event) => this.handleKeyEvent(event as KeyboardEvent));
            _document.addEventListener(KEYDOWN, (event) => this.handleKeyEvent(event as KeyboardEvent));
        });
    }

    // binds a keyboard event,
    // can be a single key or a combination of keys separated with '+'
    public bind(combination: string, callback: () => void, action?: keyEvent): void {

        // remove the spaces to sanitize the combination
        combination = combination.replace(/\s+/g, '');
        const info = this.getKeyInfo(combination, action);

        // make sure to initialize the array if it's the first time.
        // a callback'll be added for this key
        if (!this.callbacks.has(info.key)) {
            this.callbacks.set(info.key, []);
        }

        this.callbacks.get(info.key).push({
            callback,
            modifiers: info.modifiers,
            action: info.action
        });
    }

    public unbind(combination: string, action?: keyEvent) {
        // remove the spaces to sanitize the combination
        combination = combination.replace(/\s+/g, '');
        const info = this.getKeyInfo(combination, action);

        const callbacksArray = this.callbacks.get(info.key);
        if (callbacksArray && callbacksArray.length) {
            const index = callbacksArray.findIndex((entry: any) =>
                ShortcutService.modifiersMatch(entry.modifiers, info.modifiers));
            if (index > -1) {
                callbacksArray.splice(index, 1);
            }
        }
    }

    private getKeyInfo(combination: string, action?: keyEvent): KeyInfo {

        const keys = ShortcutService.keysFromString(combination);

        // needs to figure out if shift is on the sequence
        const isShiftInSequence = keys.includes(SHIFT);

        // the last key is that actually triggers the event
        let lastKey: string;
        let modifiers: string[] = [];

        keys.forEach((key) => {
            lastKey = key;

            // normalize the key name
            if (this.aliasesMap.has(lastKey)) {
                lastKey = this.aliasesMap.get(lastKey);
            }

            if (this.shiftMap.has(lastKey)) {
                // note: since $event::key actually contains the real printable character, we don't need to use the
                // non-shift key anymore but we still need to put the shift key into the modifiers.
                modifiers = _.union(modifiers, [SHIFT]);
            }

            // if the key is a modifier, then add it to the array
            if (ShortcutService.isModifier(lastKey)) {
                modifiers = _.union(modifiers, [lastKey]);
            }
        });

        // ie.: 'shift+2' binded, real key value will be an at with shift key pressed so, we need to change that
        // 2 to an "@"
        if (isShiftInSequence && this.unshiftMap.has(lastKey)) {
            lastKey = this.unshiftMap.get(lastKey);
        }

        return {
            key: lastKey,
            modifiers,
            action: this.pickBestAction(lastKey, modifiers, action)
        };
    }

    private pickBestAction(key: string, modifiers: string[], action?: keyEvent): keyEvent {
        // if no action was provided, then we should try to pick the one that we think would work best for this key
        if (!action) {
            action = this.reverseMapping.has(key) ? KEYDOWN : KEYPRESS;
        }

        // modifiers keys don't work as expected with keypress, switch to keydown
        if (action === KEYPRESS && modifiers.length) {
            action = KEYDOWN;
        }

        return action;
    }

    private handleKeyEvent($event: KeyboardEvent) {
        const character = this.characterFromEvent($event);
        const action: keyEvent = $event.type as keyEvent;
        let modifiers;

        if (character) {
            modifiers = ShortcutService.getEventModifiers($event);
            this.findAndExecuteCallback(character, modifiers, action);
        }
    }

    private characterFromEvent($event: KeyboardEvent): string {
        if ($event.type !== KEYPRESS) {
            // for non-keypress events, our maps are needed
            if (this.specialKeysMap.has($event.key)) {
                return this.specialKeysMap.get($event.key);
            }

            if (this.keycodeMap.has($event.key)) {
                return this.keycodeMap.get($event.key);
            }
        }

        return $event.key.toLowerCase();
    }

    private findAndExecuteCallback(character: string, modifiers: string[], action: keyEvent) {
        if (this.callbacks.has(character)) {
            const entry: any = this.callbacks.get(character).find((c: any) => {
                return action === c.action && ShortcutService.modifiersMatch(modifiers, c.modifiers);
            });
            if (entry) {
                // call entry.callback and get it in sync with angular
                this.ngZone.run(entry.callback);
            }
        }
    }
}
