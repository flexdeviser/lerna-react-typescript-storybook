/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';
import { DomOperator } from '../utils/DomOperator';
import { DygraphInteraction } from './DygraphInteraction';

export default class RangeHandles {
    private g?: Dygraph;

    private isMobileDevice = /mobile|android/gi.test(navigator.appVersion);

    private graphDiv?: HTMLDivElement;

    private singleZoomHandle?: any;

    private rangebarCanvasRect?: { x: number; y: number; w: number; h: number };

    private rangeSize = 0;

    toString = (): string => {
        return 'Fgp Range-bar-Handles Plugin';
    };

    activate = (dygraph: Dygraph): { didDrawChart: Function } => {
        this.g = dygraph;
        this.graphDiv = (this.g as any).graphDiv;
        if (this.g?.getOption('showRangeSelector')) {
            this.createSingleZoomHandle();
            this.initPanInteraction();
        }

        return {
            didDrawChart: this.placeHandle,
        };
    };

    //-------private methods--------//

    private initPanInteraction = (): void => {
        let isPanning = false;
        let clientXLast = 0;
        const topElem = document;
        const dynamic = !this.isMobileDevice;
        let initGap = -1;

        (this.g as any).attrs_['interactionModel'] = DygraphInteraction.dragIsPanInteractionModel;
        (this.g as any).attrs_['panEdgeFraction'] = 0.0001;

        const toXDataWindow = (zoomHandleStatus: { leftHandlePos: number; rightHandlePos: number }): [number, number] => {
            const xDataLimits = this.g?.xAxisExtremes();
            let xDataMin = 0;
            let xDataMax = 0;

            if (xDataLimits && this.rangebarCanvasRect) {
                const fact = (xDataLimits[1] - xDataLimits[0]) / this.rangebarCanvasRect.w;
                xDataMin = xDataLimits[0] + (zoomHandleStatus.leftHandlePos - this.rangebarCanvasRect.x) * fact;
                xDataMax = xDataLimits[0] + (zoomHandleStatus.rightHandlePos - this.rangebarCanvasRect.x) * fact;
            }
            console.log('new positiong: ', [xDataMin, xDataMax]);
            return [xDataMin, xDataMax];
        };

        const onPanEnd = (e: MouseEvent): boolean => {
            if (!isPanning) {
                return false;
            }
            isPanning = false;
            DomOperator.removeEvent(topElem, 'mousemove', onPan);
            DomOperator.removeEvent(topElem, 'mouseup', onPanEnd);
            // If on a slower device, do pan now.
            if (!dynamic) {
                doPan();
            }
            return true;
        };

        const onPanStart = (e: MouseEvent): boolean => {
            if (!isPanning) {
                DomOperator.cancelEvent(e);
                isPanning = true;
                clientXLast = e.clientX;
                if (e.type === 'mousedown') {
                    // These events are removed manually.
                    DomOperator.addEvent(topElem, 'mousemove', onPan);
                    DomOperator.addEvent(topElem, 'mouseup', onPanEnd);
                }
                return true;
            }
            return false;
        };

        const doPan = (): void => {
            //get left and right handles position
            const halfHandleWidth = this.singleZoomHandle.width / 2;
            if (initGap > 0) {
                const leftHandlePos = parseFloat(this.singleZoomHandle.style.left) + halfHandleWidth;

                const dataWindow = toXDataWindow({
                    leftHandlePos: leftHandlePos,
                    rightHandlePos: leftHandlePos + initGap,
                });
                (this.g as any).dateWindow_ = dataWindow;
                (this.g as any).drawGraph_(false);
            }
        };

        const onPan = (e: MouseEvent): boolean => {
            if (!isPanning) {
                return false;
            }

            DomOperator.cancelEvent(e);

            const handles = this.graphDiv?.getElementsByClassName('dygraph-rangesel-zoomhandle');
            const halfHandleWidth = this.singleZoomHandle.width / 2;

            if (handles) {
                const leftHandlePos = parseFloat((handles[0] as HTMLImageElement).style.left) + halfHandleWidth;
                const rightHandlePos = parseFloat((handles[1] as HTMLImageElement).style.left) + halfHandleWidth;
                initGap = rightHandlePos - leftHandlePos;
            }

            const delX = e.clientX - clientXLast;

            if (Math.abs(delX) < 4) {
                return true;
            }

            clientXLast = e.clientX;

            // get handle position

            let handlePos = parseFloat(this.singleZoomHandle.style.left) + halfHandleWidth;

            // move handle
            if (this.rangebarCanvasRect && handlePos + delX <= this.rangebarCanvasRect.x) {
                // move outside left
                handlePos = this.rangebarCanvasRect.x;
            } else if (this.rangebarCanvasRect && handlePos + delX >= this.rangebarCanvasRect.x + this.rangebarCanvasRect.w) {
                // move outside right
                handlePos = this.rangebarCanvasRect.x + this.rangebarCanvasRect.w;
            } else {
                handlePos += delX;
            }

            // update position
            this.singleZoomHandle.style.left = handlePos - halfHandleWidth + 'px';

            if (dynamic) {
                doPan();
            }

            return true;
        };

        (this.g as any).addAndTrackEvent(this.singleZoomHandle, 'mousedown', onPanStart);
    };

