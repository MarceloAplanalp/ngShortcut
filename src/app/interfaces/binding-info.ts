import { keyEvent } from '../types/key-event';

export interface BindingInfo {
    action: keyEvent;
    modifiers: string[];
    callback: () => void;
}
