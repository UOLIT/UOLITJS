import { LOGIN, AVAILABLE_PAGES, BASE_URL, ERROR_404_PATH } from '../config/constants.js';
import { isUserLoggedIn } from './logincheck.js';
import { refreshUI, install } from './component.js';

const fileExists = async (path) => {
    try {
        const response = await fetch(path, { method: 'HEAD', cache: 'no-cache' });
        return response.ok;
    } catch (error) {
        return false;
    }
};

const loadPage = async (path) => {
    path = path || 'home';
    let pagePath = AVAILABLE_PAGES[path];

    let mainElement = LOGIN ? document.getElementById('main') : document.getElementById('content');

    // Penanganan elemen utama
    if (!mainElement) {
        return;
    } else if (isUserLoggedIn() && LOGIN) {
        mainElement = document.getElementById('content');
    } else {
        mainElement = document.getElementById('main');
    }

    try {
        if (isUserLoggedIn() && path === 'login' && LOGIN) {
            path = 'home';
            history.pushState(null, '', path);
        }

        if (!(path in AVAILABLE_PAGES) || !(await fileExists(AVAILABLE_PAGES[path]))) {
            throw new Error('Page not found');
        }

        install(pagePath);

        if (path === 'logout' && LOGIN) {
            history.pushState(null, '', 'login');
            loadPage('login');
        } else if (path === 'login' && isUserLoggedIn() && LOGIN) {
            thems();
            history.pushState(null, '', 'home');
            loadPage('home');
        }

        refreshUI();

    } catch (error) {
        try {
            const fallbackResponse = await fetch(ERROR_404_PATH, { cache: 'no-cache' });
            if (fallbackResponse.ok) {
                const fallbackHtml = await fallbackResponse.text();
                mainElement.innerHTML = fallbackHtml;
                history.replaceState(null, '', '#/404');
            } else {
                mainElement.innerHTML = '<h1>404 Not Found</h1>';
            }
        } catch (fallbackError) {
            mainElement.innerHTML = '<h1>404 Not Found</h1>';
        }
    }
};


export const initPageLoader = () => {
    document.body.addEventListener('click', (event) => {
        const link = event.target.closest('a.link');

        if (link) {
            event.preventDefault();
            let path = '#/'+link.getAttribute('href');

            if (!isUserLoggedIn() && LOGIN) {
                path = '#/login';
            }

            history.pushState(null, '', path);

            path = extractPathFromUrl(path);

            loadPage(path);
        }
    });

    window.addEventListener('popstate', () => {
        let path = extractPathFromUrl(window.location.href);
        if (!isUserLoggedIn() && LOGIN) {
            path = 'login';
        }

        loadPage(path);

    });

    var urlpath = window.location.href;
   
    let initialPath = extractPathFromUrl(urlpath);
    if (!isUserLoggedIn() && LOGIN) {
        initialPath = 'login';
    }

    loadPage(initialPath);
};

const extractPathFromUrl = (url) => {

    url = url.replace('#/','');

    try {
        if (typeof url !== 'string' || typeof BASE_URL !== 'string') {
            throw new Error('Invalid input: URL or BASE_URL is not a string');
        }

        let path = url.replace(/^https?:\/\//, '').replace(BASE_URL.replace(/^https?:\/\//, ''), '');
        
        let pathWithoutQuery = path.split('?')[0];

        let pathArray = pathWithoutQuery.split('/').filter(segment => segment !== '');

        if (pathArray.length > 0) {
            let firstSegment = pathArray[0];
            return firstSegment;
        }

        return 'home';
    } catch (error) {
        console.error('Error:', error.message);
        return 'home';
    }
};

export const thems = async () => {
    const targetElement = document.getElementById('main');

    if (!targetElement) {
        console.error('Target element not found');
        return;
    }

    try {
        const response = await fetch('src/thems.uolit', { cache: 'no-cache' });
        if (!response.ok) throw new Error('HTML file not found');

        let html = await response.text();
        
        const tempDiv = document.createElement('div');

        html = html.replace(/{url}/g, BASE_URL);

        tempDiv.innerHTML = html;

        const scripts = tempDiv.getElementsByTagName('script');
        const scriptPromises = [];

        for (let script of scripts) {
            const newScript = document.createElement('script');
            newScript.src = script.src ? script.src : '';
            newScript.textContent = script.textContent;

            if (script.src) {
                scriptPromises.push(new Promise((resolve, reject) => {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    document.head.appendChild(newScript);
                }));
            } else {
                document.head.appendChild(newScript);
            }
        }

        targetElement.innerHTML = tempDiv.innerHTML;

        await Promise.all(scriptPromises);

        initPageLoader();

    } catch (error) {
        console.error(error);
    }
};

window.redirect = (url = '') => {
    if (url) {
        let path = url;
        if (!isUserLoggedIn() && LOGIN) {
            path = '#/login';
        }

        history.pushState(null, '', path);

        path = extractPathFromUrl(path);

        loadPage(path);
    }
}