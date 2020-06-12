import { ViewConfig } from '../../Types';

export default class Extra {
  constructor(public parentElement: Element, public viewConfig: ViewConfig) {
    this.initDom();
  }

  private initDom = (): void => {
    const extra = document.createElement('div');
    extra.setAttribute('class', 'fgp-toolbar-area');

    const toolbarConfig = this.viewConfig.graphConfig.features.toolbar;

    if (toolbarConfig) {
      // buttons
      if (toolbarConfig.buttons) {
        // add div first
        const buttonContainer = document.createElement('div');
        buttonContainer.setAttribute('class', 'fgp-extra-buttons');

        toolbarConfig.buttons.forEach((btn) => {
          //
          const button: HTMLSpanElement = document.createElement('button');
          button.className = 'fgp-toolbar-button';
          button.textContent = btn.label;
          button.addEventListener('click', (event) => {
            //
            btn.func(btn.prop);
          });
          buttonContainer.appendChild(button);
        });

        extra.appendChild(buttonContainer);
      }

      // drops
      if (toolbarConfig.dropdown) {
        toolbarConfig.dropdown.forEach((dropdown) => {
          const drop = document.createElement('select');
          drop.setAttribute('class', 'fgp-toolbar-dropdown');
          // options
          dropdown.forEach((_config) => {
            const option = document.createElement('option');
            option.text = _config.label;
            drop.append(option);
          });
          drop.addEventListener('change', (e: Event) => {
            //
            dropdown.forEach((_config) => {
              if (_config.label === drop.value) {
                _config.func(_config.prop);
              }
            });
          });

          extra.appendChild(drop);
        });
      }
    }

    this.parentElement.appendChild(extra);
  };
}
