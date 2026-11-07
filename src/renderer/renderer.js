'use strict';

document.getElementById('btn-min').addEventListener('click', () => window.hub.minimize());
document.getElementById('btn-max').addEventListener('click', () => window.hub.toggleMaximize());
document.getElementById('btn-close').addEventListener('click', () => window.hub.close());
