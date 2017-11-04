import { keyEvent } from '../types/key-event';

export interface KeyInfo {
    key: string;
    action: keyEvent;
    modifiers: string[];
}
