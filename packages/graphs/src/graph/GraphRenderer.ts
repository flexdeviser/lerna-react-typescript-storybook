/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';
import { ViewConfig, DomAttrs, EventHandlers, GraphCollection, GraphSeries, DataRequestTarget } from './Types';
import { DomOperator as DomElementOperator } from '../utils/DomOperator';
import moment from 'moment-timezone';

import { LoadingSpinner } from '../utils/LoadingSpinner';
import { FgpGraph } from '..';
import { hsvToRGB, FgpColor } from '../utils/ColorUtils';
import { Formatters } from '../formatters/Formatter';
import CrossHairs from '../plugins/CrossHairs';
import Toolbar from './toolbar/Toolbar';
import RectSelection from './toolbar/RectSelection';
import { GraphInteractions } from './GraphInterfactions';
import RangeHandles from './RangeHandles';
import { Synchronizer } from './Synchronizer';

/**
 * graph operator
 */
export class GraphOperator {
  public static FIELD_PATTERN = new RegExp(/data[.]{1}[a-zA-Z0-9]+/g);

  private graphId?: string;

  defaultGraphRanges: Array<{
    name: string;
    value: number;
    show?: boolean;
  }> = [
    { name: '3 days', value: 1000 * 60 * 60 * 24 * 3, show: true },
    { name: '7 days', value: 604800000, show: true },
    { name: '1 month', value: 2592000000, show: false },
  ];

  createElement = (type: string, attrs: Array<DomAttrs>): HTMLElement => {
    const dom: HTMLElement = document.createElement(type);
    // put attributes on element
    attrs.forEach((attr) => {
      dom.setAttribute(attr.key, attr.value);
    });
    return dom;
  };

  private mainGraph: Dygraph;

  private rangebarGraph: Dygraph;

  private currentView!: ViewConfig;

  private currentCollection!: GraphCollection | undefined;

  private rangeCollection!: GraphCollection;

  private start!: number;

  private end!: number;

  public datewindowCallback: any;

  private currentDateWindow?: { start: number; end: number };

  private currentGraphData: any[];

  private readonly graphContainer: HTMLElement;

  private readonly graphBody: HTMLElement;

  private readonly spinner: LoadingSpinner;

  private xBoundary: [number, number];

  private readonly yAxisBtnArea: HTMLElement;

  private readonly y2AxisBtnArea: HTMLElement;

  private lockedInterval: { name: string; interval: number } | undefined;

  private eventListeners?: EventHandlers;

  private readonly graphInstance: FgpGraph;

  private toolbar?: Toolbar;

  private rectSelection?: RectSelection;

  private colorLocked = false;

  private readonly needSync: boolean = false;

  private axesConfig?: any;

  private yScaleBtns: {
    left: HTMLElement | undefined;
    right: HTMLElement | undefined;
  } = {
    left: undefined,
    right: undefined,
  };

  private yScaleLockStatus = {
    left: { lock: true, value: [NaN, NaN] },
    right: { lock: true, value: [NaN, NaN] },
  };

  constructor(
    mainGraph: Dygraph,
    rangeGraph: Dygraph,
    graphContainer: HTMLElement,
    graphBody: HTMLElement,
    datewindowCallback: any,
    fgpGraph: FgpGraph,
    eventListeners?: EventHandlers,
    id?: string,
    needSync = true,
  ) {
    this.mainGraph = mainGraph;
    this.graphId = id;
    this.graphInstance = fgpGraph;
    this.rangebarGraph = rangeGraph;
    this.graphContainer = graphContainer;
    this.datewindowCallback = datewindowCallback;
    this.graphBody = graphBody;
    this.eventListeners = eventListeners;
    this.currentGraphData = [];
    this.spinner = new LoadingSpinner(this.graphContainer);
    this.xBoundary = [0, 0];
    const yAxisButtonAreaAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-yaxis-btn-container' }];
    this.yAxisBtnArea = DomElementOperator.createElement('div', yAxisButtonAreaAttrs);
    const y2AxisButtonAreaAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-y2axis-btn-container' }];
    this.y2AxisBtnArea = DomElementOperator.createElement('div', y2AxisButtonAreaAttrs);
    this.needSync = needSync;
  }

  public highlightOnTimestamp = (timestamp: number, children: Array<FgpGraph>): void => {
    //
    const row = this.mainGraph.getRowForX(timestamp);

    if (row) {
      console.log(`${row}`);
      // get series
      if (this.currentView.graphConfig.entities.length > 0) {
        const labels = this.mainGraph.getLabels();
        this.mainGraph.setSelection(row, labels[1]);
      } else {
        this.mainGraph.setSelection(row);
      }
      if (children) {
        children.forEach((_child) => {
          _child.highlightOnTimestamp(timestamp);
        });
      }
    } else {
      console.warn(`row not found! ${moment(timestamp).toString()}`);
    }
  };

  public recreateElement = (el: HTMLElement, withChildren: boolean): void => {
    if (withChildren && el) {
      if (el.parentNode) {
        el.parentNode.replaceChild(el.cloneNode(true), el);
      }
    } else if (el && el.parentNode) {
      const newEl = el.cloneNode(false);
      while (el.hasChildNodes() && el.firstChild) newEl.appendChild(el.firstChild);
      el.parentNode.replaceChild(newEl, el);
    }
  };

  public showSpinner = (): void => {
    if (this.spinner) {
      this.spinner.show();
    }
  };

  /**
   * call this method to highlight series
   */
  public highlightSeries = (series: string[], duration: number, type?: string): void => {
    const visibility: boolean[] = this.mainGraph.getOption('visibility');
    const formatters: Formatters = new Formatters(
      this.currentView.timezone ? this.currentView.timezone : moment.tz.guess(),
    );
    const ranges: Array<Array<number>> = this.mainGraph.yAxisRanges();
    if (series && series.length > 0) {
      // check entities
      const seriesInGraph: Array<string> = [];
      series.forEach((_series) => {
        //
        const existEntity = this.currentView.graphConfig.entities.find((entity) => {
          return entity.id === _series;
        });

        if (existEntity) {
          seriesInGraph.push(existEntity.name);
        }
      });

      if (type && type === 'selection' && seriesInGraph.length > 0) {
        // convert it to normal graph
        const graph: Dygraph = this.mainGraph;
        graph.setSelection(false, seriesInGraph[0]);
      } else if (seriesInGraph.length > 0) {
        // update "series" dropdown

        // hide all the others
        let _updateVisibility: boolean[] = [];
        if (this.currentCollection) {
          const _graphSeries = this.mainGraph.getLabels();
          // get indexes
          const _indexsShow: number[] = [];
          _graphSeries.forEach((_series, _index) => {
            //
            if (_index !== 0) {
              seriesInGraph.forEach((_showSeries, _showIndex) => {
                if (_showSeries === _series) {
                  _indexsShow.push(_index - 1);
                }
              });
            }
          });

          if (_indexsShow.length === 0) {
            // not found
            // set visibility
            visibility.forEach((_v, _i) => {
              _updateVisibility.push(true);
            });
          } else {
            // set visibility
            visibility.forEach((_v, _i) => {
              if (_indexsShow.indexOf(_i) === -1) {
                _v = false;
              }
              let exist = false;
              _indexsShow.forEach((_ei) => {
                if (_ei === _i) {
                  // found it
                  exist = true;
                }
              });
              if (!exist) {
                _updateVisibility.push(false);
              } else {
                _updateVisibility.push(true);
              }
            });
          }

          this.mainGraph.updateOptions({
            visibility: _updateVisibility,
            axes: {
              x: { axisLabelFormatter: formatters.axisLabel },
              y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
              y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
            },
          });

          if (duration > 0) {
            // take all visibility back
            setTimeout(() => {
              _updateVisibility = [];
              visibility.forEach((_v) => {
                _updateVisibility.push(true);
              });
              this.mainGraph.updateOptions({
                visibility: _updateVisibility,
                axes: {
                  x: { axisLabelFormatter: formatters.axisLabel },
                  y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
                  y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                },
              });
            }, duration * 1000);
          }
        }
      }
    } else {
      // bring all back
      const _updateVisibility: Array<boolean> = [];
      visibility.forEach((_v) => {
        _updateVisibility.push(true);
      });
      this.mainGraph.updateOptions({
        visibility: _updateVisibility,
        axes: {
          x: { axisLabelFormatter: formatters.axisLabel },
          y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
          y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
        },
      });
    }
  };

