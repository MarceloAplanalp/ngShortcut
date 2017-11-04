import { BindingInfo } from './binding-info';

export interface ElementBinding {
    element: HTMLElement;
    bindings: Map<string, BindingInfo[]>;
}
