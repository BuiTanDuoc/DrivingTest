// jsdom thiếu một số API trình duyệt mà app dùng.
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
Element.prototype.scrollIntoView = () => {};
