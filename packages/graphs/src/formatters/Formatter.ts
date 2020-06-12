import { GraphConstant } from '../graph/Types';
import Dygraph from 'dygraphs';
import moment from 'moment-timezone';

/* eslint-disable @typescript-eslint/no-explicit-any */
export class Formatters {
    /**
     *show graph timestamp with this timezone
     * @type {string}
     * @memberof Formatters
     */
    public timezone: string;

    public dateformat?: string;

    private TICK_PLACEMENT: any[];

    private SHORT_SPACINGS: any[];

    /**
     *Creates an instance of Formatters.
     * @param {string} timezone  show graph timestamp with this timezone
     * @memberof Formatters
     */
    constructor(timezone: string) {
        this.timezone = timezone;
        const DATEFIELD_Y = 0;
        const DATEFIELD_M = 1;
        const DATEFIELD_D = 2;
        const DATEFIELD_HH = 3;
        const DATEFIELD_MM = 4;
        const DATEFIELD_SS = 5;
        const DATEFIELD_MS = 6;
        const NUM_DATEFIELDS = 7;

        this.TICK_PLACEMENT = [];
        this.TICK_PLACEMENT[GraphConstant.SECONDLY] = { datefield: DATEFIELD_SS, step: 1, spacing: 1000 * 1 };
        this.TICK_PLACEMENT[GraphConstant.TWO_SECONDLY] = { datefield: DATEFIELD_SS, step: 2, spacing: 1000 * 2 };
        this.TICK_PLACEMENT[GraphConstant.FIVE_SECONDLY] = { datefield: DATEFIELD_SS, step: 5, spacing: 1000 * 5 };
        this.TICK_PLACEMENT[GraphConstant.TEN_SECONDLY] = { datefield: DATEFIELD_SS, step: 10, spacing: 1000 * 10 };
        this.TICK_PLACEMENT[GraphConstant.THIRTY_SECONDLY] = { datefield: DATEFIELD_SS, step: 30, spacing: 1000 * 30 };
        this.TICK_PLACEMENT[GraphConstant.MINUTELY] = { datefield: DATEFIELD_MM, step: 1, spacing: 1000 * 60 };
        this.TICK_PLACEMENT[GraphConstant.TWO_MINUTELY] = { datefield: DATEFIELD_MM, step: 2, spacing: 1000 * 60 * 2 };
        this.TICK_PLACEMENT[GraphConstant.FIVE_MINUTELY] = { datefield: DATEFIELD_MM, step: 5, spacing: 1000 * 60 * 5 };
        this.TICK_PLACEMENT[GraphConstant.TEN_MINUTELY] = { datefield: DATEFIELD_MM, step: 10, spacing: 1000 * 60 * 10 };
        this.TICK_PLACEMENT[GraphConstant.THIRTY_MINUTELY] = {
            datefield: DATEFIELD_MM,
            step: 30,
            spacing: 1000 * 60 * 30,
        };
        this.TICK_PLACEMENT[GraphConstant.HOURLY] = { datefield: DATEFIELD_HH, step: 1, spacing: 1000 * 3600 };
        this.TICK_PLACEMENT[GraphConstant.TWO_HOURLY] = { datefield: DATEFIELD_HH, step: 2, spacing: 1000 * 3600 * 2 };
        this.TICK_PLACEMENT[GraphConstant.SIX_HOURLY] = { datefield: DATEFIELD_HH, step: 6, spacing: 1000 * 3600 * 6 };
        this.TICK_PLACEMENT[GraphConstant.DAILY] = { datefield: DATEFIELD_D, step: 1, spacing: 1000 * 86400 };
        this.TICK_PLACEMENT[GraphConstant.TWO_DAILY] = { datefield: DATEFIELD_D, step: 2, spacing: 1000 * 86400 * 2 };
        this.TICK_PLACEMENT[GraphConstant.WEEKLY] = { datefield: DATEFIELD_D, step: 7, spacing: 1000 * 604800 };
        this.TICK_PLACEMENT[GraphConstant.MONTHLY] = { datefield: DATEFIELD_M, step: 1, spacing: 1000 * 7200 * 365.2524 }; // 1e3 * 60 * 60 * 24 * 365.2524 / 12
        this.TICK_PLACEMENT[GraphConstant.QUARTERLY] = {
            datefield: DATEFIELD_M,
            step: 3,
            spacing: 1000 * 21600 * 365.2524,
        }; // 1e3 * 60 * 60 * 24 * 365.2524 / 4
        this.TICK_PLACEMENT[GraphConstant.BIANNUAL] = {
            datefield: DATEFIELD_M,
            step: 6,
            spacing: 1000 * 43200 * 365.2524,
        }; // 1e3 * 60 * 60 * 24 * 365.2524 / 2
        this.TICK_PLACEMENT[GraphConstant.ANNUAL] = { datefield: DATEFIELD_Y, step: 1, spacing: 1000 * 86400 * 365.2524 }; // 1e3 * 60 * 60 * 24 * 365.2524 * 1
        this.TICK_PLACEMENT[GraphConstant.DECADAL] = {
            datefield: DATEFIELD_Y,
            step: 10,
            spacing: 1000 * 864000 * 365.2524,
        }; // 1e3 * 60 * 60 * 24 * 365.2524 * 10
        this.TICK_PLACEMENT[GraphConstant.CENTENNIAL] = {
            datefield: DATEFIELD_Y,
            step: 100,
            spacing: 1000 * 8640000 * 365.2524,
        }; // 1e3 * 60 * 60 * 24 * 365.2524 * 100
        this.SHORT_SPACINGS = [];
        this.SHORT_SPACINGS[GraphConstant.SECONDLY] = 1000 * 1;
        this.SHORT_SPACINGS[GraphConstant.TWO_SECONDLY] = 1000 * 2;
        this.SHORT_SPACINGS[GraphConstant.FIVE_SECONDLY] = 1000 * 5;
        this.SHORT_SPACINGS[GraphConstant.TEN_SECONDLY] = 1000 * 10;
        this.SHORT_SPACINGS[GraphConstant.THIRTY_SECONDLY] = 1000 * 30;
        this.SHORT_SPACINGS[GraphConstant.MINUTELY] = 1000 * 60;
        this.SHORT_SPACINGS[GraphConstant.TWO_MINUTELY] = 1000 * 60 * 2;
        this.SHORT_SPACINGS[GraphConstant.FIVE_MINUTELY] = 1000 * 60 * 5;
        this.SHORT_SPACINGS[GraphConstant.TEN_MINUTELY] = 1000 * 60 * 10;
        this.SHORT_SPACINGS[GraphConstant.THIRTY_MINUTELY] = 1000 * 60 * 30;
        this.SHORT_SPACINGS[GraphConstant.HOURLY] = 1000 * 3600;
        this.SHORT_SPACINGS[GraphConstant.TWO_HOURLY] = 1000 * 3600 * 2;
        this.SHORT_SPACINGS[GraphConstant.SIX_HOURLY] = 1000 * 3600 * 6;
        this.SHORT_SPACINGS[GraphConstant.DAILY] = 1000 * 86400;
        this.SHORT_SPACINGS[GraphConstant.WEEKLY] = 1000 * 604800;
        this.SHORT_SPACINGS[GraphConstant.TWO_DAILY] = 1000 * 86400 * 2;
    }

