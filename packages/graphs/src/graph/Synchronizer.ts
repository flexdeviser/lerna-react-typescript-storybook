/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable no-loop-func */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';

export class Synchronizer {
  args: Array<any>;
  graphs: Array<Dygraph>;

  constructor(graphs: any[]) {
    this.graphs = graphs;
    this.args = graphs.concat([
      {
        zoom: true,
        selection: false,
      },
    ]);
  }

  synchronize = (): { detach: () => void; graphs: Array<Dygraph[]> } => {
    if (this.args.length === 0) {
      throw new Error('Invalid invocation of Dygraph.synchronize(). Need >= 1 argument.');
    }

    const OPTIONS = ['selection', 'zoom', 'range'];
    let opts: any = {
      selection: true,
      zoom: true,
      range: false,
    };
    let dygraphs: any[] = [];
    let prevCallbacks: any[] = [];

    const parseOpts = (obj: any): void => {
      if (!(obj instanceof Object)) {
        throw new Error('Last argument must be either Dygraph or Object.');
      } else {
        for (let i = 0; i < OPTIONS.length; i++) {
          const optName = OPTIONS[i];
          if (obj.hasOwnProperty(optName)) opts[optName] = obj[optName];
        }
      }
    };

    const arraysAreEqual = (a: any, b: any): boolean => {
      if (!Array.isArray(a) || !Array.isArray(b)) return false;
      let i = a.length;
      if (i !== b.length) return false;
      while (i--) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    };

    const attachZoomHandlers = (gs: Dygraph[], syncOpts: any, prevCallbacks: any): void => {
      let block = false;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        g.updateOptions(
          {
            drawCallback: function (me: Dygraph, initial: boolean): void {
              if (block || initial) return;
              block = true;
              const opts: { dateWindow: any; valueRange?: any } = {
                dateWindow: me.xAxisRange(),
              };
              if (syncOpts.range) {
                opts.valueRange = me.yAxisRange();
              }

              for (let j = 0; j < gs.length; j++) {
                if (gs[j] === me) {
                  if (prevCallbacks[j] && prevCallbacks[j].drawCallback) {
                    prevCallbacks[j].drawCallback.apply(this, arguments);
                  }
                  continue;
                }

                // Only redraw if there are new options  (in this case only dateWindow changed!)
                //&& arraysAreEqual(opts.valueRange, gs[j].getOption('valueRange'))
                if (arraysAreEqual(opts.dateWindow, gs[j].getOption('dateWindow'))) {
                  continue;
                }
                gs[j].updateOptions(opts);
              }
              block = false;
            },
          },
          true /* no need to redraw */,
        );
      }
    };

    const attachSelectionHandlers = (gs: any[], prevCallbacks: any): void => {
      let block = false;
      for (let i = 0; i < gs.length; i++) {
        const g = gs[i];
        g.updateOptions(
          {
            highlightCallback: function (event: Event, x: any, points: any[], row: any, seriesName: any): void {
              if (block) return;
              block = true;
              const me: any = this;
              for (let i = 0; i < gs.length; i++) {
                if (me === gs[i]) {
                  if (prevCallbacks[i] && prevCallbacks[i].highlightCallback) {
                    prevCallbacks[i].highlightCallback.apply(this, arguments);
                  }
                  continue;
                }
                const idx = gs[i].getRowForX(x);
                if (idx !== null) {
                  gs[i].setSelection(idx, seriesName);
                }
              }
              block = false;
            },
            unhighlightCallback: function (e: Event) {
              if (block) return;
              block = true;
              const me = this;
              for (let i = 0; i < gs.length; i++) {
                if (me === gs[i]) {
                  if (prevCallbacks[i] && prevCallbacks[i].unhighlightCallback) {
                    prevCallbacks[i].unhighlightCallback.apply(this, arguments);
                  }
                  continue;
                }
                gs[i].clearSelection();
              }
              block = false;
            },
          },
          true /* no need to redraw */,
        );
      }
    };

    if (this.args[0] instanceof Dygraph) {
      // Arguments are Dygraph objects.
      let i;
      for (i = 0; i < this.args.length; i++) {
        if (this.args[i] instanceof Dygraph) {
          dygraphs.push(this.args[i]);
        } else {
          break;
        }
      }
      if (i < this.args.length - 1) {
        throw new Error(
          'Invalid invocation of Dygraph.synchronize(). All but the last argument must be Dygraph objects.',
        );
      } else if (i === this.args.length - 1) {
        parseOpts(this.args[this.args.length - 1]);
      }
    } else if (this.args[0].length) {
      // Invoked w/ list of dygraphs, options
      for (let i = 0; i < this.args[0].length; i++) {
        dygraphs.push(this.args[0][i]);
      }
      if (this.args.length === 2) {
        parseOpts(this.args[1]);
      } else if (this.args.length > 2) {
        throw new Error(
          'Invalid invocation of Dygraph.synchronize(). Expected two arguments: array and optional options argument.',
        );
      } // otherwise arguments.length == 1, which is fine.
    } else {
      throw new Error(
        'Invalid invocation of Dygraph.synchronize(). First parameter must be either Dygraph or list of Dygraphs.',
      );
    }

    if (dygraphs.length < 2) {
      throw new Error('Invalid invocation of Dygraph.synchronize(). Need two or more dygraphs to synchronize.');
    }

    let readycount = dygraphs.length;
    for (let i = 0; i < dygraphs.length; i++) {
      const g = dygraphs[i];
      g.ready(() => {
        if (--readycount === 0) {
          // store original callbacks
          const callBackTypes = ['drawCallback', 'highlightCallback', 'unhighlightCallback'];
          for (let j = 0; j < dygraphs.length; j++) {
            if (!prevCallbacks[j]) {
              prevCallbacks[j] = {};
            }
            for (let k = callBackTypes.length - 1; k >= 0; k--) {
              prevCallbacks[j][callBackTypes[k]] = dygraphs[j].getFunctionOption(callBackTypes[k]);
            }
          }

          // Listen for draw, highlight, unhighlight callbacks.
          if (opts.zoom) {
            attachZoomHandlers(dygraphs, opts, prevCallbacks);
          }

          if (opts.selection) {
            attachSelectionHandlers(dygraphs, prevCallbacks);
          }
        }
      });
    }

    return {
      detach: (): void => {
        for (let i = 0; i < dygraphs.length; i++) {
          const g = dygraphs[i];
          if (opts.zoom) {
            g.updateOptions({ drawCallback: prevCallbacks[i].drawCallback });
          }
          if (opts.selection) {
            g.updateOptions({
              highlightCallback: prevCallbacks[i].highlightCallback,
              unhighlightCallback: prevCallbacks[i].unhighlightCallback,
            });
          }
        }
        // release references & make subsequent calls throw.
        dygraphs = [];
        opts = null;
        prevCallbacks = [];
      },
      graphs: [this.graphs],
    };
  };
}