  init = (view: ViewConfig, readyCallback?: (graph: any) => void, interactionCallback?: () => void): void => {
    this.currentView = view;
    const formatters: Formatters = new Formatters(
      this.currentView.timezone ? this.currentView.timezone : moment.tz.guess(),
    );
    const entities: Array<string> = [];
    const bottomAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-bottom' }];
    let bottom = null;

    this.currentView.graphConfig.entities.forEach((entity) => {
      if (!entity.fragment) {
        entities.push(entity.id);
      }
    });

    // bind rect selection
    this.rectSelection = new RectSelection();

    if (this.rectSelection && this.currentView.interaction?.callback?.multiSelectionCallback) {
      this.rectSelection.setCallback((series: Array<string>) => {
        if (
          this.currentView.interaction &&
          this.currentView.interaction.callback &&
          this.currentView.interaction.callback.multiSelectionCallback
        ) {
          const finalSeries: Array<string> = [];
          // find ids for series
          this.currentView.graphConfig.entities.forEach((entity) => {
            //
            const tempSeries = series.find((_name) => {
              return _name === entity.name;
            });
            if (tempSeries) {
              finalSeries.push(entity.id);
            }
          });
          this.currentView.interaction.callback.multiSelectionCallback(finalSeries);
        }
      });
    }

    // find fields from configuration
    let timewindowEnd: number = moment
      .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
      .add(1, 'days')
      .startOf('day')
      .valueOf();
    let timewindowStart: number = moment
      .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
      .subtract(7, 'days')
      .startOf('day')
      .valueOf(); // default 7 days

    const ranges: Array<{ name: string; value: number; show?: boolean }> | undefined = this.currentView.ranges;
    if (ranges && ranges.length > 0) {
      // get first "show" == true
      const selected = ranges.find(
        (
          value: { name: string; value: number; show?: boolean },
          index: number,
          arr: { name: string; value: number; show?: boolean }[],
        ) => {
          return !!value.show;
        },
      );
      // not found then use first one
      if (!selected) {
        // just need to change start
        timewindowStart =
          moment
            .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
            .add(1, 'days')
            .startOf('day')
            .valueOf() - ranges[0].value;
      } else {
        timewindowStart =
          moment
            .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
            .add(1, 'days')
            .startOf('day')
            .valueOf() - selected.value;
      }
    }

    // set init range
    if (this.needSync && this.currentDateWindow) {
      timewindowEnd = this.currentDateWindow.end;
      timewindowStart = this.currentDateWindow.start;
    } else if (view.initRange) {
      timewindowEnd = moment(view.initRange.end)
        .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
        .valueOf();
      timewindowStart = moment(view.initRange.start)
        .tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
        .valueOf();
    }

    // which one should be shown first? base on current window size? or base on the collection config?

    // get default time range from graph config
    let graphRangesConfig: Array<{
      name: string;
      value: number;
      show?: boolean;
    }> = [];
    if (this.currentView.ranges) {
      graphRangesConfig = this.currentView.ranges;
    }

    const dropdownOpts: Array<{
      id: string;
      label: string;
      selected?: boolean;
    }> = [];
    graphRangesConfig.forEach((config) => {
      dropdownOpts.push({
        id: config.name,
        label: config.name,
        selected: config.show,
      });
    });

    let choosedCollection: GraphCollection | undefined;
    // get fields
    let fieldsForCollection: string[] = [];
    // get range config and find the first and last
    this.currentView.graphConfig.rangeCollection.series.forEach((series) => {
      let _tempFields: string[] | null = series.exp.match(GraphOperator.FIELD_PATTERN);
      // replace all "data."" with ""
      if (_tempFields) {
        _tempFields = _tempFields.map((exp) => exp.replace('data.', ''));
        // put fields together
        fieldsForCollection = fieldsForCollection.concat(_tempFields);
      }
    });
    // tell outside highlight disappeared
    this.graphContainer.addEventListener('mouseleave', (e) => {
      if (
        this.currentView.interaction &&
        this.currentView.interaction.callback &&
        this.currentView.interaction.callback.highlightCallback
      ) {
        this.currentView.interaction.callback.highlightCallback(0, null, []);

        this.graphInstance.children.forEach((child) => {
          if (child.syncLegend) {
            child.graph.clearSelection();
          }
        });
      }
    });

    //
    this.currentView.dataService
      .fetchFirstNLast(
        [this.currentView.graphConfig.rangeEntity.id],
        this.currentView.graphConfig.rangeEntity.type,
        this.currentView.graphConfig.rangeCollection.name,
        Array.from(new Set(fieldsForCollection)),
      )
      .then((resp) => {
        // get first and last records, just need start and end timestamp
        let first = {
          timestamp: moment.tz(this.currentView.timezone ? this.currentView.timezone : moment.tz.guess()).valueOf(),
        };
        let last = { timestamp: 0 };
        // if init range exist put the second on here
        if (this.currentView.initRange && this.currentView.initRange.end) {
          last.timestamp = this.currentView.initRange.end;
        }

        // get all first and last then find out which first is the smalllest and last is the largest
        resp.forEach((entityData) => {
          if (entityData.id === this.currentView.graphConfig.rangeEntity.id) {
            if (entityData.data && entityData.data.first && entityData.data.first.timestamp) {
              //
              if (first.timestamp > entityData.data.first.timestamp) {
                first = entityData.data.first;
              }
            }

            if (entityData.data && entityData.data.last && entityData.data.last.timestamp) {
              //
              if (last.timestamp < entityData.data.last.timestamp) {
                last = entityData.data.last;
              }
            }
          }
        });

        // init empty graph with start and end  no other data
        // let firstRanges: any = graphRangesConfig.find(range => range.show && range.show == true);

        let firstRanges: any = graphRangesConfig.find(
          (
            range: { name: string; value: number; show?: boolean },
            index: number,
            object: {
              name: string;
              value: number;
              show?: boolean;
            }[],
          ) => {
            return range ? range.show : false;
          },
        );

        if (!firstRanges) {
          // throw errors;
          console.warn('non default range for range-bar, use default 7 days');
          firstRanges = {
            name: '7 days',
            value: 604800000,
            show: true,
          };
        }

        // sort collections
        this.currentView.graphConfig.collections.sort((a, b) => {
          return a.interval > b.interval ? 1 : -1;
        });

        // get fields and labels
        this.currentView.graphConfig.collections.forEach((collection) => {
          // if there is a config for what level need to show.
          if (collection.threshold && firstRanges.value) {
            //  >= && <    [ in the middle  )
            if (firstRanges.value > collection.threshold.min && firstRanges.value <= collection.threshold.max) {
              this.currentCollection = choosedCollection = collection;
            }
          }
        });

        // get choose collection by width....
        if (!choosedCollection && firstRanges) {
          // cal with width
          const width: number = this.graphContainer.offsetWidth;
          //
          const pointsCanBeShown: number = Math.round(width * 0.9);
          this.currentView.graphConfig.collections.forEach((collection) => {
            // how many points in this interval
            if (firstRanges.value / collection.interval <= pointsCanBeShown) {
              if (!choosedCollection) {
                this.currentCollection = choosedCollection = collection;
              } else if (choosedCollection.interval > collection.interval) {
                this.currentCollection = choosedCollection = collection;
              }
            }
          });
        }

        const initialData = [[first.timestamp], [last.timestamp]];
        this.xBoundary = [first.timestamp, last.timestamp];
        if (this.currentView.initRange) {
          if (this.currentView.initRange.start < first.timestamp) {
            initialData[0] = [this.currentView.initRange.start];
          }

          if (this.currentView.initRange.end > last.timestamp) {
            initialData[1] = [this.currentView.initRange.end];
          }
          // upate choosed collection
          const gap = this.currentView.initRange.end - this.currentView.initRange.start;

          choosedCollection = this.currentView.graphConfig.collections.find((collection: GraphCollection) => {
            return collection.threshold && gap > collection.threshold.min && gap <= collection.threshold.max;
          });

          // if not found then check smallest and largest
          if (
            !choosedCollection &&
            this.currentView.graphConfig.collections &&
            this.currentView.graphConfig.collections.length > 0
          ) {
            const smallest = this.currentView.graphConfig.collections[0].threshold?.min;
            const largest = this.currentView.graphConfig.collections[
              this.currentView.graphConfig.collections.length - 1
            ].threshold?.max;
            if (smallest && this.currentView.graphConfig && gap < smallest) {
              choosedCollection = this.currentView.graphConfig.collections[0];
            } else if (largest && this.currentView.graphConfig && gap > largest) {
              choosedCollection = this.currentView.graphConfig.collections[
                this.currentView.graphConfig.collections.length - 1
              ];
            }
          }
        }

        let isY2 = false;
        let mainGraphLabels: Array<string> = [];
        // check visibility config
        const initVisibility: Array<boolean> = [];

        if (choosedCollection && this.currentView.graphConfig.entities.length === 1) {
          mainGraphLabels = [];
          choosedCollection.series.forEach((series, _index) => {
            mainGraphLabels.push(series.label);
            if (series.visibility == undefined || series.visibility) {
              initVisibility.push(true);
            } else if (!series.visibility) {
              initVisibility.push(false);
            }
            initialData.forEach((_data: any) => {
              _data[_index + 1] = null;
            });
            if (series.yIndex === 'right') {
              isY2 = true;
            }
          });
        } else if (
          choosedCollection &&
          this.currentView.graphConfig.entities.length > 1 &&
          choosedCollection.series &&
          choosedCollection.series[0]
        ) {
          mainGraphLabels = [];
          entities.forEach((entity, _index) => {
            mainGraphLabels.push(entity);
            initialData.forEach((_data: any) => {
              _data[_index + 1] = null;
            });
          });
        }

        let yScale: any = null;
        let y2Scale: any = null;
        // check if there is a init scale
        if (choosedCollection && choosedCollection.initScales) {
          if (
            choosedCollection.initScales.left &&
            choosedCollection.initScales.left.min !== 0 &&
            choosedCollection.initScales.left.max !== 0
          ) {
            yScale = {
              valueRange: [choosedCollection.initScales.left.min, choosedCollection.initScales.left.max],
            };
          }
          if (
            choosedCollection.initScales.right &&
            choosedCollection.initScales.right.min !== 0 &&
            choosedCollection.initScales.right.max !== 0
          ) {
            y2Scale = {
              valueRange: [choosedCollection.initScales.right.min, choosedCollection.initScales.right.max],
            };
          }
        }

        // check if scale locked
        if (this.yScaleLockStatus.left.lock) {
          // set default range
          if ((isNaN(this.yScaleLockStatus.left.value[0]) || isNaN(this.yScaleLockStatus.left.value[1])) && yScale) {
            this.yScaleLockStatus.left.value = yScale;
          } else {
            yScale = {
              valueRange: [this.yScaleLockStatus.left.value],
            };
          }
        }

        if (this.yScaleLockStatus.right.lock) {
          // set default rangesyncDateWindow
          if ((isNaN(this.yScaleLockStatus.right.value[0]) || isNaN(this.yScaleLockStatus.right.value[1])) && y2Scale) {
            this.yScaleLockStatus.right.value = y2Scale;
          } else {
            y2Scale = {
              valueRange: [this.yScaleLockStatus.right.value],
            };
          }
        }

        if (choosedCollection) {
          // set currentCollection to
          this.currentCollection = choosedCollection;
        }

        let currentDatewindowOnMouseDown: any[] = [];

        const datewindowChangeFunc = (e: MouseEvent, yAxisRange?: Array<Array<number>>): void => {
          let datewindow: number[] = [];

          if (this.rangebarGraph) {
            datewindow = this.rangebarGraph.xAxisRange();
          } else {
            datewindow = this.mainGraph.xAxisRange();
          }

          if (datewindow[0] === currentDatewindowOnMouseDown[0] && datewindow[1] === currentDatewindowOnMouseDown[1]) {
            // console.debug("no change!");
          } else {
            // fetch data again
            // sorting
            this.currentView.graphConfig.collections.sort((a, b) => {
              return a.interval > b.interval ? 1 : -1;
            });

            this.start = datewindow[0];
            this.end = datewindow[1];
            const gap = datewindow[1] - datewindow[0];
            if (!this.lockedInterval) {
              choosedCollection = this.currentView.graphConfig.collections.find((collection) => {
                return collection.threshold && gap > collection.threshold.min && gap <= collection.threshold.max;
              });
              // if not found then check smallest and largest
              if (
                !choosedCollection &&
                this.currentView.graphConfig.collections &&
                this.currentView.graphConfig.collections.length > 0
              ) {
                const smallest = this.currentView.graphConfig.collections[0].threshold?.min;
                const largest = this.currentView.graphConfig.collections[
                  this.currentView.graphConfig.collections.length - 1
                ].threshold?.max;
                if (smallest && this.currentView.graphConfig && gap < smallest) {
                  choosedCollection = this.currentView.graphConfig.collections[0];
                } else if (largest && this.currentView.graphConfig && gap > largest) {
                  choosedCollection = this.currentView.graphConfig.collections[
                    this.currentView.graphConfig.collections.length - 1
                  ];
                }
              }
            } else if (this.currentCollection) {
              choosedCollection = this.currentCollection;
              if (this.currentView.graphConfig.features.pointLimits) {
                // check limit
                const gAreaW = this.mainGraph.getArea().w;
                const currentInterval = this.currentCollection.interval;
                let maxShowP = 0;
                if (gAreaW) {
                  // call start and end
                  maxShowP = gAreaW * currentInterval;
                }
                // get current datewindow
                if (this.start > this.end - maxShowP) {
                  // go ahead
                } else {
                  this.start = this.end - maxShowP * 1.5;
                  // update datewindow
                  if (this.rangebarGraph) {
                    this.rangebarGraph.updateOptions({
                      dateWindow: [this.start, this.end],
                    });
                  } else {
                    this.mainGraph.updateOptions({
                      dateWindow: [this.start, this.end],
                    });
                  }
                }
              }
            }

            const collection: GraphCollection = {
              label: '',
              name: '',
              series: [],
              interval: 0,
            };
            Object.assign(collection, choosedCollection);

            this.currentCollection = collection;
            this.rangeCollection = this.currentView.graphConfig.rangeCollection;

            this.update(undefined, undefined, true);
          }
        };

        let updateTimer = 1;

        const callbackFuncForInteractions = (
          e: MouseEvent,
          yAxisRange: Array<Array<number>>,
          refreshData: any,
        ): void => {
          if (refreshData) {
            datewindowChangeFunc(e, yAxisRange);
          } else {
            // set initsacle
            if (updateTimer) {
              window.clearTimeout(updateTimer);
            }
            if (yAxisRange) {
              yAxisRange.forEach((element, _index) => {
                if (_index === 0) {
                  //left
                  if (
                    this.currentCollection &&
                    this.currentCollection.initScales &&
                    !this.currentCollection.initScales.left
                  ) {
                    // do nothing here.
                  } else if (this.currentCollection && this.yScaleLockStatus.left.lock) {
                    this.yScaleLockStatus.left.value = element;
                    // update graph yAxes
                    if (this.axesConfig) {
                      this.axesConfig.y.valueRange = element;
                      updateTimer = window.setTimeout(() => {
                        console.info('hello');
                        this.mainGraph.updateOptions({
                          axes: this.axesConfig,
                        });
                      }, 600);
                    }
                  }
                } else if (_index === 1) {
                  if (
                    this.currentCollection &&
                    this.currentCollection.initScales &&
                    !this.currentCollection.initScales.right
                  ) {
                    // do nothing here.
                  } else if (this.currentCollection && this.yScaleLockStatus.right.lock) {
                    this.yScaleLockStatus.right.value = element;
                    // update graph yAxes
                    if (this.axesConfig) {
                      this.axesConfig.y2.valueRange = element;
                      updateTimer = window.setTimeout(() => {
                        this.mainGraph.updateOptions({
                          axes: this.axesConfig,
                        });
                      }, 600);
                    }
                  }
                }
              });
            }
          }

          if (interactionCallback) {
            // ready to update children
            interactionCallback();
          }
        };

        // create a interaction model instance
        const interactionModel: GraphInteractions = new GraphInteractions(callbackFuncForInteractions, [
          first.timestamp,
          last.timestamp,
        ]);

        const dateLabelLeftAttrs: Array<DomAttrs> = [
          {
            key: 'class',
            value: 'fgp-graph-range-bar-date-label-left',
          },
        ];
        const startLabelLeft: HTMLElement = DomElementOperator.createElement('label', dateLabelLeftAttrs);
        const dateLabelRightAttrs: Array<DomAttrs> = [
          {
            key: 'class',
            value: 'fgp-graph-range-bar-date-label-right',
          },
        ];
        const endLabelRight: HTMLElement = DomElementOperator.createElement('label', dateLabelRightAttrs);

        let currentSelection: any = null;

        const fullVisibility: Array<boolean> = [];
        mainGraphLabels.forEach((label) => {
          fullVisibility.push(true);
        });

        const interactionModelConfig: any = {
          mousedown: interactionModel.mouseDown,
          mouseup: interactionModel.mouseUp,
          mouseenter: interactionModel.mouseEnter,
        };

        if (this.currentView.graphConfig.features.rangeLocked) {
          // remove all event listener. can't zooming, scrolling and panning
        } else {
          // disable scrolling. scrolling will change datetime window
          if (this.currentView.graphConfig.features.scroll) {
            interactionModelConfig['mousewheel'] = interactionModel.mouseScroll;
            interactionModelConfig['DOMMouseScroll'] = interactionModel.mouseScroll;
            interactionModelConfig['wheel'] = interactionModel.mouseScroll;
          }
        }

        if (this.currentView.graphConfig.features.zoom) {
          interactionModelConfig['mousemove'] = interactionModel.mouseMove;
        }

        // create toolbar on top, instead of old way!
        this.toolbar = new Toolbar(
          this.currentView,
          this.graphInstance.viewConfigs,
          (collections: GraphCollection[]) => {
            // udpate graph here
            console.log(`new collection config from badges!`, collections);

            const showCollection = collections.find((_coll) => {
              return _coll.show;
            });

            if (showCollection) {
              this.currentCollection = showCollection;
              if (showCollection.locked) {
                this.lockedInterval = {
                  name: showCollection.name,
                  interval: Number(showCollection.interval),
                };
              } else {
                this.lockedInterval = undefined;
              }
              // reload data
              this.refresh();
            }
          },
          (collection: GraphCollection | undefined, datewindow: number[]) => {
            this.currentCollection = collection;
            this.start = datewindow[0];
            this.end = datewindow[1];
            this.update();
            if (this.rangebarGraph) {
              // shrink and grow base on middle datetime
              this.rangebarGraph.updateOptions({
                dateWindow: [this.start, this.end],
              });
            }

            if (interactionCallback) {
              interactionCallback();
            }
          },
          (view: ViewConfig) => {
            // change show
            if (this.needSync && this.currentDateWindow) {
              view.initRange = this.currentDateWindow;
            }
            this.init(
              view,
              (graph: Dygraph) => {
                this.mainGraph = graph;

                this.graphInstance.children.forEach((graph) => {
                  // call updateDatewinow
                  if (graph.id !== this.graphInstance.id) {
                    // update data
                    graph.operator.refresh();
                  }
                });
                // check if we need to tell others the view changed.
                if (this.graphInstance.eventListeners && this.graphInstance.eventListeners.onViewChange) {
                  //f call
                  this.graphInstance.eventListeners.onViewChange(this.graphInstance, view);
                }
              },
              () => {
                this.graphInstance.children.forEach((graph) => {
                  // call updateDatewinow
                  if (graph.id !== this.graphInstance.id) {
                    // update data
                    graph.operator.refresh();
                  }
                });
              },
            );
          },
          (active: boolean) => {
            if (this.rectSelection && active) {
              this.rectSelection.enable();
            } else {
              this.rectSelection?.disable();
            }
          },
          (isLocked: boolean) => {
            this.colorLocked = isLocked;
          },
        );

        const axes = (this.axesConfig = {
          x: {
            axisLabelFormatter: formatters.axisLabel,
            ticker: formatters.DateTickerTZ,
          },
          y: yScale,
          y2: y2Scale,
        });
        // create graph instance
        this.mainGraph = new Dygraph(this.graphBody, initialData, {
          labels: ['x'].concat(mainGraphLabels),
          ylabel: choosedCollection && choosedCollection.yLabel ? choosedCollection.yLabel : '',
          y2label: choosedCollection && choosedCollection.y2Label ? choosedCollection.y2Label : '',
          rangeSelectorHeight: 30,
          visibility: initVisibility.length > 0 ? initVisibility : fullVisibility,
          legend: 'follow',
          legendFormatter: this.currentView.graphConfig.features.legend
            ? this.currentView.graphConfig.features.legend
            : formatters.legendForSingleSeries,
          labelsKMB: true,
          // showLabelsOnHighlight: false,
          // drawAxesAtZero: true,
          connectSeparatedPoints: this.currentView.connectSeparatedPoints
            ? this.currentView.connectSeparatedPoints
            : false,
          axes,
          highlightSeriesBackgroundAlpha: this.currentView.highlightSeriesBackgroundAlpha
            ? this.currentView.highlightSeriesBackgroundAlpha
            : 0.7,
          highlightSeriesOpts: { strokeWidth: 1 },
          highlightCallback: (e, x, ps, row, seriesName): void => {
            // make sure we got current selection and even no highlightCall in viewConfig we still need to make click dbl working.
            currentSelection = seriesName;
            if (
              this.currentView.interaction &&
              this.currentView.interaction.callback &&
              this.currentView.interaction.callback.highlightCallback
            ) {
              // find id in entities and send it back to outside
              const entity = this.currentView.graphConfig.entities.find((_entity) => {
                return _entity.name === currentSelection;
              });

              if (entity) {
                this.currentView.interaction.callback.highlightCallback(x, entity.id, ps);
              }
            }

            this.graphInstance.children.forEach((child) => {
              if (child.syncLegend) {
                child.graph.setSelection(row, seriesName);
              }
            });
          },
          unhighlightCallback: (e): void => {
            currentSelection = null;
          },
          clickCallback: (e, x, points): void => {
            if (
              this.currentView.interaction &&
              this.currentView.interaction.callback &&
              this.currentView.interaction.callback.clickCallback
            ) {
              const entity = this.currentView.graphConfig.entities.find((_entity) => {
                return _entity.name === currentSelection;
              });
              if (entity) {
                this.currentView.interaction.callback.clickCallback(entity.id);
              }
            }
          },
          interactionModel: interactionModelConfig,
          drawCallback: (g): void => {
            const xAxisRange: Array<number> = g.xAxisRange();
            if (this.currentView.graphConfig.features.rangeBar && this.currentView.graphConfig.rangeCollection) {
              if (typeof this.currentView.graphConfig.features.rangeBar === 'boolean') {
                startLabelLeft.innerHTML = moment
                  .tz(xAxisRange[0], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                  .format('lll z');
                endLabelRight.innerHTML = moment
                  .tz(xAxisRange[1], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                  .format('lll z');
              } else if (this.currentView.graphConfig.features.rangeBar.format) {
                const format: string = this.currentView.graphConfig.features.rangeBar.format;
                startLabelLeft.innerHTML = moment
                  .tz(xAxisRange[0], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                  .format(format);
                endLabelRight.innerHTML = moment
                  .tz(xAxisRange[1], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                  .format(format);
              }
            }
            if (this.spinner && this.spinner.isLoading) {
              // remove spinner from container
              this.spinner.done();
            }

            if (this.toolbar) {
              this.toolbar.updateDateWindow(xAxisRange, this.xBoundary);
            }
            this.currentDateWindow = {
              start: xAxisRange[0],
              end: xAxisRange[1],
            };
            // update datewindow
            this.datewindowCallback(xAxisRange, this.currentView);
          },
          plugins: [this.rectSelection, this.toolbar, new CrossHairs({ direction: 'v' })],
        });
        // add dbl event
        if (
          this.currentView &&
          this.currentView.interaction &&
          this.currentView.interaction.callback &&
          this.currentView.interaction.callback.dbClickCallback
        ) {
          const callbackFunc = this.currentView.interaction.callback.dbClickCallback;

          this.graphBody.addEventListener('dblclick', (e) => {
            if (currentSelection) {
              // find entity
              const entity = this.currentView.graphConfig.entities.find((entity) => {
                return entity.name === currentSelection;
              });

              //
              if (entity) {
                callbackFunc(entity.id);
              }
            }
          });
        }
        let ctrlBtnTimer: any = null;

        const ctrlBtnsEventListener: EventListener = (e) => {
          if (e.target instanceof Element) {
            const btn: Element = e.target;
            const g: Dygraph = this.mainGraph;
            const ranges: Array<Array<number>> = this.mainGraph.yAxisRanges();
            if (g && btn.getAttribute('fgp-ctrl') === 'x-pan-left') {
              const newDatewindow = [0, 0];
              // move left
              // current datewindow
              const datewindow: [number, number] = g.xAxisRange();
              const dateGap = datewindow[1] - datewindow[0];
              //
              if (this.xBoundary[0] < datewindow[0] - dateGap) {
                // move allowed
                newDatewindow[0] = datewindow[0] - dateGap;
                newDatewindow[1] = datewindow[1] - dateGap;
              } else {
                newDatewindow[0] = this.xBoundary[0];
                newDatewindow[1] = datewindow[1] - (datewindow[0] - this.xBoundary[0]);
              }

              // update datewindow
              this.mainGraph.updateOptions({
                dateWindow: newDatewindow,
                axes: {
                  x: { axisLabelFormatter: formatters.axisLabel },
                  y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
                  y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                },
              });
              // update graph
              if (ctrlBtnTimer) {
                window.clearTimeout(ctrlBtnTimer);
              }
              ctrlBtnTimer = window.setTimeout(() => {
                // how to updat
                this.refresh();
              }, 1000);
            } else if (g && btn.getAttribute('fgp-ctrl') === 'x-pan-right') {
              const newDatewindow = [0, 0];
              // move left
              // current datewindow
              const datewindow: [number, number] = g.xAxisRange();
              const dateGap = datewindow[1] - datewindow[0];
              //
              if (this.xBoundary[1] > datewindow[1] + dateGap) {
                // move allowed
                newDatewindow[0] = datewindow[0] + dateGap;
                newDatewindow[1] = datewindow[1] + dateGap;
              } else {
                newDatewindow[1] = this.xBoundary[1];
                newDatewindow[0] = datewindow[0] + (this.xBoundary[1] - datewindow[1]);
              }
              // update datewindow
              this.mainGraph.updateOptions({
                dateWindow: newDatewindow,
                axes: {
                  x: { axisLabelFormatter: formatters.axisLabel },
                  y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
                  y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                },
              });
              // update graph
              if (ctrlBtnTimer) {
                window.clearTimeout(ctrlBtnTimer);
              }
              ctrlBtnTimer = window.setTimeout(() => {
                // update graph
                this.refresh();
              }, 1000);
            } else if (g && btn.getAttribute('fgp-ctrl') === 'x-zoom-in') {
              let newDatewindow = [0, 0];
              //  minimum  ?   left - right > 5 minutes
              const datewindow: [number, number] = g.xAxisRange();

              const delta: number = (datewindow[1] - datewindow[0]) / 20;

              if (datewindow[1] - delta > datewindow[0] + delta + 1000 * 60 * 300) {
                newDatewindow = [datewindow[0] + delta, datewindow[1] - delta];
                this.mainGraph.updateOptions({
                  dateWindow: newDatewindow,
                  axes: {
                    x: { axisLabelFormatter: formatters.axisLabel },
                    y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
                    y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                  },
                });
                // update graph
                if (ctrlBtnTimer) {
                  window.clearTimeout(ctrlBtnTimer);
                }
                ctrlBtnTimer = window.setTimeout(() => {
                  // update graph
                  this.refresh();
                }, 1000);
              }
            } else if (g && btn.getAttribute('fgp-ctrl') === 'x-zoom-out') {
              const newDatewindow = [0, 0];
              //  minimum  ?   left - right > 5 minutes
              const datewindow: [number, number] = g.xAxisRange();

              const delta: number = (datewindow[1] - datewindow[0]) / 20;

              if (datewindow[1] + delta < this.xBoundary[1]) {
                newDatewindow[1] = datewindow[1] + delta;
              } else {
                newDatewindow[1] = this.xBoundary[1];
              }

              if (datewindow[0] - delta > this.xBoundary[0]) {
                newDatewindow[0] = datewindow[0] - delta;
              } else {
                newDatewindow[0] = this.xBoundary[0];
              }

              this.mainGraph.updateOptions({
                dateWindow: newDatewindow,
                axes: {
                  x: { axisLabelFormatter: formatters.axisLabel },
                  y: { valueRange: ranges[0], axisLabelWidth: 80, labelsKMB: true },
                  y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                },
              });
              // update graph
              if (ctrlBtnTimer) {
                window.clearTimeout(ctrlBtnTimer);
              }
              ctrlBtnTimer = window.setTimeout(() => {
                // update graph
                this.refresh();
              }, 1000);
            }
          }
        };

        // show always
        // zoom and pan buttons for x-axis

        const xAxisButtonAreaAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-xaxis-btn-container' }];
        const xAxisBtnArea: HTMLElement = DomElementOperator.createElement('div', xAxisButtonAreaAttrs);

        // add buttons
        const xAxisZoomInBtnAttrs: Array<DomAttrs> = [
          { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-zoom-in fgp-btn-v' },
        ];
        const xAxisZoomOutBtnAttrs: Array<DomAttrs> = [
          { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-zoom-out fgp-btn-v' },
        ];
        const xAxisPanLeftBtnAttrs: Array<DomAttrs> = [
          { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-pan-left fgp-btn-v' },
        ];
        const xAxisPanRightBtnAttrs: Array<DomAttrs> = [
          { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-pan-right fgp-btn-v' },
        ];

        //
        if (!this.currentView.graphConfig.features.rangeLocked) {
          const xAxisZoomInBtn: HTMLElement = DomElementOperator.createElement('button', xAxisZoomInBtnAttrs);
          xAxisZoomInBtn.setAttribute('fgp-ctrl', 'x-zoom-in');
          const xAxisZoomOutBtn: HTMLElement = DomElementOperator.createElement('button', xAxisZoomOutBtnAttrs);
          xAxisZoomOutBtn.setAttribute('fgp-ctrl', 'x-zoom-out');
          const xAxisPanLeftBtn: HTMLElement = DomElementOperator.createElement('button', xAxisPanLeftBtnAttrs);
          xAxisPanLeftBtn.setAttribute('fgp-ctrl', 'x-pan-left');
          const xAxisPanRightBtn: HTMLElement = DomElementOperator.createElement('button', xAxisPanRightBtnAttrs);
          xAxisPanRightBtn.setAttribute('fgp-ctrl', 'x-pan-right');
          xAxisZoomInBtn.addEventListener('mousedown', ctrlBtnsEventListener, false);
          xAxisZoomOutBtn.addEventListener('mousedown', ctrlBtnsEventListener, false);
          xAxisPanLeftBtn.addEventListener('mousedown', ctrlBtnsEventListener, false);
          xAxisPanRightBtn.addEventListener('mousedown', ctrlBtnsEventListener, false);
          // add buttons into container
          xAxisBtnArea.appendChild(xAxisPanLeftBtn);
          xAxisBtnArea.appendChild(xAxisZoomInBtn);
          xAxisBtnArea.appendChild(xAxisZoomOutBtn);
          xAxisBtnArea.appendChild(xAxisPanRightBtn);
        }
        // add buttons for y and y2 ctrl
        const ctrlVBtnsEventListener: EventListener = (e) => {
          const g: any = this.mainGraph;
          const yAxes = g.axes_;
          const yZoomIn = (side: string): void => {
            const ranges = this.mainGraph.yAxisRanges();
            if (side === 'left') {
              //
              const range = ranges[0];
              yAxes[0]['valueRange'] = [range[0] + (range[1] - range[0]) * 0.2, range[1] - (range[1] - range[0]) * 0.2];
              yAxes[0]['valueWindow'] = [
                range[0] + (range[1] - range[0]) * 0.2,
                range[1] - (range[1] - range[0]) * 0.2,
              ];
            } else if (side === 'right') {
              //
              const range = ranges[1];
              yAxes[1]['valueRange'] = [range[0] + (range[1] - range[0]) * 0.2, range[1] - (range[1] - range[0]) * 0.2];
              yAxes[1]['valueWindow'] = [
                range[0] + (range[1] - range[0]) * 0.2,
                range[1] - (range[1] - range[0]) * 0.2,
              ];
            }
            g.drawGraph_(false);
          };

          const yZoomOut = (side: string): void => {
            const ranges = this.mainGraph.yAxisRanges();
            if (side === 'left') {
              //
              const range = ranges[0];
              yAxes[0]['valueRange'] = [range[0] - (range[1] - range[0]) * 0.2, range[1] + (range[1] - range[0]) * 0.2];
              yAxes[0]['valueWindow'] = [
                range[0] - (range[1] - range[0]) * 0.2,
                range[1] + (range[1] - range[0]) * 0.2,
              ];
            } else if (side === 'right') {
              //
              const range = ranges[1];
              yAxes[1]['valueRange'] = [range[0] - (range[1] - range[0]) * 0.2, range[1] + (range[1] - range[0]) * 0.2];
              yAxes[1]['valueWindow'] = [
                range[0] - (range[1] - range[0]) * 0.2,
                range[1] + (range[1] - range[0]) * 0.2,
              ];
            }
            g.drawGraph_(false);
          };

          const yPanUp = (side: string): void => {
            const ranges = this.mainGraph.yAxisRanges();
            if (side === 'left') {
              const range = ranges[0];
              yAxes[0]['valueRange'] = [range[0] - (range[1] - range[0]) * 0.2, range[1] - (range[1] - range[0]) * 0.2];
              yAxes[0]['valueWindow'] = [
                range[0] - (range[1] - range[0]) * 0.2,
                range[1] - (range[1] - range[0]) * 0.2,
              ];
            } else if (side === 'right') {
              const range = ranges[1];
              yAxes[1]['valueRange'] = [range[0] - (range[1] - range[0]) * 0.2, range[1] - (range[1] - range[0]) * 0.2];
              yAxes[1]['valueWindow'] = [
                range[0] - (range[1] - range[0]) * 0.2,
                range[1] - (range[1] - range[0]) * 0.2,
              ];
            }
            g.drawGraph_(false);
          };

          const yPanDown = (side: string): void => {
            const ranges = this.mainGraph.yAxisRanges();
            if (side === 'left') {
              const range = ranges[0];
              yAxes[0]['valueRange'] = [range[0] + (range[1] - range[0]) * 0.2, range[1] + (range[1] - range[0]) * 0.2];
              yAxes[0]['valueWindow'] = [
                range[0] + (range[1] - range[0]) * 0.2,
                range[1] + (range[1] - range[0]) * 0.2,
              ];
            } else if (side === 'right') {
              const range = ranges[1];
              yAxes[1]['valueRange'] = [range[0] + (range[1] - range[0]) * 0.2, range[1] + (range[1] - range[0]) * 0.2];
              yAxes[1]['valueWindow'] = [
                range[0] + (range[1] - range[0]) * 0.2,
                range[1] + (range[1] - range[0]) * 0.2,
              ];
            }
            g.drawGraph_(false);
          };

          if (e.target instanceof Element) {
            const btn: Element = e.target;
            const g: Dygraph = this.mainGraph;
            const ctrlAttrs = btn.getAttribute('fgp-ctrl');
            if (ctrlAttrs != null && ctrlAttrs.indexOf('y2') !== -1) {
              if (btn.getAttribute('fgp-ctrl') === 'y2-pan-up') {
                yPanUp('right');
              } else if (btn.getAttribute('fgp-ctrl') === 'y2-pan-down') {
                yPanDown('right');
              } else if (btn.getAttribute('fgp-ctrl') === 'y2-zoom-in') {
                yZoomIn('right');
              } else if (btn.getAttribute('fgp-ctrl') === 'y2-zoom-out') {
                yZoomOut('right');
              }
            } else if (g && ctrlAttrs != null && ctrlAttrs.indexOf('y') !== -1) {
              if (btn.getAttribute('fgp-ctrl') === 'y-pan-up') {
                yPanUp('left');
              } else if (btn.getAttribute('fgp-ctrl') === 'y-pan-down') {
                yPanDown('left');
              } else if (btn.getAttribute('fgp-ctrl') === 'y-zoom-in') {
                yZoomIn('left');
              } else if (btn.getAttribute('fgp-ctrl') === 'y-zoom-out') {
                yZoomOut('left');
              }
            }
          }

          if (this.yScaleLockStatus.left.lock && yAxes[0]) {
            this.yScaleLockStatus.left.value = yAxes[0]['valueRange'];
            if (this.axesConfig) {
              this.axesConfig.y.valueRange = yAxes[0]['valueRange'];
              this.mainGraph.updateOptions({
                axes: this.axesConfig,
              });
            }
          }

          if (this.yScaleLockStatus.right.lock && yAxes[1]) {
            this.yScaleLockStatus.right.value = yAxes[1]['valueRange'];
            if (this.axesConfig) {
              this.axesConfig.y2.valueRange = yAxes[1]['valueRange'];
              this.mainGraph.updateOptions({
                axes: this.axesConfig,
              });
            }
          }
        };
        // check if exist or not
        if (this.graphContainer.getElementsByClassName('fgp-graph-yaxis-btn').length === 0) {
          // add buttons
          const yAxisZoomInBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-yaxis-btn fgp-btn-zoom-in fgp-btn-v' },
          ];
          const yAxisZoomOutBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-zoom-out fgp-btn-v' },
          ];
          const yAxisPanLeftBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-pan-left fgp-btn-v' },
          ];
          const yAxisPanRightBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-yaxis-btn fgp-btn-pan-right fgp-btn-v' },
          ];
          const yAxisLockScaleBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v' },
          ];
          //
          const yAxisZoomInBtn: HTMLElement = DomElementOperator.createElement('button', yAxisZoomInBtnAttrs);
          yAxisZoomInBtn.setAttribute('fgp-ctrl', 'y-zoom-in');
          const yAxisZoomOutBtn: HTMLElement = DomElementOperator.createElement('button', yAxisZoomOutBtnAttrs);
          yAxisZoomOutBtn.setAttribute('fgp-ctrl', 'y-zoom-out');
          const yAxisPanLeftBtn: HTMLElement = DomElementOperator.createElement('button', yAxisPanLeftBtnAttrs);
          yAxisPanLeftBtn.setAttribute('fgp-ctrl', 'y-pan-up');
          const yAxisPanRightBtn: HTMLElement = DomElementOperator.createElement('button', yAxisPanRightBtnAttrs);
          yAxisPanRightBtn.setAttribute('fgp-ctrl', 'y-pan-down');

          const yAxisLockScaleBtn: HTMLElement = (this.yScaleBtns.left = DomElementOperator.createElement(
            'button',
            yAxisLockScaleBtnAttrs,
          ));
          yAxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'false');

          yAxisPanLeftBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          yAxisZoomInBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          yAxisZoomOutBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          yAxisPanRightBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);

          yAxisLockScaleBtn.addEventListener(
            'mousedown',
            (e: MouseEvent) => {
              // lock or unlock scale
              const isLocked = yAxisLockScaleBtn.getAttribute('fgp-ctrl-y-scale-lock');
              if ('true' === isLocked) {
                yAxisLockScaleBtn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v';
                yAxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'false');
                this.yScaleLockStatus.left.lock = false;
              } else {
                yAxisLockScaleBtn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-lock fgp-btn-v';
                yAxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'true');
                this.yScaleLockStatus.left.lock = true;
              }
            },
            false,
          );

          this.yAxisBtnArea.appendChild(yAxisLockScaleBtn);
          this.yAxisBtnArea.appendChild(yAxisPanLeftBtn);
          this.yAxisBtnArea.appendChild(yAxisZoomInBtn);
          this.yAxisBtnArea.appendChild(yAxisZoomOutBtn);
          this.yAxisBtnArea.appendChild(yAxisPanRightBtn);

          this.graphContainer.appendChild(this.yAxisBtnArea);
        }

        // add buttons for y and y2 ctrl
        if (this.graphContainer.getElementsByClassName('fgp-graph-y2axis-btn').length === 0) {
          // add buttons
          const y2AxisZoomInBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-y2axis-btn fgp-btn-zoom-in fgp-btn-v' },
          ];
          const y2AxisZoomOutBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-zoom-out fgp-btn-v' },
          ];
          const y2AxisPanLeftBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-xaxis-btn fgp-btn-pan-left fgp-btn-v' },
          ];
          const y2AxisPanRightBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-y2axis-btn fgp-btn-pan-right fgp-btn-v' },
          ];
          const y2AxisLockScaleBtnAttrs: Array<DomAttrs> = [
            { key: 'class', value: 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v' },
          ];
          //
          const y2AxisZoomInBtn: HTMLElement = DomElementOperator.createElement('button', y2AxisZoomInBtnAttrs);
          y2AxisZoomInBtn.setAttribute('fgp-ctrl', 'y2-zoom-in');
          const y2AxisZoomOutBtn: HTMLElement = DomElementOperator.createElement('button', y2AxisZoomOutBtnAttrs);
          y2AxisZoomOutBtn.setAttribute('fgp-ctrl', 'y2-zoom-out');
          const y2AxisPanLeftBtn: HTMLElement = DomElementOperator.createElement('button', y2AxisPanLeftBtnAttrs);
          y2AxisPanLeftBtn.setAttribute('fgp-ctrl', 'y2-pan-up');
          const y2AxisPanRightBtn: HTMLElement = DomElementOperator.createElement('button', y2AxisPanRightBtnAttrs);
          y2AxisPanRightBtn.setAttribute('fgp-ctrl', 'y2-pan-down');

          const y2AxisLockScaleBtn: HTMLElement = (this.yScaleBtns.right = DomElementOperator.createElement(
            'button',
            y2AxisLockScaleBtnAttrs,
          ));
          y2AxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'false');

          y2AxisPanLeftBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          y2AxisZoomInBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          y2AxisZoomOutBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);
          y2AxisPanRightBtn.addEventListener('mousedown', ctrlVBtnsEventListener, false);

          y2AxisLockScaleBtn.addEventListener(
            'mousedown',
            () => {
              // lock or unlock scale
              const isLocked = y2AxisLockScaleBtn.getAttribute('fgp-ctrl-y-scale-lock');
              if ('true' === isLocked) {
                y2AxisLockScaleBtn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v';
                y2AxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'false');
                this.yScaleLockStatus.right.lock = false;
              } else {
                y2AxisLockScaleBtn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-lock fgp-btn-v';
                y2AxisLockScaleBtn.setAttribute('fgp-ctrl-y-scale-lock', 'true');
                this.yScaleLockStatus.right.lock = true;
              }
            },
            false,
          );

          this.y2AxisBtnArea.appendChild(y2AxisLockScaleBtn);
          this.y2AxisBtnArea.appendChild(y2AxisPanLeftBtn);
          this.y2AxisBtnArea.appendChild(y2AxisZoomInBtn);
          this.y2AxisBtnArea.appendChild(y2AxisZoomOutBtn);
          this.y2AxisBtnArea.appendChild(y2AxisPanRightBtn);

          this.graphContainer.appendChild(this.y2AxisBtnArea);
        }
        // remove first
        if (this.graphContainer.getElementsByClassName('fgp-graph-bottom').length > 0) {
          const bottoms = this.graphContainer.getElementsByClassName('fgp-graph-bottom');
          for (let i = 0; i < bottoms.length; i++) {
            this.graphContainer.removeChild(bottoms[i]);
          }
        }
        // range-bar?
        if (this.currentView.graphConfig.features.rangeBar && this.currentView.graphConfig.rangeCollection) {
          const labels: Array<string> = [];
          let firstData: any[] = [first.timestamp];
          let lastData: any[] = [last.timestamp];

          if (this.currentView.initRange) {
            if (this.currentView.initRange.start < first.timestamp) {
              firstData = [this.currentView.initRange.start];
            }

            if (this.currentView.initRange.end > last.timestamp) {
              lastData = [this.currentView.initRange.end];
            }
          }

          let rangeSeries: any = null;
          this.rangeCollection = this.currentView.graphConfig.rangeCollection;
          // range device always one
          rangeSeries = {};
          // check if ther is a y2
          this.currentView.graphConfig.rangeCollection.series.forEach((series, _index) => {
            labels.push(series.label);
            firstData[_index + 1] = null;
            lastData[_index + 1] = null;
            rangeSeries[series.label] = {
              axis: series.yIndex === 'left' || !series.yIndex ? 'y' : 'y2',
            };
          });

          if (isY2) {
            labels.push('y2');
            rangeSeries['y2'] = { axis: 'y2' };
            firstData.push(null);
            lastData.push(null);
          }

          // create 2 labels for start and end
          const dateLabels: HTMLElement = DomElementOperator.createElement('div', [
            { key: 'style', value: 'height:22px;' },
          ]);
          dateLabels.appendChild(startLabelLeft);
          dateLabels.appendChild(endLabelRight);
          dateLabels.appendChild(xAxisBtnArea);

          bottom = DomElementOperator.createElement('div', bottomAttrs);
          bottom.appendChild(dateLabels);
          const rangeBarAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-graph-rangebar' }];
          const rangeBar: HTMLElement = DomElementOperator.createElement('div', rangeBarAttrs);
          bottom.appendChild(rangeBar);
          this.graphContainer.appendChild(bottom);
          //create range-bar graph
          this.rangebarGraph = new Dygraph(
            rangeBar,
            [
              firstData, // first
              lastData, // last
            ],
            {
              xAxisHeight: 0,
              axes: {
                x: { drawAxis: false },
                y: { axisLabelWidth: 80 },
                y2: { axisLabelWidth: 80 },
              },
              labels: ['x'].concat(labels),
              // series: rangeSeries,
              showRangeSelector: true,
              rangeSelectorHeight: 30,
              legend: 'never',
              drawCallback: (dygraph, isInitial): void => {
                const xAxisRange: Array<number> = dygraph.xAxisRange();
                if (typeof this.currentView.graphConfig.features.rangeBar === 'boolean') {
                  startLabelLeft.innerHTML = moment
                    .tz(xAxisRange[0], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                    .format('lll z');
                  endLabelRight.innerHTML = moment
                    .tz(xAxisRange[1], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                    .format('lll z');
                } else if (this.currentView.graphConfig.features.rangeBar.format) {
                  const format: string = this.currentView.graphConfig.features.rangeBar.format;
                  startLabelLeft.innerHTML = moment
                    .tz(xAxisRange[0], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                    .format(format);
                  endLabelRight.innerHTML = moment
                    .tz(xAxisRange[1], this.currentView.timezone ? this.currentView.timezone : moment.tz.guess())
                    .format(format);
                }
                // only run first draw
                if (isInitial) {
                  // find zoomhandle
                  const handles: HTMLCollectionOf<Element> = this.graphContainer.getElementsByClassName(
                    'dygraph-rangesel-zoomhandle',
                  );
                  // left handle  just in case the right handle overlap the left one
                  if (handles[0] instanceof HTMLElement) {
                    (handles[0] as HTMLElement).style.zIndex = '11';
                  }
                } else {
                  this.datewindowCallback(xAxisRange, this.currentView);
                }
              },
              plugins: this.currentView.graphConfig.features.rangeLocked ? [RangeHandles] : [],
            },
          );

          // check
          if (this.rangebarGraph && this.mainGraph) {
            const sync = new Synchronizer([this.rangebarGraph, this.mainGraph]);
            sync.synchronize();
          }

          // readyCallback(this.mainGraph);
          const rangeBarCanvas: any = rangeBar.getElementsByClassName('dygraph-rangesel-fgcanvas')[0];
          const rangeBarHandles: any = rangeBar.getElementsByClassName('dygraph-rangesel-zoomhandle');
          const singleHandle: any = rangeBar.getElementsByClassName('dygraph-rangesel-zoomhandle-single');
          const rangebarMousedownFunc = (): void => {
            // check
            const dateWindow = this.rangebarGraph.xAxisRange();
            currentDatewindowOnMouseDown = dateWindow;

            window.addEventListener(
              'mouseup',
              (e) => {
                datewindowChangeFunc(e, []);
                // check if need to call "callback function"
                if (interactionCallback) {
                  // ready to update children
                  interactionCallback();
                }
              },
              { once: true },
            );
          };

          for (let i = 0; i < rangeBarHandles.length; i++) {
            const element: any = rangeBarHandles[i];
            // left one on the top
            if (i === 0) {
              element.style.zIndex = 10 + 1;
            } else {
              element.style.zIndex = 10;
            }
            element.addEventListener('mousedown', rangebarMousedownFunc);
            if (this.currentView.graphConfig.features.rangeLocked) {
              // change cursor
              element.style.cursor = 'default';
              element.style.pointerEvents = 'none';
            }
          }

          if (singleHandle && singleHandle[0]) {
            singleHandle[0].addEventListener('mousedown', rangebarMousedownFunc);
          }

          // add mouse listener
          rangeBarCanvas.addEventListener('mousedown', rangebarMousedownFunc);
        }
        // update datewindow
        this.mainGraph.updateOptions({
          dateWindow: [timewindowStart, timewindowEnd],
        });

        this.start = timewindowStart;
        this.end = timewindowEnd;

        this.update(first.timestamp, last.timestamp, undefined, undefined, readyCallback);
      });
  };

  refresh = (): void => {
    if (this.mainGraph) {
      const xAxisRange: Array<number> = this.mainGraph.xAxisRange();

      const datewindow: number[] = [];

      if (xAxisRange) {
        datewindow[0] = xAxisRange[0];
        datewindow[1] = xAxisRange[1];
      }

      this.start = datewindow[0];
      this.end = datewindow[1];
      const gap = datewindow[1] - datewindow[0];

      this.currentView.graphConfig.collections.sort((a, b) => {
        return a.interval > b.interval ? 1 : -1;
      });

      if (!this.lockedInterval) {
        this.currentCollection = this.currentView.graphConfig.collections.find((collection: GraphCollection) => {
          return collection.threshold && datewindow[1] - datewindow[0] <= collection.threshold.max;
        });

        // if not found then check smallest and largest
        if (
          !this.currentCollection &&
          this.currentView.graphConfig.collections &&
          this.currentView.graphConfig.collections.length > 0
        ) {
          const smallest = this.currentView.graphConfig.collections[0].threshold?.min;
          const largest = this.currentView.graphConfig.collections[this.currentView.graphConfig.collections.length - 1]
            .threshold?.max;
          if (smallest && this.currentView.graphConfig && gap < smallest) {
            this.currentCollection = this.currentView.graphConfig.collections[0];
          } else if (largest && this.currentView.graphConfig && gap > largest) {
            this.currentCollection = this.currentView.graphConfig.collections[
              this.currentView.graphConfig.collections.length - 1
            ];
          }
        }
      } else if (this.currentCollection) {
        // check if the datewindow acceptable
        const gAreaW = this.mainGraph.getArea().w;

        const currentInterval = this.currentCollection.interval;

        let maxShowP = 0;
        if (gAreaW) {
          // call start and end
          maxShowP = gAreaW * currentInterval;
        }
        // get current datewindow
        if (this.start > this.end - maxShowP) {
          // go ahead
        } else {
          if (this.currentView.graphConfig.features.pointLimits) {
            this.start = this.end - maxShowP * 1.5;
            // update datewindow
            if (this.rangebarGraph) {
              this.rangebarGraph.updateOptions({
                dateWindow: [this.start, this.end],
              });
            } else {
              this.mainGraph.updateOptions({
                dateWindow: [this.start, this.end],
              });
            }
          }
        }
      }

      // check initScale
      this.update(undefined, undefined, true);
    }
  };

  /**
   * render graph
   * @param first
   * @param last
   * @param refersh
   * @param range
   */
  update = (
    first?: number,
    last?: number,
    refersh?: boolean,
    range?: [number, number],
    readyCallback?: (graph: any) => void,
  ): void => {
    const mainGraph: any = this.mainGraph;
    const rangebarGraph: any = this.rangebarGraph;
    let graphCollection = this.currentCollection;
    const rangeCollection = this.rangeCollection;
    let start = this.start;
    let end = this.end;

    // check if currentCollection doesnt exist in currentView then ignore it
    let existCollection: GraphCollection | undefined = this.currentView.graphConfig.collections.find(
      (collection) => collection.name === this.currentCollection?.name,
    );

    // wrong collection and ignore it
    if (existCollection) {
      if (range && range.length === 2) {
        // rest start and end
        start = this.start = range[0];
        end = this.end = range[1];
        const gap = end - start;
        // find best interval
        if (!this.lockedInterval) {
          existCollection = graphCollection = this.currentCollection = this.currentView.graphConfig.collections.find(
            (collection: GraphCollection) => {
              return collection.threshold && gap > collection.threshold.min && gap <= collection.threshold.max;
            },
          );
          // if not found then check smallest and largest
          if (
            !existCollection &&
            this.currentView.graphConfig.collections &&
            this.currentView.graphConfig.collections.length > 0
          ) {
            const smallest = this.currentView.graphConfig.collections[0].threshold?.min;
            const largest = this.currentView.graphConfig.collections[
              this.currentView.graphConfig.collections.length - 1
            ].threshold?.max;
            if (smallest && this.currentView.graphConfig && end - start < smallest) {
              existCollection = graphCollection = this.currentCollection = this.currentView.graphConfig.collections[0];
            } else if (largest && this.currentView.graphConfig && end - start > largest) {
              existCollection = graphCollection = this.currentCollection = this.currentView.graphConfig.collections[
                this.currentView.graphConfig.collections.length - 1
              ];
            }
          }
        }
      }

      // only sync date-window here
      if (
        this.currentView &&
        this.currentView.interaction &&
        this.currentView.interaction.callback &&
        this.currentView.interaction.callback.syncDateWindow
      ) {
        this.currentView.interaction.callback.syncDateWindow([start, end]);
      }

      //
      if (existCollection) {
        if (this.yScaleLockStatus.left.lock && this.yScaleBtns.left) {
          // show lock
          const _btn = this.yScaleBtns.left;
          _btn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-lock fgp-btn-v';
          _btn.setAttribute('fgp-ctrl-y-scale-lock', 'true');
        } else if (this.yScaleBtns.left) {
          const _btn = this.yScaleBtns.left;
          _btn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v';
          _btn.setAttribute('fgp-ctrl-y-scale-lock', 'false');
        }

        if (this.yScaleLockStatus.right.lock && this.yScaleBtns.right) {
          // show lock
          const _btn = this.yScaleBtns.right;
          _btn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-lock fgp-btn-v';
          _btn.setAttribute('fgp-ctrl-y-scale-lock', 'true');
        } else if (this.yScaleBtns.right) {
          // unlock
          const _btn = this.yScaleBtns.right;
          _btn.className = 'fgp-graph-yaxis-btn fgp-btn-scale-unlock fgp-btn-v';
          _btn.setAttribute('fgp-ctrl-y-scale-lock', 'false');
        }
      }

      const view = this.currentView;

      const formatters: Formatters = new Formatters(view.timezone ? view.timezone : moment.tz.guess());
      // get data for main graph
      // main graph entities
      const mainEntities: Array<string> = [];
      let mainDeviceType = '';
      view.graphConfig.entities.forEach((entity) => {
        if (!entity.fragment) {
          mainEntities.push(entity.id);
          mainDeviceType = entity.type;
        }
      });

      // get fields for main graph
      let fieldsForMainGraph: string[] = [];

      const yIndexs: Array<number> = [];
      const y2Indexs: Array<number> = [];
      let colors: Array<string> = [];
      let mainGraphSeries: any = {};
      let mainLabels: Array<string> = [];
      let isY2 = false;
      if (graphCollection) {
        this.graphInstance.syncLegend = !!graphCollection.syncParentSelection;
        const num = graphCollection.series.length;
        const sat = 1.0;
        const val = 0.5;
        graphCollection.series.forEach((series, _index) => {
          let _tempFields: string[] | null = series.exp.match(GraphOperator.FIELD_PATTERN);
          // replace all "data."" with ""
          if (_tempFields) {
            _tempFields = _tempFields.map((exp) => exp.replace('data.', ''));
            fieldsForMainGraph = fieldsForMainGraph.concat(_tempFields);
          }
          // put fields together
          if (view.graphConfig.entities.length === 1 && series.color) {
            colors.push(series.color);
          } else if (view.graphConfig.entities.length === 1) {
            const half = Math.ceil(num / 2);
            const idx = _index % 2 ? half + (_index + 1) / 2 : Math.ceil((_index + 1) / 2);
            const hue = (1.0 * idx) / (1 + num);
            const colorStr = hsvToRGB(hue, sat, val);
            colors.push(colorStr);
          }

          if (series.yIndex && series.yIndex === 'right') {
            // right
            y2Indexs.push(_index + 1);
          } else if (!series.yIndex || series.yIndex === 'left') {
            // left
            yIndexs.push(_index + 1);
          }

          mainGraphSeries[series.label] = {
            axis: series.yIndex === 'left' ? 'y' : 'y2',
            // defaultColor: series.color,
            highlightCircleSize: 4,
          };

          if (series.type === 'dots') {
            mainGraphSeries[series.label]['strokeWidth'] = 0;
            mainGraphSeries[series.label]['drawPoints'] = true;
          } else if (series.type === 'step') {
            mainGraphSeries[series.label]['stepPlot'] = true;
          } else if (series.type === 'bar') {
            mainGraphSeries[series.label]['plotter'] = (e: any): void => {
              if (graphCollection) {
                const allSeries = graphCollection.series;
                const currentVs: Array<boolean> = this.mainGraph.getOption('visibility');
                const sets = e.allSeriesPoints;
                // find all bar series and get the real index
                const bars: Array<any> = [];
                const barIndex: Array<number> = [];
                allSeries.forEach((series, _index) => {
                  if (series.type === 'bar') {
                    // check visibility here
                    bars.push(series);
                    barIndex.push(_index);
                  }
                });

                //
                const g: any = e.dygraph;
                //
                const ctx: any = e.drawingContext;
                // y bottom
                const yBottom = g.toDomYCoord(0);
                // Find the minimum separation between x-values.
                // This determines the bar width.
                let minSep = Infinity;
                for (let j = 0; j < sets.length; j++) {
                  const points = sets[j];
                  for (let i = 1; i < points.length; i++) {
                    const sep = points[i].canvasx - points[i - 1].canvasx;
                    if (sep < minSep) minSep = sep;
                  }
                }

                const barWidth = Math.floor((2.0 / 3) * minSep);
                const fillColors: Array<string> = [];
                const strokeColors = g.getColors();

                strokeColors.forEach((c: string, _i: number) => {
                  fillColors.push(new FgpColor(strokeColors[_i]).toRgbWithAlpha(0.6));
                });

                // check current label visibility
                let finalBars: number = bars.length;

                currentVs.forEach((vs, _in) => {
                  if (!vs && barIndex.includes(_in)) {
                    finalBars -= 1;
                  }
                });

                for (let j = 0; j < finalBars; j++) {
                  // find how many series disabled before this one
                  let dsCount = 0;
                  currentVs.forEach((vs, _in) => {
                    if (!vs && barIndex[j] > _in) {
                      dsCount++;
                    }
                  });
                  ctx.fillStyle = fillColors[barIndex[j] - dsCount];
                  ctx.strokeStyle = strokeColors[barIndex[j] - dsCount];
                  for (let i = 0; i < sets[barIndex[j] - dsCount].length; i++) {
                    const p = sets[barIndex[j] - dsCount][i];
                    const centerX = p.canvasx;
                    let xLeft = -1;
                    // only one bar
                    if (finalBars === 1) {
                      xLeft = centerX - barWidth / 2;
                    } else {
                      xLeft = centerX - (barWidth / 2) * (1 - j / (finalBars - 1));
                    }
                    ctx.fillRect(xLeft, p.canvasy, barWidth / finalBars, yBottom - p.canvasy);
                    ctx.strokeRect(xLeft, p.canvasy, barWidth / finalBars, yBottom - p.canvasy);
                  }
                }
              }
            };
          } else {
            // disable step and show
            mainGraphSeries[series.label]['stepPlot'] = false;
            mainGraphSeries[series.label]['strokeWidth'] = 1;
            mainGraphSeries[series.label]['drawPoints'] = false;
            mainGraphSeries[series.label]['plotter'] = Dygraph.Plotters.linePlotter;
          }

          if (series.yIndex !== 'left') {
            isY2 = true;
          }
        });
      }

      const prepareGraphData = (
        data: any[],
        entities: any[],
        collection: any,
      ): {
        data: Array<any>;
        axis?: {
          y: { min: number; max: number };
          y2?: { min: number; max: number };
        };
        isY2?: boolean;
        isY?: boolean;
      } => {
        // update main graph
        const graphData: any[] = [];
        const finalData: any[] = [];
        //init data arrays with default empty
        entities.forEach((id, _index) => {
          graphData.push([]);
        });

        let _dates: Array<number> = [];

        data.forEach((entityData) => {
          entities.forEach((id, _index) => {
            if (id === entityData.id) {
              graphData.splice(_index, 1, entityData.data);
              // merge date
              entityData.data.forEach((item: any) => {
                // item is object
                if (_dates.indexOf(item.timestamp) === -1) {
                  _dates.push(item.timestamp);
                }
              });
            }
          });
        });
        _dates.sort();
        // fill gap
        let expectTimestampArray: Array<number> = [];
        _dates.forEach((_date, _index) => {
          expectTimestampArray.push(_date);
          if (
            existCollection &&
            _dates[_index + 1] &&
            _dates[_index + 1] - _date >= 2 * existCollection.interval &&
            (_dates[_index + 1] - _date) % existCollection.interval === 0
          ) {
            // add one gap here
            expectTimestampArray.push(_date + existCollection.interval);
          }
        });
        // add first & last
        if (first && last) {
          expectTimestampArray = [first].concat(expectTimestampArray).concat([last]);
        }
        _dates = expectTimestampArray;
        // rest labels
        mainLabels = [];

        const yAxis: any = { min: null, max: null };
        const yAxis2: any = { min: null, max: null };

        if (this.currentView.graphConfig.entities.length === 1) {
          // get collection config
          collection.series.forEach((series: GraphSeries, _index: number) => {
            mainLabels.push(series.label);
            const f = new Function(
              'data',
              'with(data) { if(' + series.exp + '!=null)return ' + series.exp + ';return null;}',
            );
            // generate data for this column
            _dates.forEach((date) => {
              // find date in finalData
              let point = finalData.find((record) => record[0] === date);
              const record = graphData[0].find((data: any) => data.timestamp === date);

              if (point) {
                point[_index + 1] = record ? f(record) : null;
              } else {
                point = [date];
                point[_index + 1] = record ? f(record) : null;
                finalData.push(point);
              }

              // update min max for current field
              // left
              yIndexs.forEach((_yIndex) => {
                if (_yIndex === _index + 1) {
                  //
                  if (yAxis.min) {
                    // compare and put the value
                    yAxis.min = yAxis.min > point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis.min;
                  } else {
                    yAxis.min = point[_index + 1];
                  }

                  if (yAxis.max) {
                    // compare and put the value
                    yAxis.max = yAxis.max < point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis.max;
                  } else {
                    yAxis.max = point[_index + 1];
                  }
                }
              });

              // right
              y2Indexs.forEach((_yIndex) => {
                if (_yIndex === _index + 1) {
                  //
                  if (yAxis2.min) {
                    // compare and put the value
                    yAxis2.min = yAxis2.min > point[_index + 1] ? point[_index + 1] : yAxis2.min;
                  } else {
                    yAxis2.min = point[_index + 1];
                  }

                  if (yAxis2.max) {
                    // compare and put the value
                    yAxis2.max = yAxis2.max < point[_index + 1] ? point[_index + 1] : yAxis2.max;
                  } else {
                    yAxis2.max = point[_index + 1];
                  }
                }
              });
            });
          });
        } else if (this.currentView.graphConfig.entities.length > 1 && collection.series && collection.series[0]) {
          this.currentView.graphConfig.entities.forEach((entity) => {
            if (!entity.fragment) {
              mainLabels.push(entity.name);
            }
          });

          const exp = collection.series[0].exp;
          const f = new Function('data', 'with(data) { if(' + exp + '!=null)return ' + exp + ';return null;}');
          _dates.forEach((date) => {
            // get the record
            let point = finalData.find((record) => record[0] === date);
            // if not found just add it as new one.
            if (!point) {
              point = [date];
              finalData.push(point);
            }

            entities.forEach((entity, _index) => {
              if (graphData.length > _index) {
                const record = graphData[_index].find((data: any) => data.timestamp === date);
                point[_index + 1] = record ? f(record) : null;

                yIndexs.forEach((_yIndex) => {
                  // if (_yIndex == (_index + 1)) {
                  //
                  if (yAxis.min) {
                    // compare and put the value
                    yAxis.min = yAxis.min > point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis.min;
                  } else {
                    yAxis.min = point[_index + 1];
                  }

                  if (yAxis.max) {
                    // compare and put the value
                    yAxis.max = yAxis.max < point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis.max;
                  } else {
                    yAxis.max = point[_index + 1];
                  }
                  // }
                });

                // right
                y2Indexs.forEach((_yIndex) => {
                  // if (_yIndex == (_index + 1)) {
                  //
                  if (yAxis2.min) {
                    // compare and put the value
                    yAxis2.min = yAxis2.min > point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis2.min;
                  } else {
                    yAxis2.min = point[_index + 1];
                  }

                  if (yAxis2.max) {
                    // compare and put the value
                    yAxis2.max = yAxis2.min > point[_index + 1] && point[_index + 1] ? point[_index + 1] : yAxis2.max;
                  } else {
                    yAxis2.max = point[_index + 1];
                  }
                  // }
                });
              } else {
                point[_index + 1] = null;
              }
            });
          });
        }
        return { data: finalData, axis: { y: yAxis, y2: yAxis2 } };
      };

      if (graphCollection) {
        this.spinner.show();
        // get data for
        view.dataService
          .fetchdata(
            mainEntities,
            mainDeviceType,
            graphCollection.name,
            {
              start: start,
              end: end,
            },
            Array.from(new Set(fieldsForMainGraph)),
            graphCollection.series,
            DataRequestTarget.GRAPH,
          )
          .then((resp) => {
            const graphData = prepareGraphData(resp, mainEntities, graphCollection);
            const yScale: { valueRange: Array<number> } = {
              valueRange: [],
            };
            const y2Scale: { valueRange: Array<number> } = {
              valueRange: [],
            };

            if (yIndexs.length === 0) {
              this.yAxisBtnArea.style.display = 'none';
            } else {
              this.yAxisBtnArea.style.display = '';
            }

            if (y2Indexs.length === 0) {
              this.y2AxisBtnArea.style.display = 'none';
            } else {
              this.y2AxisBtnArea.style.display = '';
            }

            // get init scale
            if (graphCollection && !graphCollection.initScales) {
              if (graphData.axis) {
                if (graphData.axis.y) {
                  yScale.valueRange = [
                    graphData.axis.y.min - Math.abs(graphData.axis.y.min) * 0.02,
                    graphData.axis.y.max + Math.abs(graphData.axis.y.max) * 0.02,
                  ];
                  if (this.yScaleLockStatus.left.lock) {
                    yScale.valueRange = this.yScaleLockStatus.left.value;
                  }
                }
                if (graphData.axis.y2) {
                  y2Scale.valueRange = [
                    graphData.axis.y2.min - Math.abs(graphData.axis.y2.min) * 0.02,
                    graphData.axis.y2.max + Math.abs(graphData.axis.y2.max) * 0.02,
                  ];
                  if (this.yScaleLockStatus.right.lock) {
                    yScale.valueRange = this.yScaleLockStatus.left.value;
                  }
                }
              }
            } else if (graphCollection && graphCollection.initScales) {
              // check if there is a init scale
              if (graphCollection && graphCollection.initScales && graphCollection.initScales.left) {
                yScale.valueRange = [graphCollection.initScales.left.min, graphCollection.initScales.left.max];

                if (graphCollection.initScales.left.min === 0 && graphCollection.initScales.left.max === 0) {
                  if (graphData.axis && graphData.axis.y) {
                    yScale.valueRange = [
                      graphData.axis.y.min - Math.abs(graphData.axis.y.min) * 0.02,
                      graphData.axis.y.max + Math.abs(graphData.axis.y.max) * 0.02,
                    ];
                  }
                }

                if (this.yScaleLockStatus.left.lock) {
                  yScale.valueRange = this.yScaleLockStatus.left.value;
                }
              }
              if (graphCollection && graphCollection.initScales && graphCollection.initScales.right) {
                y2Scale.valueRange = [graphCollection.initScales.right.min, graphCollection.initScales.right.max];
                if (graphCollection.initScales.right.min === 0 && graphCollection.initScales.right.max === 0) {
                  if (graphData.axis && graphData.axis.y2) {
                    y2Scale.valueRange = [
                      graphData.axis.y2.min - Math.abs(graphData.axis.y2.min) * 0.02,
                      graphData.axis.y2.max + Math.abs(graphData.axis.y2.max) * 0.02,
                    ];
                  }
                }

                if (this.yScaleLockStatus.right.lock) {
                  yScale.valueRange = this.yScaleLockStatus.right.value;
                }
              }
            }
            // clear old graph
            mainGraph.hidden_ctx_.clearRect(0, 0, mainGraph.hidden_.width, mainGraph.hidden_.height);
            // console.debug("Graph is clean now!~");

            if (graphData.data) {
              this.currentGraphData = [];

              graphData.data.forEach((_data) => {
                // convert timestamp to date
                _data[0] = new Date(_data[0]);
                this.currentGraphData.push(_data);
              });
            }
            if (view.graphConfig.entities.length > 1) {
              // reset mainGraphSeries to empty
              mainGraphSeries = null;
              colors = [];
            }

            const latestVisibility: Array<boolean> = [];

            const orgVisibility: Array<boolean> = mainGraph.getOption('visibility');

            if (orgVisibility.length !== mainLabels.length && graphCollection) {
              const initVisibility: boolean[] = [];
              const seriesNames: Array<string> = [];
              graphCollection.series.forEach((series, _index) => {
                if (series.visibility === undefined || series.visibility) {
                  initVisibility[_index] = true;
                } else if (!series.visibility) {
                  initVisibility[_index] = false;
                }
                seriesNames.push(series.label);
              });

              // set visibility, need to think about init visibility
              mainLabels.forEach((label, _index) => {
                latestVisibility[_index] = initVisibility[_index] !== undefined ? initVisibility[_index] : true;
              });
            }
            // clear draw area
            mainGraph.hidden_ctx_.clearRect(0, 0, mainGraph.hidden_.width, mainGraph.hidden_.height);

            if (this.currentCollection && this.toolbar) {
              this.toolbar.updateData(this.currentCollection, mainLabels, this.currentGraphData);
            }

            // lock color
            if (this.colorLocked) {
              colors = mainGraph.getColors();
            }

            // update main graph
            mainGraph.updateOptions({
              file: this.currentGraphData,
              series: mainGraphSeries,
              dateWindow: [start, end],
              visibility: latestVisibility.length > 0 ? latestVisibility : orgVisibility,
              colors: colors.length > 0 ? colors : undefined,
              labels: ['x'].concat(mainLabels),
              fillGraph: graphCollection && graphCollection.fill ? graphCollection.fill : false,
              highlightSeriesOpts: {
                strokeWidth: 1.5,
              },
              underlayCallback: (ctx: CanvasRenderingContext2D, area: dygraphs.Area, g: Dygraph) => {
                // clear marker line
                this.currentCollection?.markLines?.forEach((markerLine) => {
                  let yPosition = 0;
                  if (!markerLine.y || markerLine.y === 'left') {
                    yPosition = g.toDomYCoord(markerLine.value, 0);
                  } else {
                    yPosition = g.toDomYCoord(markerLine.value, 1);
                  }
                  // draw line
                  ctx.beginPath();
                  ctx.strokeStyle = markerLine.color ? markerLine.color : '#FF0000';
                  ctx.setLineDash([2, 4]);
                  ctx.moveTo(area.x, yPosition);
                  ctx.lineTo(area.x + area.w, yPosition);
                  ctx.stroke();
                  ctx.setLineDash([0, 0]);
                });
              },
              axes: {
                x: {
                  axisLabelFormatter: formatters.axisLabel,
                },
                y: {
                  valueRange: yScale.valueRange,
                  axisLabelWidth: 80,
                  labelsKMB: true,
                },
                y2: {
                  valueRange: y2Scale.valueRange,
                  axisLabelWidth: 80,
                  labelsKMB: true,
                },
              },
            });
            mainGraph.ready(() => {
              // first time graph ready
              if (readyCallback) {
                readyCallback(mainGraph);
              }
            });
          });
      }
      if (view.graphConfig.features.rangeBar) {
        // get fields for range-bar
        const rangeEntities: Array<string> = [view.graphConfig.rangeEntity.id];
        const rangeDeviceType: string = view.graphConfig.rangeEntity.type;
        // get fields for main graph
        let fieldsForRangebarGraph: string[] = [];

        rangeCollection.series.forEach((series) => {
          let _tempFields: string[] | null = series.exp.match(GraphOperator.FIELD_PATTERN);
          // replace all "data."" with ""
          if (_tempFields) {
            _tempFields = _tempFields.map((exp) => exp.replace('data.', ''));
            // put fields together
            fieldsForRangebarGraph = fieldsForRangebarGraph.concat(_tempFields);
          }
        });
        // for range
        view.dataService
          .fetchdata(
            rangeEntities,
            rangeDeviceType,
            rangeCollection.name,
            {
              start: start,
              end: end,
            },
            Array.from(new Set(fieldsForRangebarGraph)),
            undefined,
            DataRequestTarget.RANGE_BAR,
          )
          .then((resp) => {
            // merge data
            const currentDatewindowData = prepareGraphData(resp, rangeEntities, rangeCollection);
            let preData: Array<any> = rangebarGraph.file_;
            currentDatewindowData.data.forEach((_data) => {
              let _exist = -1;
              preData.forEach((_oldData, _index) => {
                if (_oldData[0] === _data[0]) {
                  _exist = _index;
                }
              });
              if (_exist !== -1) {
                // replace
                preData.splice(_exist, 1, _data);
              } else {
                // add data before the last one
                preData.push(_data);
              }
            });
            // sorting
            preData.sort((a, b) => {
              return a[0] > b[0] ? 1 : -1;
            });

            const rangeSeries: any = {};
            const labels = [];
            // check if there is a y2
            rangeCollection.series.forEach((series, _index) => {
              labels.push(series.label);
              rangeSeries[series.label] = { axis: series.yIndex === 'left' || !series.yIndex ? 'y' : 'y2' };
            });

            if (isY2) {
              labels.push('y2');
              rangeSeries['y2'] = { axis: 'y2' };

              preData.forEach((_data) => {
                if (_data.length === 2) {
                  _data.push(null);
                }
              });
            } else {
              preData.forEach((_data) => {
                if (_data.length > 2) {
                  _data.splice(2, _data.length - 2);
                }
              });
            }
            // add dummy data for range-bar, avoid range-bar error
            // date not found and start less than first.
            if (preData.length === 0 || (preData[0][0] && start < preData[0][0])) {
              preData = [[start, NaN]].concat(preData);
            }

            rangebarGraph.updateOptions({
              file: preData,
              series: rangeSeries,
              labels: ['x'].concat(labels),
            });
          });
      }
    }
  };
}
