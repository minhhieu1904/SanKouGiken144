let toast;
let toastIcon;
let toastTitle;

function inittoast() {
    toast = document.getElementById('toast');
    toastIcon = document.getElementById('toast-icon');
    toastTitle = document.getElementById('toast-title');
}

function success(title, innerHTML = false, duration = 3000) {
    inittoast();

    toast.style.background = '#3dc763';
    toastIcon.className = 'fa';
    toastIcon.classList.add('fa-check-circle-o');
    show(title, innerHTML, duration);
}

function warning(title, innerHTML = false, duration = 3000) {
    inittoast();

    toast.style.background = '#f59313';
    toastIcon.className = 'fa';
    toastIcon.classList.add('fa-exclamation-triangle');
    show(title, innerHTML, duration);
}

function error(title, innerHTML = false, duration = 3000) {
    inittoast();

    toast.style.background = '#ed3d3d';
    toastIcon.className = 'fa';
    toastIcon.classList.add('fa-times-circle-o');
    show(title, innerHTML, duration);

    toast.style.background = '#ed3d3d';
    toastIcon.className = 'fa';
    toastIcon.classList.add('fa-times-circle-o');
    show(title, innerHTML, duration);
}

function show(title, innerHTML = false, duration = 3000) {
    toast.style.display = 'block';
    if (innerHTML) {
        toastTitle.innerHTML = title;
    } else {
        toastTitle.innerText = title;
    }

    setTimeout(() => {
        hide();
    }, duration);
}

function hide() {
    toastTitle.innerText = '';
    toastTitle.innerHTML = '';
    toast.style.display = 'none';
}

module.exports = {
    success,
    warning,
    error,
    show,
    hide
}