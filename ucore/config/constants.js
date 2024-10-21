const TOKEN = '';
const LOGIN = false;
const AVAILABLE_PAGES = {
    home: 'src/controller/home.uolit',
    sample: 'src/controller/sample.uolit',
    get: 'src/controller/get.uolit',
};
const BASE_URL = 'https://localhost:90/uolitjs/';
const BASE_PATH = 'src/controller/';
const ERROR_404_PATH = 'src/error/404.uolit';

window.TOKEN = TOKEN;
window.LOGIN = LOGIN;
window.AVAILABLE_PAGES = AVAILABLE_PAGES;
window.BASE_URL = BASE_URL;
window.BASE_PATH = BASE_PATH;
window.ERROR_404_PATH = ERROR_404_PATH;

export { LOGIN, AVAILABLE_PAGES, BASE_URL, BASE_PATH, ERROR_404_PATH };
