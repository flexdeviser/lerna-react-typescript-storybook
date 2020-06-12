import { ViewConfig } from '../../Types';

export default class View {
    constructor(public parentElement: Element, public viewConfigs: Array<ViewConfig>, public viewChangeListener: (view: ViewConfig) => void) {
        this.initDom();
    }

    private initDom = (): void => {
        // dropdown container
        const dropdownContainer: HTMLDivElement = document.createElement('div');
        dropdownContainer.setAttribute('class', 'fgp-views-dropdown');

        // create select
        const select = document.createElement('select');

        // create options
        this.viewConfigs.forEach((config) => {
            const option = document.createElement('option');
            option.text = config.name;
            option.value = config.name;
            option.selected = config.show;
            select.add(option);
        });

        select.addEventListener('change', (e: Event) => {
            this.viewConfigs.map((_config, _index) => {
                _config.show = _index === select.selectedIndex;
            });
            // call listener
            this.viewChangeListener(this.viewConfigs[select.selectedIndex]);
        });
        dropdownContainer.appendChild(select);

        this.parentElement.appendChild(dropdownContainer);
    };
}
