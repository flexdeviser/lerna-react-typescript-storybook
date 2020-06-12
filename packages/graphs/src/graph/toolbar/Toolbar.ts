/* eslint-disable @typescript-eslint/no-explicit-any */
import Dygraph from 'dygraphs';
import Badges from './widgets/Badges';
import Exports from './widgets/Exports';
import Series from './widgets/Series';
import Intervals from './widgets/Intervals';
import View from './widgets/View';
import Filter from './widgets/Filter';
import Extra from './widgets/Extra';
import { ViewConfig, GraphCollection, GraphExports } from '../Types';

export interface ReserveSpace {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  chart_div: HTMLDivElement;

  reserveSpaceLeft(px: number): ReserveSpace;

  reserveSpaceRight(px: number): ReserveSpace;

  reserveSpaceTop(px: number): ReserveSpace;

  reserveSpaceBottom(px: number): ReserveSpace;

  chartRect(): ReserveSpace;
}

export default class Toolbar {
  private g?: Dygraph;

  private readonly collectionOpts: any;

  private readonly viewConfig: ViewConfig;

  private badges?: Badges;
  private exports?: Exports;
  private series?: Series;
  private intervals?: Intervals;
  private view?: View;
  private filter?: Filter;
  private extra?: Extra;

  private graphHeader?: Element;

  private graphDiv?: Element;

  private readonly views: Array<ViewConfig>;

  constructor(
    view: ViewConfig,
    views: Array<ViewConfig>,
    public collectionSelectionListener: (collections: Array<GraphCollection>) => void,
    public intervalSelectionListener: (collection: GraphCollection, dateWindow: [number, number]) => void,
    public viewChangeListener: (view: ViewConfig) => void,
    public reactSelectionListener?: (active: boolean) => void,
    public colorFilterListener?: (isLock: boolean) => void,
  ) {
    this.collectionOpts = view.graphConfig.collections;
    this.views = views;
    this.viewConfig = view;
  }

  activate = (graph: Dygraph): any => {
    this.g = graph;
    // only add once
    const graphDiv = (graph as any).graphDiv;

    this.graphDiv = graphDiv;
    // create div
    let fullHide = false;
    if (this.viewConfig.graphConfig.hideHeader && this.viewConfig.graphConfig.hideHeader === true) {
      fullHide = true;
    } else {
      if (this.viewConfig.graphConfig.hideHeader) {
        const hideHeader = this.viewConfig.graphConfig.hideHeader;

        const div: HTMLElement = document.createElement('div');
        div.style.width = '100%';
        div.style.height = '30px;';
        div.setAttribute('class', 'fgp-graph-header');
        graphDiv?.appendChild(div);
        this.graphHeader = div;

        if (this.viewConfig.graphConfig.features.exports) {
          this.createExportBtns(this.viewConfig.graphConfig.features.exports);
        }

        if (hideHeader === true) {
          //
        } else {
          if (!hideHeader.toolbar && this.viewConfig.graphConfig.features.toolbar) {
            this.createExtraToolbar();
          }

          if (this.viewConfig.graphConfig.filters) {
            this.createFilter();
          }

          if (!hideHeader.views) {
            this.createView();
          }

          if (!hideHeader.intervals) {
            this.createInterval();
          }

          if (!hideHeader.series) {
            this.createSeries();
          }
        }
        this.createCollectionBadges(this.collectionOpts);
      } else {
        const div: HTMLElement = document.createElement('div');
        div.style.width = '100%';
        div.style.height = '30px;';
        div.setAttribute('class', 'fgp-graph-header');
        graphDiv?.appendChild(div);
        this.graphHeader = div;

        this.createExportBtns(this.viewConfig.graphConfig.features.exports);
        this.createExtraToolbar();
        this.createFilter();
        this.createView();
        this.createInterval();
        this.createSeries();
        this.createCollectionBadges(this.collectionOpts);
      }
    }

    return {
      layout: fullHide ? this.reserveSpaceTop0 : this.reserveSpaceTop,
    };
  };

  private reserveSpaceTop = (e: Layout): void => {
    e.reserveSpaceTop(30);
  };

  private reserveSpaceTop0 = (e: Layout): void => {
    e.reserveSpaceTop(0);
  };

  private createExportBtns = (config?: GraphExports[]): void => {
    if (this.graphHeader && config) {
      this.exports = new Exports(this.graphHeader, config, this.graphDiv, this.reactSelectionListener);
    }
  };

  private createView = (): void => {
    if (this.graphHeader) {
      this.view = new View(this.graphHeader, this.views, this.viewChangeListener);
    }
  };

  private createInterval = (): void => {
    if (this.graphHeader) {
      this.intervals = new Intervals(this.graphHeader, this.viewConfig, this.g, this.intervalSelectionListener);
    }
  };

  private createSeries = (): void => {
    if (this.graphHeader) {
      this.series = new Series(this.graphHeader, this.viewConfig, this.g);
      // check if filter exist
      if (this.filter) {
        //
        this.filter.setSeriesWidget(this.series);
      }
    }
  };

  private createFilter = (): void => {
    if (this.graphHeader) {
      this.filter = new Filter(this.graphHeader, this.viewConfig, this.g, this.colorFilterListener);
    }
  };

  private createExtraToolbar = (): void => {
    if (this.graphHeader) {
      this.extra = new Extra(this.graphHeader, this.viewConfig);
    }
  };

  /**
   * Add collection badge on graph.
   * @param g  "dygraph" instance
   * @param collections
   */
  private createCollectionBadges = (collections: Array<GraphCollection>): void => {
    if (this.graphHeader) {
      this.badges = new Badges(this.graphHeader, collections, this.collectionSelectionListener);
    }
  };
  /**
   * call this function to update all toolbar widgets
   * @param dateWindow
   */
  public updateDateWindow = (dateWindow: Array<number>, dateRange: Array<number>): void => {
    // update dateWindow for badges
    this.badges?.setDateWindow(dateWindow);
    this.intervals?.setDateWindow(dateWindow, dateRange);
  };

  public updateData = (collection: GraphCollection, labels: string[], data: any[]): void => {
    console.log(`current collection is `, collection);
    this.badges?.autoSelect(collection);
    this.exports?.setData(data, labels, collection);
    this.series?.setData(data, labels, collection);
    this.filter?.setData(collection);
  };
}
