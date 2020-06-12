import { DomOperator } from '../utils/DomOperator';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class DygraphInteraction {
  static maybeTreatMouseOpAsClick = (event: any, g: any, context: any): void => {
    context.dragEndX = DomOperator.dragGetX(event, context);
    context.dragEndY = DomOperator.dragGetY(event, context);
    const regionWidth = Math.abs(context.dragEndX - context.dragStartX);
    const regionHeight = Math.abs(context.dragEndY - context.dragStartY);

    if (regionWidth < 2 && regionHeight < 2 && g.lastx_ !== undefined && g.lastx_ !== -1) {
      DygraphInteraction.treatMouseOpAsClick(g, event, context);
    }

    context.regionWidth = regionWidth;
    context.regionHeight = regionHeight;
  };

  private nonInteractiveModel_ = {
    mousedown: (event: any, g: any, context: any): void => {
      context.initializeMouseDown(event, g, context);
    },

    mouseup: DygraphInteraction.maybeTreatMouseOpAsClick,
  };

  static treatMouseOpAsClick = (g: any, event: any, context: any): void => {
    const clickCallback = g.getFunctionOption('clickCallback');
    const pointClickCallback = g.getFunctionOption('pointClickCallback');

    let selectedPoint = null;

    // Find out if the click occurs on a point.
    let closestIdx = -1;
    let closestDistance = Number.MAX_VALUE;

    // check if the click was on a particular point.
    for (let i = 0; i < g.selPoints_.length; i++) {
      const p = g.selPoints_[i];
      const distance = Math.pow(p.canvasx - context.dragEndX, 2) + Math.pow(p.canvasy - context.dragEndY, 2);
      if (!isNaN(distance) && (closestIdx == -1 || distance < closestDistance)) {
        closestDistance = distance;
        closestIdx = i;
      }
    }

    // Allow any click within two pixels of the dot.
    const radius = g.getNumericOption('highlightCircleSize') + 2;
    if (closestDistance <= radius * radius) {
      selectedPoint = g.selPoints_[closestIdx];
    }

    if (selectedPoint) {
      const e = {
        cancelable: true,
        point: selectedPoint,
        canvasx: context.dragEndX,
        canvasy: context.dragEndY,
      };
      const defaultPrevented = g.cascadeEvents_('pointClick', e);
      if (defaultPrevented) {
        // Note: this also prevents click / clickCallback from firing.
        return;
      }
      if (pointClickCallback) {
        pointClickCallback.call(g, event, selectedPoint);
      }
    }

    const e = {
      cancelable: true,
      xval: g.lastx_, // closest point by x value
      pts: g.selPoints_,
      canvasx: context.dragEndX,
      canvasy: context.dragEndY,
    };
    if (!g.cascadeEvents_('click', e)) {
      if (clickCallback) {
        clickCallback.call(g, event, g.lastx_, g.selPoints_);
      }
    }
  };

  static startPan = (event: any, g: any, context: any): void => {
    let i, axis;
    context.isPanning = true;
    const xRange = g.xAxisRange();

    if (g.getOptionForAxis('logscale', 'x')) {
      context.initialLeftmostDate = DomOperator.log10(xRange[0]);
      context.dateRange = DomOperator.log10(xRange[1]) - DomOperator.log10(xRange[0]);
    } else {
      context.initialLeftmostDate = xRange[0];
      context.dateRange = xRange[1] - xRange[0];
    }

    context.xUnitsPerPixel = context.dateRange / (g.plotter_.area.w - 1);

    if (g.getNumericOption('panEdgeFraction')) {
      const maxXPixelsToDraw = g.width_ * g.getNumericOption('panEdgeFraction');
      const xExtremes = g.xAxisExtremes(); // I REALLY WANT TO CALL THIS xTremes!

      const boundedLeftX = g.toDomXCoord(xExtremes[0]) - maxXPixelsToDraw;
      const boundedRightX = g.toDomXCoord(xExtremes[1]) + maxXPixelsToDraw;

      const boundedLeftDate = g.toDataXCoord(boundedLeftX);
      const boundedRightDate = g.toDataXCoord(boundedRightX);
      context.boundedDates = [boundedLeftDate, boundedRightDate];

      const boundedValues = [];
      const maxYPixelsToDraw = g.height_ * g.getNumericOption('panEdgeFraction');

      for (i = 0; i < g.axes_.length; i++) {
        axis = g.axes_[i];
        const yExtremes = axis.extremeRange;

        const boundedTopY = g.toDomYCoord(yExtremes[0], i) + maxYPixelsToDraw;
        const boundedBottomY = g.toDomYCoord(yExtremes[1], i) - maxYPixelsToDraw;

        const boundedTopValue = g.toDataYCoord(boundedTopY, i);
        const boundedBottomValue = g.toDataYCoord(boundedBottomY, i);

        boundedValues[i] = [boundedTopValue, boundedBottomValue];
      }
      context.boundedValues = boundedValues;
    }

    // Record the range of each y-axis at the start of the drag.
    // If any axis has a valueRange, then we want a 2D pan.
    // We can't store data directly in g.axes_, because it does not belong to us
    // and could change out from under us during a pan (say if there's a data
    // update).
    context.is2DPan = false;
    context.axes = [];
    for (i = 0; i < g.axes_.length; i++) {
      axis = g.axes_[i];
      const axisData: any = {};
      const yRange = g.yAxisRange(i);
      // TODO(konigsberg): These values should be in |context|.
      // In log scale, initialTopValue, dragValueRange and unitsPerPixel are log scale.
      const logscale = g.attributes_.getForAxis('logscale', i);
      if (logscale) {
        axisData.initialTopValue = DomOperator.log10(yRange[1]);
        axisData.dragValueRange = DomOperator.log10(yRange[1]) - DomOperator.log10(yRange[0]);
      } else {
        axisData.initialTopValue = yRange[1];
        axisData.dragValueRange = yRange[1] - yRange[0];
      }
      axisData.unitsPerPixel = axisData.dragValueRange / (g.plotter_.area.h - 1);
      context.axes.push(axisData);

      // While calculating axes, set 2dpan.
      if (axis.valueRange) context.is2DPan = true;
    }
  };

  static movePan = (event: any, g: any, context: any): void => {
    context.dragEndX = DomOperator.dragGetX(event, context);
    context.dragEndY = DomOperator.dragGetY(event, context);

    let minDate = context.initialLeftmostDate - (context.dragEndX - context.dragStartX) * context.xUnitsPerPixel;
    if (context.boundedDates) {
      minDate = Math.max(minDate, context.boundedDates[0]);
    }
    let maxDate = minDate + context.dateRange;
    if (context.boundedDates) {
      if (maxDate > context.boundedDates[1]) {
        // Adjust minDate, and recompute maxDate.
        minDate = minDate - (maxDate - context.boundedDates[1]);
        maxDate = minDate + context.dateRange;
      }
    }

    if (g.getOptionForAxis('logscale', 'x')) {
      g.dateWindow_ = [Math.pow(DomOperator.LOG_SCALE, minDate), Math.pow(DomOperator.LOG_SCALE, maxDate)];
    } else {
      g.dateWindow_ = [minDate, maxDate];
    }

    // y-axis scaling is automatic unless this is a full 2D pan.
    if (context.is2DPan) {
      const pixelsDragged = context.dragEndY - context.dragStartY;

      // Adjust each axis appropriately.
      for (let i = 0; i < g.axes_.length; i++) {
        const axis = g.axes_[i];
        const axisData = context.axes[i];
        const unitsDragged = pixelsDragged * axisData.unitsPerPixel;

        const boundedValue = context.boundedValues ? context.boundedValues[i] : null;

        // In log scale, maxValue and minValue are the logs of those values.
        let maxValue = axisData.initialTopValue + unitsDragged;
        if (boundedValue) {
          maxValue = Math.min(maxValue, boundedValue[1]);
        }
        let minValue = maxValue - axisData.dragValueRange;
        if (boundedValue) {
          if (minValue < boundedValue[0]) {
            // Adjust maxValue, and recompute minValue.
            maxValue = maxValue - (minValue - boundedValue[0]);
            minValue = maxValue - axisData.dragValueRange;
          }
        }
        if (g.attributes_.getForAxis('logscale', i)) {
          axis.valueRange = [Math.pow(DomOperator.LOG_SCALE, minValue), Math.pow(DomOperator.LOG_SCALE, maxValue)];
        } else {
          axis.valueRange = [minValue, maxValue];
        }
      }
    }

    g.drawGraph_(false);
  };

  static endPan = DygraphInteraction.maybeTreatMouseOpAsClick;

  static dragIsPanInteractionModel = {
    mousedown: (event: any, g: any, context: any): void => {
      context.initializeMouseDown(event, g, context);
      DygraphInteraction.startPan(event, g, context);
    },
    mousemove: (event: any, g: any, context: any): void => {
      if (context.isPanning) {
        DygraphInteraction.movePan(event, g, context);
      }
    },
    mouseup: (event: any, g: any, context: any): void => {
      if (context.isPanning) {
        DygraphInteraction.endPan(event, g, context);
      }
    },
  };
}
