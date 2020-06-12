/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';

export default class RectSelection {
  private g?: Dygraph;

  private readonly canvas: HTMLCanvasElement;

  private drawable = false;

  private mousePosition: { x: number; y: number; startX: number; startY: number };

  /**
   * rect selection plugin
   * @param onSelect  callback func
   */
  constructor(public onSelect?: (series: Array<string>) => void) {
    this.canvas = document.createElement('canvas');
    // init mouse position var
    this.mousePosition = {
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
    };
  }

  activate = (graph: Dygraph): void => {
    const dygraph: any = (this.g = graph);

    this.canvas.width = dygraph.graphDiv?.clientWidth;
    this.canvas.height = dygraph.graphDiv?.clientHeight;
    this.canvas.setAttribute('style', `position:absolute;`);
    this.canvas.style.display = 'none';
    // add canvas to graphDiv
    dygraph.graphDiv?.appendChild(this.canvas);
    console.log(`${this.canvas.width} ${this.canvas.height}`);

    // init mouse event listener
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      this.interactions(this.canvas, dygraph, ctx);
    }
  };

  private interactions = (canvas: HTMLCanvasElement, g: any, ctx: CanvasRenderingContext2D): void => {
    // mousedown
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.drawable = true;
      // set draw position
      this.mousePosition = {
        x: e.offsetX,
        y: e.offsetY,
        startX: e.offsetX,
        startY: e.offsetY,
      };
      //
      canvas.style.cursor = 'crosshair';
      // clean draw area
      ctx?.clearRect(0, 0, g.width_, g.height_);
    });

    // mousemove
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.drawable) {
        this.mousePosition.x = e.offsetX;
        this.mousePosition.y = e.offsetY;

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 10]);
        ctx.clearRect(0, 0, g.width_, g.height_);
        // draw rect
        ctx.strokeRect(
          this.mousePosition.startX,
          this.mousePosition.startY,
          this.mousePosition.x - this.mousePosition.startX,
          this.mousePosition.y - this.mousePosition.startY,
        );
      }
    });

    // mouseup
    canvas.addEventListener('mouseup', (e: MouseEvent) => {
      this.drawable = false;
      this.canvas.style.cursor = 'default';

      const rect = this.mousePosition;
      // reset start end
      const startX = rect.startX <= rect.x ? rect.startX : rect.x;
      const endX = rect.startX > rect.x ? rect.startX : rect.x;

      const startY = rect.startY <= rect.y ? rect.startY : rect.y;
      const endY = rect.startY > rect.y ? rect.startY : rect.y;

      const minDate = g.toDataXCoord(startX);
      const maxDate = g.toDataXCoord(endX);

      const maxY = g.toDataYCoord(startY);
      const minY = g.toDataYCoord(endY);

      const graphData = g.file_;
      const labels = g.getLabels();
      const visibility = g.getOption('visibility');

      const chosenSeries: Array<string> = [];
      // get points
      graphData.forEach((_d: any) => {
        // check date range
        if (_d[0] instanceof Date && _d[0] >= minDate && _d[0] <= maxDate) {
          for (let i = 1; i < _d.length; i++) {
            if (_d[i] >= minY && _d[i] <= maxY && chosenSeries.indexOf(labels[i]) == -1) {
              if (visibility[i - 1]) {
                chosenSeries.push(labels[i]);
              }
            }
          }
        }
      });

      // call callback
      if (this.onSelect && chosenSeries.length > 0) {
        this.onSelect(chosenSeries);
      }
    });
  };

  /**
   * dynamic set callback func
   * @param onSelect
   */
  public setCallback = (onSelect?: (series: Array<string>) => void): void => {
    if (onSelect) {
      this.onSelect = onSelect;
    }
  };

  enable = (): void => {
    this.canvas.style.display = '';
  };

  disable = (): void => {
    const ctx = this.canvas.getContext('2d');
    ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.style.display = 'none';
  };

  clear = (): void => {
    const ctx = this.canvas.getContext('2d');
    ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  destroy = (): void => {
    this.canvas.remove();
  };
}
