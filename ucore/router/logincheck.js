import { initPageLoader } from '../router/core.js';

const isUserLoggedIn = () => {
    return !!localStorage.getItem('authToken');
};

const redirectToLogin = () => {
    history.pushState(null, '', 'login');
    initPageLoader();
};

const loadHTMLContent = (url) => {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            document.getElementById('content').innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading HTML content:', error);
        });
};

export { isUserLoggedIn, redirectToLogin };
