/* eslint-disable @typescript-eslint/no-explicit-any */

import { GraphExports, GraphCollection, DomAttrs } from '../../Types';
import moment from 'moment-timezone';
import { ExportUtils } from '../../../utils/ExportUtils';
import { DomOperator as DomElementOperator } from '../../../utils/DomOperator';

export default class Exports {
    private currentGraphData?: any;

    private currentCollection?: any;

    private labels?: string[];

    private rectSelectStatus = false;

    constructor(public parentElement: Element, public config?: GraphExports[], public graphDiv?: Element, public reactSelectionListener?: (active: boolean) => void) {
        this.initDom();
    }

    public setData = (data: any, labels: string[], collection: GraphCollection): void => {
        this.currentGraphData = data;
        this.labels = labels;
        this.currentCollection = collection;
    };

    private initDom = (): void => {
        //
        const buttonsContainer: HTMLDivElement = document.createElement('div');
        buttonsContainer.setAttribute('class', 'fgp-buttons');

        this.config?.map((_config) => {
            if (_config === GraphExports.Data) {
                // create button and add it into header
                const btnAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-export-button fgp-btn-export-data' }];
                const btnData = DomElementOperator.createElement('button', btnAttrs);
                btnData.addEventListener('click', (event) => {
                    // export data
                    // check data (1 or more)
                    if (this.currentGraphData && this.currentGraphData.length > 0 && this.currentCollection) {
                        let csvStr = '';
                        // single device
                        const currentData = this.currentGraphData;
                        const currentCollection = this.currentCollection;
                        // prepare the file name
                        const _fileName = currentCollection.label + '_' + moment().toISOString() + '.csv';
                        const _columns: string[] = ['timestamp'];
                        const _series = this.labels;
                        _series?.forEach((_s, _index) => {
                            // if (_index > 0) {
                            _columns.push(_s);
                            // }
                        });
                        // add titles first
                        _columns.forEach((title, _index) => {
                            if (_index < _columns.length - 1) {
                                csvStr += title + ',';
                            } else {
                                csvStr += title + '\n';
                            }
                        });
                        // prepare data
                        if (currentData) {
                            currentData.forEach((_d: any) => {
                                _columns.forEach((title, _index) => {
                                    if (_index < _columns.length - 1) {
                                        csvStr += _d[_index] + ',';
                                    } else {
                                        csvStr += _d[_index] + '\n';
                                    }
                                });
                            });
                        }
                        ExportUtils.exportCsv(csvStr, _fileName);
                    }
                });
                buttonsContainer.appendChild(btnData);
            } else if (_config === GraphExports.Image) {
                const btnAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-export-button fgp-btn-export-image' }];
                const btnImage = DomElementOperator.createElement('button', btnAttrs);
                btnImage.addEventListener('click', (event) => {
                    const graphContainer = this.graphDiv;
                    if (graphContainer && this.currentCollection) {
                        // first one
                        ExportUtils.saveAsImage(graphContainer as HTMLElement, this.currentCollection.label + '_' + moment().toISOString() + '.png');
                    }
                });
                buttonsContainer.appendChild(btnImage);
            } else if (_config === GraphExports.Draw) {
                // add rect selection
                if (this.reactSelectionListener) {
                    const btnAttrs: Array<DomAttrs> = [{ key: 'class', value: 'fgp-export-button fgp-btn-export-draw' }];
                    const btnDraw = DomElementOperator.createElement('button', btnAttrs);
                    btnDraw.addEventListener('click', (event) => {
                        this.rectSelectStatus = !this.rectSelectStatus;

                        if (this.rectSelectStatus) {
                            btnDraw.style.backgroundColor = 'yellow';
                        } else {
                            btnDraw.style.backgroundColor = '';
                        }
                        if (this.reactSelectionListener) {
                            this.reactSelectionListener(this.rectSelectStatus);
                        }
                    });
                    buttonsContainer.appendChild(btnDraw);
                }
            }
        });

        this.parentElement.appendChild(buttonsContainer);
    };
}
