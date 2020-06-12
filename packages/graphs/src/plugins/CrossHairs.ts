/* eslint-disable @typescript-eslint/no-explicit-any */
export default class CrossHairs {
  //
  private direction = 'v';
  private graph?: any;
  private canvas_: HTMLCanvasElement | null;
  constructor(opts: { direction?: string }) {
    //
    if (opts.direction) {
      this.direction = opts.direction;
    }
    this.canvas_ = document.createElement('canvas');
  }

  //
  activate = (graph: Dygraph): { select: () => void; deselect: () => void } => {
    // update graph
    this.graph = graph;
    this.graph.graphDiv.appendChild(this.canvas_);
    return {
      select: this.select,
      deselect: this.deselect,
    };
  };

  select = (): void => {
    // never get null direction, default V
    if (this.direction === null) {
      return;
    }

    const width = this.graph?.width_;
    const height = this.graph?.height_;
    if (this.canvas_) {
      this.canvas_.width = width;
      this.canvas_.height = height;
      this.canvas_.style.width = width + 'px'; // for IE
      this.canvas_.style.height = height + 'px'; // for IE
      const ctx = this.canvas_?.getContext('2d');
      if (ctx && this.graph && this.graph.selPoints_ && this.graph.selPoints_.length > 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(0, 0, 0,0.3)';
        ctx.beginPath();
        const canvasx = Math.floor(this.graph.selPoints_[0].canvasx) + 0.5; // crisper rendering

        if (this.direction === 'v' || this.direction === 'both') {
          ctx.moveTo(canvasx, 0);
          ctx.lineTo(canvasx, height);
        }

        if (this.direction === 'h' || this.direction === 'both') {
          for (let i = 0; i < this.graph.selPoints_.length; i++) {
            const canvasy = Math.floor(this.graph.selPoints_[i].canvasy) + 0.5; // crisper rendering
            ctx.moveTo(0, canvasy);
            ctx.lineTo(width, canvasy);
          }
        }

        ctx.stroke();
        ctx.closePath();
      }
    }
  };

  deselect = (): void => {
    //
    if (this.canvas_) {
      const ctx = this.canvas_.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
      }
    }
  };

  destroy = (): void => {
    this.canvas_ = null;
  };
}
