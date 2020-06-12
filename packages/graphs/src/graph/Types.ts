/* eslint-disable @typescript-eslint/no-explicit-any */
import { FgpGraph } from '..';

export interface DomAttrs {
  key: string;
  value: string;
}

export interface DataHandler {
  source: string;

  /**
   * fetch data for multi-devices
   *
   * @param {Array<string>} ids
   * @param deviceType
   * @param interval
   * @param {{ start: number; end: number }} range
   * @param {Array<string>} [fields]
   * @param seriesConfig config from viewConfig
   * @param target rangebar or graph
   * @returns {Array<{ id: string, data: Array<any> }>}
   * @memberof DataHandler
   */
  fetchdata(
    ids: Array<string>,
    deviceType: string,
    interval: string,
    range: { start: number; end: number },
    fields?: Array<string>,
    seriesConfig?: Array<GraphSeries>,
    target?: DataRequestTarget,
  ): Promise<Array<{ id: string; data: Array<any> }>>;

  fetchFirstNLast(
    ids: Array<string>,
    devieType: string,
    interval: string,
    fields?: Array<string>,
  ): Promise<Array<{ id: string; data: { first: any; last: any } }>>;
}

/**
 *2 types of exporting graph data and save as image
 *
 * @enum {number}
 */
export enum GraphExports {
  Image = 'image',
  Data = 'data',
  Draw = 'draw',
}

export enum DataRequestTarget {
  RANGE_BAR = 'rangebar',
  GRAPH = 'graph',
}

export interface ToolbarBtn {
  label: string;
  prop: any;

  func(prop: any): void;
}

export interface ToolbarDropdown {
  label: string;
  prop: any;

  func(prop: any): void;
}

export interface ToolbarConfig {
  buttons?: ToolbarBtn[];
  dropdown?: Array<ToolbarDropdown[]>;
}

/**
 * @zoom enable or disable zooming
 * @scroll enable or disable scrolling
 * @rangeBar show or hide rangeBar
 * @connectPoints connect points when series interval are different.
 * @legend type of legend (single or multiple)
 * @ctrlButtons show or hide control buttons
 * @rangeLocked lock range bar
 */
export interface Features {
  zoom: boolean;
  scroll: boolean;
  rangeBar: boolean | { show: boolean; format: string };
  connectPoints?: boolean;
  legend?(data: any): string;
  exports?: GraphExports[]; // png
  ctrlButtons?: { x?: boolean; y?: boolean; y2?: boolean };
  rangeLocked?: boolean;
  toolbar?: ToolbarConfig;
  pointLimits?: boolean;
}

/**
 * device entity
 *
 * @id
 * @name
 * @type type of entity
 * @description
 * @fragment
 * @extension object for extra info
 */
export interface Entity {
  id: string;
  type: string;
  name: string; // different to id. sometimes comes from "device.description"
  extension?: any;
  fragment?: boolean;
}

/**
 * div dom element
 *
 * @key
 * @value value of attr
 */
export interface DomAttrs {
  key: string;
  value: string;
}

/**
 *graph series configuration
 *
 * @label
 * @color color for current series if undefined then use default color
 * @exp expression for cal
 * @type line dot or step
 * @yIndex left or right
 * @visibility show or hide from init
 * @extraConfig use for different type of device
 */
export interface GraphSeries {
  label: string;
  color?: string | undefined;
  exp: string;
  type: string;
  yIndex?: string;
  visibility?: boolean; // only worked in single device view
  extraConfig?: any;
}

/**
 *graph collection
 *
 * @label
 * @name
 * @series lines
 * @interval use to cal the gap base on data interval
 * @yLabel label of y
 * @y2Label label of y2
 * @threshold interval changes base on this threshold
 * @initScale y and y2 init range
 * @file fill area
 */
export interface GraphCollection {
  label: string;
  name: string;
  series: Array<GraphSeries>;
  interval: number;
  yLabel?: string;
  y2Label?: string;
  threshold?: { min: number; max: number };
  initScales?: {
    left?: { min: number; max: number };
    right?: { min: number; max: number };
  };
  fill?: boolean;
  markLines?: Array<{
    value: number;
    label: string;
    color?: string;
    y?: string;
  }>;
  locked?: boolean;
  show?: boolean;
  syncParentSelection?: boolean;
}