    /**
     * update date format for legend and range-bar
     * @param format
     */
    public setFormat = (format: string): void => {
        this.dateformat = format;
    };

    private numDateTicks = (startTime: number, endTime: number, granularity: number): number => {
        const spacing = this.TICK_PLACEMENT[granularity].spacing;
        return Math.round((1.0 * (endTime - startTime)) / spacing);
    };

    private pickDateTickGranularity = (a: any, b: any, pixels: any, opts: any): number => {
        const pixelsPerTick = opts('pixelsPerLabel');
        for (let i = 0; i < 21; i++) {
            const numTicks = this.numDateTicks(a, b, i);
            if (pixels / numTicks >= pixelsPerTick) {
                return i;
            }
        }
        return -1;
    };

    private zeropad = (x: number): string => {
        if (x < 10) return '0' + x;
        else return '' + x;
    };

    private getDateAxis = (start: any, end: any, granularity: any, opts: any, dygraph: Dygraph): Array<any> => {
        //
        const formatter = /** @type{AxisLabelFormatter} */ opts('axisLabelFormatter');
        const ticks = [];
        let t;

        if (granularity < GraphConstant.MONTHLY) {
            // Generate one tick mark for every fixed interval of time.
            const spacing = this.SHORT_SPACINGS[granularity];
            // Find a time less than start_time which occurs on a "nice" time boundary
            // for this granularity.
            let g = spacing / 1000;
            const d = moment(start).tz(this.timezone ? this.timezone : moment.tz.guess());
            d.millisecond(0);
            let x;
            if (g <= 60) {
                // seconds
                x = d.second();
                d.second(x - (x % g));
            } else {
                d.second(0);
                g /= 60;
                if (g <= 60) {
                    // minutes
                    x = d.minute();
                    d.minute(x - (x % g));
                } else {
                    d.minute(0);
                    g /= 60;

                    if (g <= 24) {
                        // days
                        x = d.hour();
                        d.hour(x - (x % g));
                    } else {
                        d.hour(0);
                        g /= 24;

                        if (g === 7) {
                            // one week
                            d.startOf('week');
                        }
                    }
                }
            }
            start = d.valueOf();

            let startOffsetMin = moment(start)
                .tz(this.timezone ? this.timezone : moment.tz.guess())
                .utcOffset();
            const checkDst = spacing >= this.SHORT_SPACINGS[GraphConstant.TWO_HOURLY];
            for (t = start; t <= end; t += spacing) {
                let d = moment(t).tz(this.timezone ? this.timezone : moment.tz.guess());
                // console.info(checkDst , d.utcOffset() , startOffsetMin);
                if (checkDst && d.utcOffset() != startOffsetMin) {
                    const deltaMin = -(d.utcOffset() - startOffsetMin);
                    t += deltaMin * 60 * 1000;
                    d = moment(t).tz(this.timezone ? this.timezone : moment.tz.guess());
                    startOffsetMin = d.utcOffset();

                    // Check whether we've backed into the previous timezone again.
                    // This can happen during a "day light" transition. In this case,
                    // it's best to skip this tick altogether (we may be shooting for a
                    // non-existent time like the 2AM that's skipped) and go to the next
                    // one.

                    if (
                        moment(t + spacing)
                            .tz(this.timezone ? this.timezone : moment.tz.guess())
                            .utcOffset() !== startOffsetMin
                    ) {
                        t += spacing;
                        d = moment(t).tz(this.timezone ? this.timezone : moment.tz.guess());
                        startOffsetMin = d.utcOffset();
                    }
                }

                ticks.push({
                    v: t,
                    label: formatter(d, granularity, opts, dygraph),
                });
            }
        } else {
            // Display a tick mark on the first of a set of months of each year.
            // Years get a tick mark iff y % yearMod == 0. This is useful for
            // displaying a tick mark once every 10 years, say, on long time scales.
            let months: number[] = [];
            let yearMod = 1; // e.g. to only print one point every 10 years.
            if (granularity === GraphConstant.MONTHLY) {
                months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            } else if (granularity === GraphConstant.QUARTERLY) {
                months = [0, 3, 6, 9];
            } else if (granularity === GraphConstant.BIANNUAL) {
                months = [0, 6];
            } else if (granularity === GraphConstant.ANNUAL) {
                months = [0];
            } else if (granularity === GraphConstant.DECADAL) {
                months = [0];
                yearMod = 10;
            } else if (granularity === GraphConstant.CENTENNIAL) {
                months = [0];
                yearMod = 100;
            } else {
                console.warn('Span of dates is too long');
            }

            const startYear = moment(start)
                .tz(this.timezone ? this.timezone : moment.tz.guess())
                .year();
            const endYear = moment(end)
                .tz(this.timezone ? this.timezone : moment.tz.guess())
                .year();
            for (let i = startYear; i <= endYear; i++) {
                if (i % yearMod !== 0) continue;
                for (let j = 0; j < months.length; j++) {
                    const dt = moment.tz(new Date(i, months[j], 1), this.timezone ? this.timezone : moment.tz.guess());
                    dt.year(i);
                    t = dt.valueOf();
                    if (t < start || t > end) continue;
                    ticks.push({
                        v: t,
                        label: formatter(moment(t).tz(this.timezone ? this.timezone : moment.tz.guess()), granularity, opts, dygraph),
                    });
                }
            }
        }

        return ticks;
    };

