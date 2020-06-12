import { GraphCollection, ViewConfig } from '../../Types';
import { IntervalUtils } from '../../../utils/IntervalUtils';

export default class Intervals {
    private dateWindow: [number, number] = [0, 0];

    private dateRange: [number, number] = [0, 0];

    private readonly collection: GraphCollection[];

    private readonly options: Array<{ label: string; value: number }>;

    private dropdownOptions: Array<HTMLOptionElement>;

    constructor(
        public parentElement: Element,
        public viewConfig: ViewConfig,
        public g?: Dygraph,
        public intervalSelectionListener?: (collection: GraphCollection, dateWindow: [number, number]) => void,
    ) {
        this.collection = viewConfig.graphConfig.collections;
        this.options = [];
        this.dropdownOptions = [];
        this.initDom();
    }

    private initDom = () => {
        // dropdown container
        const dropdownContainer: HTMLDivElement = document.createElement('div');
        dropdownContainer.setAttribute('class', 'fgp-intervals-dropdown');

        // create select
        const select = document.createElement('select');

        //sort

        this.viewConfig.ranges?.sort((current, next) => {
            return next.value - current.value;
        });
        //
        if (this.viewConfig.ranges) {
            this.viewConfig.ranges.forEach((_range) => {
                const option = document.createElement('option');
                option.text = _range.name;
                option.value = _range.value.toString();
                option.selected = !!_range.show;
                select.add(option);
                this.dropdownOptions.push(option);
                this.options.push({ label: _range.name, value: _range.value });
            });
            //
        }

        select.addEventListener('change', (e: Event) => {
            // get config
            const chosenInterval = this.viewConfig.ranges ? this.viewConfig.ranges[select.selectedIndex] : null;

            if (chosenInterval && this.dateWindow) {
                // get the middle timestamp of current timeWindow.
                const middleDatetime = this.dateWindow[0] + (this.dateWindow[1] - this.dateWindow[0]) / 2;
                const halfConfigRequire = chosenInterval.value / 2;
                let start = middleDatetime - halfConfigRequire > this.dateRange[0] ? middleDatetime - halfConfigRequire : this.dateRange[0];
                let end = middleDatetime + halfConfigRequire > this.dateRange[1] ? this.dateRange[1] : middleDatetime + halfConfigRequire;
                // fix 2 sides problem
                if (middleDatetime + halfConfigRequire > this.dateRange[1]) {
                    end = this.dateRange[1];
                    start = end - chosenInterval.value;
                    if (start < this.dateRange[0]) {
                        start = this.dateRange[0];
                    }
                } else if (middleDatetime - halfConfigRequire < this.dateRange[0]) {
                    start = this.dateRange[0];
                    end = start + chosenInterval.value;
                    if (end > this.dateRange[1]) {
                        end = this.dateRange[1];
                    }
                }
                const potentialDateWindow: [number, number] = [start, end];
                // find collection base on new date window
                const chosenCollection = IntervalUtils.findBestCollection(this.collection, potentialDateWindow);

                if (this.intervalSelectionListener && chosenCollection) {
                    this.intervalSelectionListener(chosenCollection, potentialDateWindow);
                }
            }
        });

        dropdownContainer.appendChild(select);
        // add container to header
        this.parentElement.appendChild(dropdownContainer);
    };

    public setDateWindow = (dateWindow: Array<number>, dateRange: Array<number>): void => {
        // check if different
        if (this.dateWindow[0] !== dateWindow[0] || this.dateWindow[1] !== dateWindow[1]) {
            this.dateWindow = [dateWindow[0], dateWindow[1]];
        }

        if (this.dateRange[0] !== dateRange[0] || this.dateRange[1] !== dateRange[1]) {
            this.dateRange = [dateRange[0], dateRange[1]];
        }
    };
}
