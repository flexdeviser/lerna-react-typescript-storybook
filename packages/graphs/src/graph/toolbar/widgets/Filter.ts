import { GraphCollection, ViewConfig, FilterType } from '../../Types';
import Series from './Series';
import { Formatters } from '../../../formatters/Formatter';
import moment from 'moment';
import { hsvToRGB } from '../../../utils/ColorUtils';

export default class Filter {
    private chosenCollection?: GraphCollection;

    private seriesWidget?: Series;

    constructor(public parentElement: Element, public viewConfig: ViewConfig, public g?: Dygraph, public lockColorListener?: (isLock: boolean) => void) {
        this.initDom();
    }

    private setVisibility = (series: Array<string>): void => {
        // set visibility
        const graphLabels: Array<string> = this.g?.getOption('labels');
        const visibility: Array<boolean> = [];
        const labels = graphLabels.filter((element, index, array) => {
            if (index !== 0) {
                visibility.push(true);
                return true;
            }
            return false;
        });

        const formatters: Formatters = new Formatters(this.viewConfig.timezone ? this.viewConfig.timezone : moment.tz.guess());
        // get current y and y2 axis scaling max and min
        const ranges: Array<Array<number>> | undefined = this.g?.yAxisRanges();

        labels.map((value, index, array) => {
            // never hide mark lines
            visibility[index] = series.includes(value) || value.indexOf('_markline') !== -1;
        });

        if (this.seriesWidget && this.chosenCollection) {
            // update visibility
            visibility.forEach((v, i) => {
                this.seriesWidget?.updateOption(v, i);
            });
        }

        if (ranges) {
            // set visibility
            this.g?.updateOptions({
                visibility: visibility,
                axes: {
                    x: {
                        axisLabelFormatter: formatters.axisLabel,
                    },
                    y: {
                        valueRange: ranges[0],
                        axisLabelWidth: 80,
                        labelsKMB: true,
                    },
                    y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                },
            });
        }
    };

    private setColors = (colors: Array<string>): void => {
        // check if length match or not
        const graphLabels = this.g?.getLabels();
        const formatters: Formatters = new Formatters(this.viewConfig.timezone ? this.viewConfig.timezone : moment.tz.guess());
        const sat = 1.0;
        const val = 0.5;
        // get current y and y2 axis scaling max and min
        const ranges: Array<Array<number>> | undefined = this.g?.yAxisRanges();
        if (graphLabels && graphLabels.length - 1 === colors.length) {
            if (this.lockColorListener) {
                this.lockColorListener(true);
            }
            if (ranges) {
                this.g?.updateOptions({
                    colors: colors,
                    axes: {
                        x: {
                            axisLabelFormatter: formatters.axisLabel,
                        },
                        y: {
                            valueRange: ranges[0],
                            axisLabelWidth: 80,
                            labelsKMB: true,
                        },
                        y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                    },
                });
            }
        } else {
            if (this.viewConfig.graphConfig.entities.length > 1) {
                if (this.lockColorListener) {
                    this.lockColorListener(false);
                }
                if (ranges) {
                    this.g?.updateOptions({
                        colors: undefined,
                        axes: {
                            x: {
                                axisLabelFormatter: formatters.axisLabel,
                            },
                            y: {
                                valueRange: ranges[0],
                                axisLabelWidth: 80,
                                labelsKMB: true,
                            },
                            y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                        },
                    });
                }
            } else {
                if (this.chosenCollection) {
                    if (this.lockColorListener) {
                        this.lockColorListener(false);
                    }

                    const defaultColors: Array<string> = [];
                    const num = this.chosenCollection.series.length;
                    this.chosenCollection.series.forEach((series, i) => {
                        const half = Math.ceil(num / 2);
                        const idx = i % 2 ? half + (i + 1) / 2 : Math.ceil((i + 1) / 2);
                        const hue = (1.0 * idx) / (1 + num);
                        const colorStr = hsvToRGB(hue, sat, val);
                        defaultColors.push(series.color ? series.color : colorStr);
                    });
                    if (ranges) {
                        this.g?.updateOptions({
                            colors: defaultColors,
                            axes: {
                                x: {
                                    axisLabelFormatter: formatters.axisLabel,
                                },
                                y: {
                                    valueRange: ranges[0],
                                    axisLabelWidth: 80,
                                    labelsKMB: true,
                                },
                                y2: ranges.length > 1 ? { valueRange: ranges[1], axisLabelWidth: 80, labelsKMB: true } : undefined,
                            },
                        });
                    }
                }
            }
        }
    };