    DateTickerTZ = (a: any, b: any, pixels: any, opts: any, dygraph: Dygraph, vals: any): Array<any> => {
        const granularity = this.pickDateTickGranularity(a, b, pixels, opts);
        if (granularity >= 0) {
            return this.getDateAxis(a, b, granularity, opts, dygraph); // use own function here
        } else {
            // this can happen if self.width_ is zero.
            return [];
        }
    };

    /**
     *
     * legend formatter for multiple series
     * @param {any} data  this data comes from graph
     *
     * @memberof Formatters
     */
    legendForAllSeries = (data: any) => {
        const g = data.dygraph;
        if (g.getOption('showLabelsOnHighlight') !== true) return '';

        if (data.x == null) {
            // This happens when there's no selection and {legend: 'always'} is set.
            return (
                '<br>' +
                data.series
                    .map(function (series: any) {
                        return series.dashHTML + ' ' + series.labelHTML;
                    })
                    .join('<br>')
            );
        }
        let html = moment.tz(data.x, this.timezone ? this.timezone : moment.tz.guess()).format(this.dateformat ? this.dateformat : 'lll z');
        data.series.forEach(function (series: any) {
            if (!series.isVisible || series.label.indexOf('_markline') != -1) return;
            let labeledData = series.labelHTML + ': ' + (series.yHTML ? series.yHTML : '');
            if (series.isHighlighted) {
                labeledData = '<b style="color:' + series.color + ';">' + labeledData + '</b>';
            }
            html += '<br>' + series.dashHTML + ' ' + labeledData;
        });
        return html;
    };

