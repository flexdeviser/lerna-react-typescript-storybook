/* eslint-disable @typescript-eslint/no-explicit-any */
import { GraphCollection, ViewConfig } from '../../Types';

export default class Series {
    private checkBoxDiv?: HTMLDivElement;

    private chosenCollection?: GraphCollection;

    private currentGraphData?: Array<any>;

    private labels?: string[];

    private isInit = true;

    private options: Array<HTMLInputElement>;

    constructor(public parentElement: Element, public viewConfig: ViewConfig, public g?: Dygraph, onChangeListener?: () => void) {
        this.initDom();
        this.options = [];
    }

    private initDom = (): void => {
        const dropdownContainer: HTMLDivElement = document.createElement('div');
        dropdownContainer.setAttribute('class', 'fgp-series-dropdown');

        const multiSelectDiv = document.createElement('div');
        multiSelectDiv.setAttribute('class', 'graph-series-multi-select');

        //------------ select -----------------//
        const selectBoxDiv = document.createElement('div');
        selectBoxDiv.setAttribute('class', 'select-box');

        let expanded = false;

        selectBoxDiv.addEventListener('click', (e: MouseEvent) => {
            // show content
            if (!expanded && this.checkBoxDiv) {
                this.checkBoxDiv.style.display = 'block';
                expanded = true;
            } else if (expanded && this.checkBoxDiv) {
                this.checkBoxDiv.style.display = 'none';
                expanded = false;
            }
        });
        // create select and put it into div
        const select = document.createElement('select');
        const placeholder = document.createElement('option');
        placeholder.text = 'series';
        select.add(placeholder);
        selectBoxDiv.appendChild(select);
        // over select
        const overSelect = document.createElement('div');
        overSelect.setAttribute('class', 'over-select');
        selectBoxDiv.append(overSelect);
        multiSelectDiv.appendChild(selectBoxDiv);

        //------------ options -----------------//
        const checkboxDiv = (this.checkBoxDiv = document.createElement('div'));
        checkboxDiv.setAttribute('class', 'graph-series-checkboxes');
        multiSelectDiv.append(checkboxDiv);
        dropdownContainer.appendChild(multiSelectDiv);
        this.parentElement.appendChild(dropdownContainer);
    };

    private selectNDeselect = (series: string, checked: boolean, all: HTMLInputElement | undefined): void => {
        const visibility = this.g?.getOption('visibility');
        const labels = this.g?.getLabels();

        if (all) {
            //
            if ('all' === series) {
                all.checked = true;
                // select all
                if (visibility && labels) {
                    //
                    labels.forEach((label: string, index: number) => {
                        if (label != 'x') {
                            visibility[index - 1] = true;
                            const options = this.options;
                            options[index - 1].checked = true;
                        }
                    });
                    // update graph
                    this.g?.updateOptions({
                        visibility: visibility,
                    });
                }
            } else {
                // no deselect all
                if (visibility && labels) {
                    let fullChecked = true;
                    //
                    labels.forEach((label: string, index: number) => {
                        if (label == series) {
                            visibility[index - 1] = checked;
                        }
                    });
                    visibility.map((v: boolean) => {
                        if (!v) {
                            fullChecked = false;
                        }
                    });
                    all.checked = fullChecked;
                    // update graph
                    this.g?.updateOptions({
                        visibility: visibility,
                    });
                }
            }
        } else {
            if (visibility && labels) {
                //
                labels.forEach((label: string, index: number) => {
                    if (label == series) {
                        visibility[index - 1] = checked;
                    }
                });
                // update graph
                this.g?.updateOptions({
                    visibility: visibility,
                });
            }
        }
    };

    /**
     * create options
     * @param parentElement
     */
    private createOptions = (viewConfig: ViewConfig, parentElement?: Element): void => {
        this.options = [];
        // device view or scatter view ?
        if (viewConfig.graphConfig.entities.length > 1 && parentElement) {
            parentElement.innerHTML = '';
            // add select all
            const option = document.createElement('label');
            const allCheckbox = document.createElement('input');
            allCheckbox.type = 'checkbox';
            allCheckbox.checked = true;
            allCheckbox.addEventListener('click', () => {
                this.selectNDeselect('all', allCheckbox.checked, allCheckbox);
            });
            option.append(allCheckbox);
            option.append('All');
            parentElement.append(option);

            // scatter view
            viewConfig.graphConfig.entities.forEach((_child) => {
                if (!_child.fragment) {
                    const option = document.createElement('label');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    // find out if data column all null or NaN
                    let hasData = false;
                    this.labels?.forEach((label, index) => {
                        if (label === _child.name) {
                            // 2. check data
                            this.currentGraphData?.forEach((_data) => {
                                //
                                if (_data[index + 1] !== null && !isNaN(_data[index + 1])) {
                                    hasData = true;
                                }
                            });
                        }
                    });
                    checkbox.checked = hasData;
                    if (!hasData) {
                        option.style.pointerEvents = 'none';
                    } else {
                        checkbox.addEventListener('click', () => {
                            this.selectNDeselect(_child.name, checkbox.checked, allCheckbox);
                        });
                    }

                    option.append(checkbox);
                    option.append(`${_child.name}`);
                    this.options.push(checkbox);
                    parentElement.append(option);
                }
            });
        } else if (viewConfig.graphConfig.entities.length === 1 && parentElement) {
            // device view
            parentElement.innerHTML = '';
            if (this.chosenCollection) {
                //

                this.chosenCollection.series.forEach((_series) => {
                    const option = document.createElement('label');
                    console.log(`${_series.visibility}`);
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    // find out if data column all null or NaN
                    let hasData = false;
                    this.labels?.forEach((label, index) => {
                        if (label === _series.label) {
                            // 2. check data
                            this.currentGraphData?.forEach((_data) => {
                                //
                                if (_data[index + 1] !== null && !isNaN(_data[index + 1])) {
                                    hasData = true;
                                }
                            });
                        }
                    });

                    checkbox.checked = !(_series.visibility !== undefined && !_series.visibility);

                    if (checkbox.checked && !hasData) {
                        checkbox.checked = hasData;
                    }

                    if (!hasData) {
                        option.style.pointerEvents = 'none';
                    } else {
                        checkbox.addEventListener('click', () => {
                            this.selectNDeselect(_series.label, checkbox.checked, undefined);
                        });
                    }
                    option.append(checkbox);
                    option.append(`${_series.label}`);
                    this.options.push(checkbox);
                    parentElement.append(option);
                });
            }
        }
    };

    public setData = (data: any, labels: string[], collection: GraphCollection): void => {
        this.chosenCollection = collection;
        this.currentGraphData = data;
        this.labels = labels;
        // update options ups to labels and data
        this.createOptions(this.viewConfig, this.checkBoxDiv);
    };

    /**
     * update dropdown selection
     * @param checked
     * @param index
     */
    public updateOption = (checked: boolean, index: number): void => {
        console.log(`${checked} ${index} ${this.options[index]}`);
        if (this.options[index]) {
            this.options[index].checked = checked;
        }
    };
}