    private initDom = (): void => {
        // 2 div buttons and dropdown
        const filterContainer: HTMLDivElement = document.createElement('div');
        filterContainer.setAttribute('class', 'fgp-filter-container');

        // check buttons
        if (this.viewConfig.graphConfig.filters && this.viewConfig.graphConfig.filters.buttons) {
            // create button area

            const buttons = document.createElement('div');
            buttons.setAttribute('class', 'fgp-filter-buttons');
            //
            this.viewConfig.graphConfig.filters.buttons.forEach((filter) => {
                const button: HTMLSpanElement = document.createElement('button');
                button.className = 'fgp-filter-button';
                button.textContent = filter.label;
                button.addEventListener('click', (event) => {
                    // call function and get series list back
                    if (!filter.type || filter.type === FilterType.HIGHLIGHT) {
                        const series = filter.func();
                        this.setVisibility(series);
                    } else if (filter.type === FilterType.COLORS) {
                        //
                        let labels: string[] = [];
                        if (this.g) {
                            labels = labels.concat(...this.g.getLabels());
                            labels = labels.slice(1);
                        }

                        const colors = filter.func(labels);
                        // update colors
                        this.setColors(colors);
                    }
                });
                // add button
                buttons.appendChild(button);
            });

            filterContainer.appendChild(buttons);
        }

        if (this.viewConfig.graphConfig.filters && this.viewConfig.graphConfig.filters.dropdown) {
            const select = document.createElement('select');
            select.setAttribute('class', 'fgp-filter-dropdown');

            this.viewConfig.graphConfig.filters.dropdown.forEach((_drop) => {
                // options
                const option = document.createElement('option');
                option.text = _drop.label;
                option.value = _drop.label;
                select.add(option);
            });

            select.addEventListener('change', (e: Event) => {
                if (this.viewConfig.graphConfig.filters && this.viewConfig.graphConfig.filters.dropdown) {
                    const _conf = this.viewConfig.graphConfig.filters.dropdown[select.selectedIndex];
                    if (!_conf.type || _conf.type === FilterType.HIGHLIGHT) {
                        const series = _conf.func();
                        // find entity
                        const finalSeries: Array<string> = [];
                        series.forEach((_series) => {
                            const entity = this.viewConfig.graphConfig.entities.find((_entity) => {
                                return _entity.id === _series;
                            });
                            // put name into series
                            if (entity) {
                                finalSeries.push(entity.name);
                            }
                        });

                        // compare then update graph
                        this.setVisibility(finalSeries);
                    } else if (_conf.type === FilterType.COLORS) {
                        let labels: string[] = [];
                        // find entity
                        const finalSeries: Array<string> = [];
                        if (this.g) {
                            labels = labels.concat(...this.g.getLabels());
                            labels = labels.slice(1);
                            // get series name

                            labels.forEach((_series) => {
                                const entity = this.viewConfig.graphConfig.entities.find((_entity) => {
                                    return _entity.id === _series;
                                });
                                // put name into series
                                if (entity) {
                                    finalSeries.push(entity.name);
                                }
                            });
                        }
                        const colors = _conf.func(finalSeries);
                        this.setColors(colors);
                    }
                }
            });

            filterContainer.appendChild(select);
        }

        this.parentElement.appendChild(filterContainer);
    };

    public setData = (collection: GraphCollection): void => {
        this.chosenCollection = collection;
    };

    public setSeriesWidget = (seriesWidget: Series): void => {
        this.seriesWidget = seriesWidget;
    };
}