    /**
     *
     * legend formatter for single series
     * @param {any} data  this data comes from graph
     *
     * @memberof Formatters
     */
    legendForSingleSeries = (data: any): string => {
        const g = data.dygraph;
        if (g.getOption('showLabelsOnHighlight') !== true) return '';

        if (data.x == null) {
            // This happens when there's no selection and {legend: 'always'} is set.
            return (
                '<br>' +
                data.series
                    .map(function (series: any) {
                        return series.dashHTML + ' ' + series.labelHTML;
                    })
                    .join('<br>')
            );
        }

        let html = moment.tz(data.x, this.timezone ? this.timezone : moment.tz.guess()).format(this.dateformat ? this.dateformat : 'lll z');

        data.series.forEach(function (series: any) {
            if (!series.isVisible || series.label.indexOf('_markline') != -1) return;
            let labeledData = series.labelHTML + ': ' + (series.yHTML ? series.yHTML : '');
            if (series.isHighlighted) {
                labeledData = '<b style="color:' + series.color + ';">' + labeledData + '</b>';
                html += '<br>' + series.dashHTML + ' ' + labeledData;
            }
        });
        return html;
    };

    /**
     *formatter for axis label
     * @param {number|date} d
     * @param {number} granularity
     * @param {function} opts
     * @param {Dygraph} dygraph
     * @returns {string}
     * @memberof Formatters
     */
    axisLabel = (d: number | Date, granularity: number, opts?: (name: string) => any, dygraph?: Dygraph): any => {
        // don't put it into formatters.ts becault we need to timezone later
        let momentDatetime;

        if (d instanceof Date) {
            momentDatetime = moment.tz(d.getTime(), this.timezone ? this.timezone : moment.tz.guess());
        } else {
            momentDatetime = moment.tz(d, this.timezone ? this.timezone : moment.tz.guess());
        }
        const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const zeropad = (x: number): string => {
            if (x < 10) return '0' + x;
            else return '' + x;
        };

        const hmsString_ = (hh: number, mm: number, ss: number): string => {
            let ret = zeropad(hh) + ':' + zeropad(mm);
            if (ss) {
                ret += ':' + zeropad(ss);
            }
            return ret;
        };

        if (granularity >= Dygraph.DECADAL) {
            return '' + momentDatetime.year();
        } else if (granularity >= Dygraph.MONTHLY) {
            return SHORT_MONTH_NAMES[momentDatetime.month()] + '&#160;' + momentDatetime.year();
        } else {
            const frac = momentDatetime.hours() * 3600 + momentDatetime.minutes() * 60 + momentDatetime.seconds() + 1e-3 * momentDatetime.milliseconds();
            if (frac === 0 || granularity >= Dygraph.DAILY) {
                // e.g. '21 Jan' (%d%b)
                return zeropad(momentDatetime.date()) + '&#160;' + SHORT_MONTH_NAMES[momentDatetime.month()];
            } else {
                return hmsString_(momentDatetime.hours(), momentDatetime.minutes(), momentDatetime.seconds());
            }
        }
    };
}