    private createSingleZoomHandle = (): void => {
        const img = new Image();
        img.className = 'dygraph-rangesel-zoomhandle-single';
        img.style.position = 'absolute';
        img.style.zIndex = '12';
        img.style.visibility = 'hidden'; // Initially hidden so they don't show up in the wrong place.
        img.style.cursor = 'move';
        img.width = 9;
        img.height = 16;
        img.src =
            'data:image/png;base64,' +
            'iVBORw0KGgoAAAANSUhEUgAAAAkAAAAQCAYAAADESFVDAAAAAXNSR0IArs4c6QAAAAZiS0dEANAA' +
            'zwDP4Z7KegAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB9sHGw0cMqdt1UwAAAAZdEVYdENv' +
            'bW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAaElEQVQoz+3SsRFAQBCF4Z9WJM8KCDVwownl' +
            '6YXsTmCUsyKGkZzcl7zkz3YLkypgAnreFmDEpHkIwVOMfpdi9CEEN2nGpFdwD03yEqDtOgCaun7s' +
            'qSTDH32I1pQA2Pb9sZecAxc5r3IAb21d6878xsAAAAAASUVORK5CYII=';
        // add to bar
        if (this.isMobileDevice) {
            img.width *= 2;
            img.height *= 2;
        }
        this.singleZoomHandle = img;
        this.graphDiv?.appendChild(this.singleZoomHandle);
    };

    /**
     * move handle to correct spot
     */
    private placeHandle = (): void => {
        // when rangebar enabled
        if (this.g?.getOption('showRangeSelector')) {
            const plotArea = (this.g as any).layout_.getPlotArea();
            let xAxisLabelHeight = 0;
            if (this.g?.getOptionForAxis('drawAxis', 'x')) {
                xAxisLabelHeight = this.g?.getOption('xAxisHeight') || this.g?.getOption('axisLabelFontSize') + 2 * this.g?.getOption('axisTickSize');
            }
            if (plotArea) {
                this.rangebarCanvasRect = {
                    x: plotArea.x,
                    y: plotArea.y + plotArea.h + xAxisLabelHeight + 4,
                    w: plotArea.w,
                    h: this.g?.getOption('rangeSelectorHeight'),
                };
            }
            // get handles
            const handles = this.graphDiv?.getElementsByClassName('dygraph-rangesel-zoomhandle');

            if (handles && handles.length > 0 && this.rangebarCanvasRect && this.singleZoomHandle) {
                //
                const leftHandle = handles[0] as HTMLImageElement;
                const rightHandle = handles[1] as HTMLImageElement;
                if (leftHandle.style.left !== '' && rightHandle.style.left !== '') {
                    const leftHandlePos = parseFloat(leftHandle.style.left);
                    const rightHandlePos = parseFloat(rightHandle.style.left);

                    if (rightHandlePos - leftHandlePos < 2) {
                        const halfHandleWidth = this.singleZoomHandle.width / 2;
                        this.rangeSize = parseFloat(rightHandle.style.left) + halfHandleWidth - (parseFloat(leftHandle.style.left) + halfHandleWidth);
                        // put the handle to correct spot.
                        const xExtremes = this.g?.xAxisExtremes();
                        const xWindowLimits = this.g?.xAxisRange();
                        const xRange = xExtremes[1] - xExtremes[0];
                        const leftPercent = Math.max(0, (xWindowLimits[0] - xExtremes[0]) / xRange);
                        const leftCoord = this.rangebarCanvasRect.x + this.rangebarCanvasRect.w * leftPercent;
                        const handleTop = Math.max(this.rangebarCanvasRect.y, this.rangebarCanvasRect.y + (this.rangebarCanvasRect.h - this.singleZoomHandle.height) / 2);

                        this.singleZoomHandle.style.left = leftCoord - halfHandleWidth + 'px';
                        this.singleZoomHandle.style.top = handleTop + 'px';
                        this.singleZoomHandle.style.visibility = 'visible';
                    } else {
                        this.singleZoomHandle.style.visibility = 'hidden';
                    }
                }
            } else if (this.singleZoomHandle) {
                this.singleZoomHandle.style.visibility = 'hidden';
            }
        }
    };
}
