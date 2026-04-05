class Toast extends HTMLElement {
    connectedCallback() {
        fetch('./components/toast/toast.html')
            .then(res => res.text())
            .then(html => {
                this.innerHTML = html;
            });
    }
}

if (!customElements.get('my-toast')) {
    customElements.define('my-toast', Toast);
}

class Spinner extends HTMLElement {
    connectedCallback() {
        fetch('./components/spinner/spinner.html')
            .then(res => res.text())
            .then(html => {
                this.innerHTML = html;
            });
    }
}

if (!customElements.get('my-spinner')) {
    customElements.define('my-spinner', Spinner);
}