/**
 * type of filter buttons
 */
export enum FilterType {
  HIGHLIGHT = 'highlight',
  COLORS = 'color',
}

export type filterFunc = (labels?: Array<string>) => Array<string>;

/**
 * filter config
 * @label shown on button or dropdown list
 * @func callback function
 * @type filter type button or dropdown list
 */
export interface FilterConfig {
  label: string;
  func: filterFunc;
  type?: FilterType;
}

/**
 * graph configuration
 *
 * @features enable or disable features
 * @entities series entity
 * @rangeEntity use for range bar
 * @collection configuration of series
 * @rangeCollection range bar line configuration (should just put one line here)
 * @filters button or dropdown list config
 */
export interface GraphConfig {
  hideHeader?:
    | boolean
    | {
        views: boolean;
        intervals: boolean;
        toolbar: boolean;
        series: boolean;
      };
  features: Features;
  entities: Array<Entity>;
  rangeEntity: Entity;
  collections: Array<GraphCollection>;
  rangeCollection: GraphCollection;
  filters?: { buttons?: Array<FilterConfig>; dropdown?: Array<FilterConfig> };
}

/**
 *graph callback configuration
 *
 * @dataCallback any time the datewindow changed, call this method to send data back to outside
 * @highlightCallback send one series back to outside on hover the graph
 * @clickCallback send one series back on click the graph
 * @dbClickCallback send one series back on dblclick the graph
 * @syncDateWindow send [start, end] back to outside
 */
export interface Callbacks {
  dataCallback?(data: any): void;

  highlightCallback?(datetime: number, series: string | null, points: dygraphs.Point[]): void;

  clickCallback?(series: string): void;

  dbClickCallback?(series: string): void;

  syncDateWindow?(dateWindow: number[]): void;

  multiSelectionCallback?(series: Array<string>): void;
}

/**
 * View config
 *
 * @name view name, will show this name in dropdown list
 * @graphConfig graph config
 * @dataService dataservice instance
 * @show show or hide
 * @ranges dropdownlist for 7 days 1 month etc
 * @timezone datetime zone
 * @initRange init datewindow range
 * @interaction callbacks
 * @connectSeparatedPoints connect or disconnect points when series interval are different
 * @highlightSeriesBackgroundAlpha show or hide background base on the alpha
 */
export interface ViewConfig {
  name: string;
  graphConfig: GraphConfig;
  dataService: DataHandler;
  show: boolean;
  ranges?: Array<{ name: string; value: number; show?: boolean }>;
  timezone?: string;
  initRange?: { start: number; end: number };
  interaction?: { callback?: Callbacks };
  connectSeparatedPoints?: boolean;
  highlightSeriesBackgroundAlpha?: number;
}

/**
 *
 */
export interface ViewOptions {
  name?: string; // should think about it what can be changed.
  dataService?: DataHandler;
  connectSeparatedPoints?: boolean;
}

/**
 * datetime ranges index
 *
 * @export
 * @enum {number}
 */
export enum GraphConstant {
  SECONDLY = 0,
  TWO_SECONDLY = 1,
  FIVE_SECONDLY = 2,
  TEN_SECONDLY = 3,
  THIRTY_SECONDLY = 4,
  MINUTELY = 5,
  TWO_MINUTELY = 6,
  FIVE_MINUTELY = 7,
  TEN_MINUTELY = 8,
  THIRTY_MINUTELY = 9,
  HOURLY = 10,
  TWO_HOURLY = 11,
  SIX_HOURLY = 12,
  DAILY = 13,
  TWO_DAILY = 14,
  WEEKLY = 15,
  MONTHLY = 16,
  QUARTERLY = 17,
  BIANNUAL = 18,
  ANNUAL = 19,
  DECADAL = 20,
  CENTENNIAL = 21,
  NUM_GRANULARITIES = 22,
}

export interface EventHandlers {
  onViewChange?(g: FgpGraph, view: ViewConfig): void;

  onIntervalChange?(g: FgpGraph, interval: { name: string; value: number; show?: boolean }): void;
}
