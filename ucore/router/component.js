import { LOGIN, AVAILABLE_PAGES, BASE_URL, ERROR_404_PATH } from '../config/constants.js';

async function importJs(file, callback) {
    
    const existingScript = document.querySelector(`script[src="${file}"]`);
    if (existingScript) {
        existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = file;
    script.async = true;

    script.onload = () => {
        if (callback) callback();
    };

    script.onerror = () => {
        console.error(`Failed to load JS: ${file}`);
        if (callback) callback(new Error(`Failed to load: ${file}`));
    };

    const targetElement = document.getElementById('content');
    if (targetElement) {
        targetElement.innerHTML = '';
        targetElement.appendChild(script);
    } else {
        document.head.appendChild(script);
    }
}


async function handleInstallElements() {

    const installElements = document.querySelectorAll('install');

    for (const element of installElements) {
        const filePath = element.getAttribute('u-inst');
        if (filePath) {
            await importJs(filePath, () => {
                console.log(`Loaded: ${filePath}`);
                element.remove();
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', handleInstallElements);

async function importHtml(file, page = '', callback) {
    const targetElement = document.getElementById('content');
    if (!targetElement) return;

    if (page === '') {
        targetElement.innerHTML = '';
    }

    showLoading();

    try {
        const response = await fetch(file, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTML file not found: ${file}`);

        let html = await response.text();
        const tempDiv = document.createElement('div');

        html = html.replace(/{url}/g, BASE_URL);

        tempDiv.innerHTML = html;

        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        targetElement.innerHTML = page === '' 
            ? tempDiv.innerHTML 
            : targetElement.innerHTML + tempDiv.innerHTML;

        const loadScripts = async () => {
            const totalScripts = scripts.length;
            for (let i = 0; i < totalScripts; i++) {
                const oldScript = scripts[i];
                const newScript = document.createElement('script');
                if (oldScript.src) {
                    newScript.src = oldScript.src;
                    newScript.onload = () => {
                        const percent = ((i + 1) / totalScripts) * 100;
                        updateLoadingBar(percent);
                    };
                    targetElement.appendChild(newScript);
                } else {
                    newScript.textContent = oldScript.innerHTML;
                    targetElement.appendChild(newScript);
                    const percent = ((i + 1) / totalScripts) * 100;
                    updateLoadingBar(percent);
                }
            }
            if (typeof callback === 'function') callback();
        };

        await loadScripts();
        refreshUI();
    } catch (error) {
        targetElement.innerHTML = '<h1>Error loading content</h1>';
        console.error(`Error in importHtml: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function importMenu(file, callback) {
    const targetElement = document.getElementById('menu');
    if (!targetElement) return;

        targetElement.innerHTML = '';
    

    try {
        const response = await fetch(file, { cache: 'no-cache' });

        if (!response.ok) throw new Error(`HTML file not found: ${file}`);

        let html = await response.text();

        const tempDiv = document.createElement('div');

        html = html.replace(/{url}/g, BASE_URL);

        tempDiv.innerHTML = html;

        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        targetElement.innerHTML = tempDiv.innerHTML;

        const loadScript = async () => {
            for (const oldScript of scripts) {
                const newScript = document.createElement('script');
                if (oldScript.src) {
                    newScript.src = oldScript.src;
                    await new Promise(resolve => {
                        newScript.onload = resolve;
                        targetElement.appendChild(newScript);
                    });
                } else {
                    newScript.textContent = oldScript.innerHTML;
                    targetElement.appendChild(newScript);
                }
            }
            if (typeof callback === 'function') callback();
        };

        await loadScript();
        refreshUI();
    } catch (error) {
        targetElement.innerHTML = '<h1>Error loading content</h1>';
        console.error(error);
    }
}

export function install(file, page = '', callback) {  
    if(page==='menu'){
        importMenu(file, callback);
    }else{
        const ext = file.split('.').pop().toLowerCase();
        switch (ext) {
            case 'jsu':
                importJs(file, callback);
                break;
            case 'uolit':
                importHtml(file, page, callback);
                break;
            default:
                console.warn(`Unsupported file type: ${file}`);
                break;
        }
    }
}


export const handleImports = async () => {
    const elements = document.querySelectorAll('install');

    if (elements.length === 0) return;

    for (const element of elements) {
        const filePath = element.getAttribute('u-inst');
        const filePathMenu = element.getAttribute('u-menu');

        if (filePath) {
            await install(filePath, 'view');
        }

        if (filePathMenu) {
            await install(filePathMenu, 'menu');
        }
    }

    elements.forEach(element => element.remove());
};



export const replacePlaceholders = async (template, data) => {
    return template.replace(/{{\s*(\w+)\.(\w+)\s*}}/g, (match, obj, prop) => {
        return data[obj]?.[prop] || '';
    });
}

export const evaluateForIf = async () => {
    const elements = document.querySelectorAll('[u-for]');
    
    for (const element of elements) {
        const forLoop = element.getAttribute('u-for');

        const [item, arrayName] = forLoop.split(' in ');

        try {
            const array = await eval(arrayName.trim());
            const parentElement = element.parentNode;

            if (parentElement && Array.isArray(array)) {
                const template = element.outerHTML;
                parentElement.removeChild(element);
                
                const fragment = document.createDocumentFragment();
                
                for (const value of array) {
                    const newItemHTML = await replacePlaceholders(template, { [item.trim()]: value });
                    const newItemElement = document.createElement('div');
                    newItemElement.innerHTML = newItemHTML;

                    fragment.appendChild(newItemElement.firstElementChild);
                }
                
                parentElement.appendChild(fragment);
            }
        } catch (e) {
            console.error(`Error evaluating for loop: ${forLoop}`, e);
        }
    }

    const ifElements = document.querySelectorAll('[u-if]');
    for (const element of ifElements) {
        const condition = element.getAttribute('u-if');
        
        try {
            const isVisible = await eval(condition);
            if (!isVisible) {
                element.style.display = 'none';
            } else {
                element.style.display = ''; 
            }
        } catch (e) {
            console.error(`Error evaluating if condition: ${condition}`, e);
        }
    }
}

export const refreshUI = async () => {
    handleImports();
    evaluateForIf();
}

window.addEventListener('load', () => {
    document.querySelectorAll('script[import]').forEach(script => {
        script.remove();
    });
});

export function updateLoadingBar(percent) {
    document.getElementById('loading-bar').style.width = percent + '%';
}

export function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

export function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}