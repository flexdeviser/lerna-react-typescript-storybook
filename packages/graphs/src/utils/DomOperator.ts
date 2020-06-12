/* eslint-disable @typescript-eslint/no-explicit-any */
import { DomAttrs } from '../graph/Types';

/**
 * dom operator
 */
export class DomOperator {
    /**
     * create dom element with attributes
     */
    static createElement = (type: string, attrs: Array<DomAttrs>): HTMLElement => {
        const dom: HTMLElement = document.createElement(type);
        // put attributes on element
        attrs.forEach((attr) => {
            // check the attribute, if exist then throw exception
            if (!dom.getAttribute(attr.key)) {
                dom.setAttribute(attr.key, attr.value);
            } else {
                throw new Error('Duplicate Attrs ' + attr.key);
            }
        });
        return dom;
    };
    static addEvent = (element: Document, type: any, fn: any): void => {
        element.addEventListener(type, fn, false);
    };

    static removeEvent = (elem: Document, type: any, fn: any): void => {
        elem.removeEventListener(type, fn, false);
    };
    static cancelEvent = (e: any): boolean => {
        e = e ? e : window.event;
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.cancelBubble = true;
        e.cancel = true;
        e.returnValue = false;
        return false;
    };
    static pageX = (e: MouseEvent): number => {
        return !e.pageX || e.pageX < 0 ? 0 : e.pageX;
    };

    static pageY = (e: MouseEvent): number => {
        return !e.pageY || e.pageY < 0 ? 0 : e.pageX;
    };

    static dragGetX = (e: MouseEvent, context: any): number => {
        return DomOperator.pageX(e) - context.px;
    };

    static dragGetY = (e: MouseEvent, context: any): number => {
        return DomOperator.pageY(e) - context.px;
    };

    static log10 = (x: number): number => {
        return Math.log(x);
    };

    static LOG_SCALE = 10;

    static LN_TEN = Math.log(DomOperator.LOG_SCALE);
}

export class CanvasUtils {
    static getContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
        return canvas.getContext('2d');
    };

    static createCanvas = (): HTMLCanvasElement => {
        return document.createElement('canvas');
    };

    static findPos = (obj: HTMLElement): { x: number; y: number } => {
        const p = obj.getBoundingClientRect(),
            w = window,
            d = document.documentElement;

        return {
            x: p.left + (w.pageXOffset || d.scrollLeft),
            y: p.top + (w.pageYOffset || d.scrollTop),
        };
    };

    static getContextPixelRatio(context: any): number {
        try {
            const devicePixelRatio = window.devicePixelRatio;
            const backingStoreRatio =
                context.webkitBackingStorePixelRatio ||
                context.mozBackingStorePixelRatio ||
                context.msBackingStorePixelRatio ||
                context.oBackingStorePixelRatio ||
                context.backingStorePixelRatio ||
                1;
            if (devicePixelRatio !== undefined) {
                return devicePixelRatio / backingStoreRatio;
            } else {
                // At least devicePixelRatio must be defined for this ratio to make sense.
                // We default backingStoreRatio to 1: this does not exist on some browsers
                // (i.e. desktop Chrome).
                return 1;
            }
        } catch (e) {
            return 1;
        }
    }
}
