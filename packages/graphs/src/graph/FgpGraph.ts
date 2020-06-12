/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';
import { ViewConfig, DomAttrs, EventHandlers } from './Types';
import { DomOperator as DomElementOperator } from '../utils/DomOperator';
import { ResizeObserver, ResizeObserverEntry } from '@juggle/resize-observer';
import { GraphOperator } from './GraphRenderer';

/**
 * graph class
 */
export class FgpGraph {
  graphContainer: HTMLElement;

  body: HTMLElement;

  public graph!: Dygraph;

  private rangeBarGraph!: Dygraph;

  viewConfigs: Array<ViewConfig>;

  private parentDom: HTMLElement;

  public syncLegend = false;

  intervalLabelsArea: HTMLElement;

  public children: Array<FgpGraph> = [];

  public currentDateWindow: number[] = [];

  id: string;

  public operator!: GraphOperator;

  eventListeners?: EventHandlers;

  private graphDateWindow: [number, number];

  private readonly syncViews: boolean = false;

  // private isReady: boolean = false;

  /**
   *Creates an instance of FgpGraph.
   * @param {HTMLElement} dom
   * graph container
   * @param {Array<ViewConfig>} viewConfigs
   * graph configuration
   * @memberof FgpGraph
   */
  constructor(dom: HTMLElement, viewConfigs: Array<ViewConfig>, eventHandlers?: EventHandlers, syncViews?: boolean) {
    this.parentDom = dom;
    this.graphDateWindow = [0, 0];
    if (eventHandlers) {
      this.eventListeners = eventHandlers;
    }
    console.log(`need to sync views? ${syncViews}`);
    if (syncViews) {
      this.syncViews = true;
    }

    this.id = ((Math.random() * 10000) | 0) + 1 + '';

    // if id exist then change id to id
    if (this.parentDom.getAttribute('id')) {
      this.id = this.parentDom.id;
    }

    //
    if (this.parentDom.getAttribute('fgp-graph-id')) {
      this.id = this.parentDom.getAttribute('fgp-graph-id') as string;
    }

    const intervalsLabelsAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-interval-labels' }];
    this.intervalLabelsArea = DomElementOperator.createElement('div', intervalsLabelsAttrs);

    // create doms
    const containerAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-container noselect' }];
    this.graphContainer = DomElementOperator.createElement('div', containerAttrs);

    const bodyAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-body' }];
    this.body = DomElementOperator.createElement('div', bodyAttrs);
    this.graphContainer.appendChild(this.body);
    this.parentDom.appendChild(this.graphContainer);
    this.viewConfigs = viewConfigs;
    // listening for div resizing.......
    const divResizeRo = new ResizeObserver((roes: ResizeObserverEntry[]) => {
      roes.forEach((domObserverEntry) => {
        if (this.graph && domObserverEntry.target.className === 'fgp-graph-body') {
          console.log(
            'resizing dom: ',
            domObserverEntry.target.className,
            'if someone see a infinite loop here, please report it to author!',
          );
          if (isNaN(domObserverEntry.contentRect.width) || isNaN(domObserverEntry.contentRect.height)) {
          } else {
            // resize graph manually, because dygraph resizing base on window object.
            console.log(`new size is: ${domObserverEntry.contentRect.width} ${domObserverEntry.contentRect.height}`);
            const evt = window.document.createEvent('UIEvents');
            evt.initEvent('resize', false, false);
            window.dispatchEvent(evt);
          }
        } else {
          console.log('resizing not support for: ', domObserverEntry.target.className);
        }
      });
    });
    divResizeRo.observe(this.body);
  }

  /**
   *update datewindow for children graphs
   * @param datewindow
   * @param currentView
   * @private
   * @memberof FgpGraph
   */
  private dateWindowHandler = (dateWindow: [number, number]): void => {
    if (this.syncViews) {
      // store data
      this.graphDateWindow = dateWindow;
    }

    this.currentDateWindow = dateWindow;

    this.children.forEach((graph) => {
      // call updateDatewinow
      if (graph.id !== this.id) {
        graph.updateDatewinowInside(dateWindow);
      }
    });
  };

