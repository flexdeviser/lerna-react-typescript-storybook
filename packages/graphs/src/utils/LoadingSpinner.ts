export class LoadingSpinner {
    private spinner: HTMLElement;

    private spinnerHtml = `
            <svg width="16px" height="12px">
                <polyline id="back" points="1 6 4 6 6 11 10 1 12 6 15 6"></polyline>
                <polyline id="front" points="1 6 4 6 6 11 10 1 12 6 15 6"></polyline>
            </svg>
        `;
    public isLoading = false;

    constructor(public container: HTMLElement) {
        this.spinner = document.createElement('div');
        this.spinner.setAttribute('class', 'indicator');
        this.spinner.innerHTML = this.spinnerHtml;
    }

    public show(): void {
        // add into parent
        this.container.appendChild(this.spinner);
        this.isLoading = true;
    }

    public done(): void {
        this.container.removeChild(this.spinner);
        this.isLoading = false;
    }
}
