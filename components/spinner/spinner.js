let spinnerEl = null;

function getSpinner() {
    if (!spinnerEl) {
        spinnerEl = document.getElementById("spinner");
    }
    return spinnerEl;
}

function show() {
    const el = getSpinner();
    if (el) el.classList.add('active');
}

function hide() {
    const el = getSpinner();
    if (el) el.classList.remove('active');
}

module.exports = {
    show,
    hide
};