  /**
   * func for switching view
   * @param view
   */
  public changeView = (view: string): void => {
    // change view
    // find view
    this.viewConfigs.forEach((config) => {
      config.show = false;
      if (config.name === view) {
        // update show attribute
        config.show = true;

        if (this.syncViews && this.graphDateWindow) {
          config.initRange = {
            start: this.graphDateWindow[0],
            end: this.graphDateWindow[1],
          };
        }

        this.operator.init(
          config,
          (graph: Dygraph) => {
            this.graph = graph;
            this.children.forEach((graph) => {
              // call updateDatewinow
              if (graph.id != this.id) {
                // update data
                graph.operator.refresh();
              }
            });
          },
          () => {
            this.children.forEach((graph) => {
              // call updateDatewinow
              if (graph.id != this.id) {
                // update data
                graph.operator.refresh();
              }
            });
          },
        );

        // check if we need to tell others the view changed.
        if (this.eventListeners && this.eventListeners.onViewChange) {
          //f call
          this.eventListeners.onViewChange(this, config);
        }
      }
    });
  };

  /**
   * init graph with configuration
   *
   * @private
   * @memberof FgpGraph
   */
  public initGraph = (ready?: (g: FgpGraph) => void, needSync?: boolean): void => {
    this.operator = new GraphOperator(
      this.graph,
      this.rangeBarGraph,
      this.graphContainer,
      this.body,
      this.dateWindowHandler,
      this,
      this.eventListeners,
      this.id,
      needSync,
    );
    // which "view" should be shown first? device or scatter?
    if (this.viewConfigs) {
      let showView: ViewConfig | undefined;
      // check if showView is undefined
      if (!showView && this.viewConfigs.length > 0) {
        showView = this.viewConfigs[0];
        //
        showView = this.viewConfigs.find((_view) => {
          return _view.show === true;
        });

        if (showView) {
          this.operator.init(
            showView,
            (graph: Dygraph) => {
              this.graph = graph;
              if (ready) {
                ready(this);
              }
            },
            () => {
              this.children.forEach((graph) => {
                // call updateDatewinow
                if (graph.id !== this.id) {
                  // update data
                  graph.operator.refresh();
                }
              });
            },
          );
        }
      } else if (!showView && this.viewConfigs.length === 0) {
        console.error('view config not found!');
      }
    }
  };

  /**
   *update currrent graph datewindow
   * @param datewindow
   * @memberof FgpGraph
   */
  public updateDatewinow = (datewindow: [number, number]): void => {
    //
    console.log(`new datewindow: ${datewindow}`);

    // update graph
    if (this.graph) {
      const range: Array<number> = this.graph.xAxisRange();
      // if datewindow same then ignore that
      if (range[0] !== datewindow[0] || range[1] !== datewindow[1]) {
        // reload data for current graph
        this.operator.update(undefined, undefined, true, datewindow);
        // get all children graphs then run update
        this.children.forEach((child) => {
          child.updateDatewinowInside(datewindow, true);
        });
      }
    }
  };

  updateDatewinowInside = (datewindow: [number, number], forceReload?: boolean): void => {
    // update graph
    if (this.graph) {
      // update current date-window
      this.graph.updateOptions({
        dateWindow: datewindow,
      });
      if (forceReload) {
        this.operator.update(undefined, undefined, true, datewindow);
      }
    }
  };

  /**
   *bind children graphs
   * @param graphs
   * children graphs
   * @memberof FgpGraph
   */
  public setChildren = (graphs: Array<FgpGraph>): void => {
    this.children = this.children.concat(graphs);
  };

  /**
   * highlight line on graph
   * @param series
   * name of lines
   * @param duration
   * unhighlight after <duration> seconds  0 means highlight forever
   *
   * @memberof FgpGraph
   */
  public highlightSeries = (series: string[], duration: number, type?: string): void => {
    //
    this.operator.highlightSeries(series, duration, type);
  };

  /**
   * reload data for graph. base on series not changed!
   */
  public reloadData = (): void => {
    this.operator.update(undefined, undefined, true);
  };

  /**
   * do it later
   * @param config
   */
  public updateConfig = (): string => {
    //
    return 'not enabled in this version';
  };

  /**
   * clear graph
   */
  public clear = (): void => {
    console.warn('under developing!');
  };

  /**
   * highlight dots base on date time
   */
  public highlightOnTimestamp = (timestamp: number): void => {
    this.operator.highlightOnTimestamp(timestamp, this.children);
  };
}
