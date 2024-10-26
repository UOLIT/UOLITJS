import { LOGIN, AVAILABLE_PAGES, BASE_URL, ERROR_404_PATH } from '../config/constants.js';

async function handleInstallElements() {

    const installElements = document.querySelectorAll('install');

    for (const element of installElements) {
        const filePath = element.getAttribute('u-inst');
        if (filePath) {
            await importJs(filePath, () => {
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
        const response = await fetch(file+'?v='+Math.random(), { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTML file not found: ${file}`);

        let html = await response.text();
        const tempDiv = document.createElement('div');
        html = html.replace(/{url}/g, BASE_URL);
        tempDiv.innerHTML = html;

        const elements = tempDiv.querySelectorAll('install');
        for (const element of elements) {
            const filePath = element.getAttribute('u-inst');
            const ext = filePath.split('.').pop().toLowerCase();

            if (ext === 'jsu') {
                await loadJsFile(filePath);
                element.remove();
            }
        }

        const scripts = tempDiv.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        targetElement.innerHTML = page === '' 
            ? tempDiv.innerHTML 
            : targetElement.innerHTML + tempDiv.innerHTML;

        await loadScriptsSequentially(scripts, targetElement);

        if (typeof callback === 'function') callback();
        refreshUI();
    } catch (error) {
        targetElement.innerHTML = '<h1>Error loading content</h1>';
        console.error(`Error in importHtml: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function loadJsFile(filePath) {
    let loadedScripts = JSON.parse(localStorage.getItem('load_js')) || [];

    if (loadedScripts.includes(filePath)) {
        return;
    }

    loadedScripts.push(filePath);
    localStorage.setItem('load_js', JSON.stringify(loadedScripts));

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = filePath + '?v=' + Math.random();

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${filePath}`));
        
        document.getElementById('content').appendChild(script);
    });
}


async function loadScriptsSequentially(scripts, targetElement) {
    for (let i = 0; i < scripts.length; i++) {
        const oldScript = scripts[i];
        const newScript = document.createElement('script');

        if (oldScript.src) {
            newScript.src = oldScript.src;
            newScript.onload = () => updateLoadingBar(((i + 1) / scripts.length) * 100);
        } else {
            newScript.textContent = oldScript.innerHTML;
        }

        targetElement.appendChild(newScript);
        await new Promise(resolve => newScript.onload = resolve);
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
    }
}

export function install(file, page = '', callback) {  
    if(page==='menu'){
        importMenu(file, callback);
    }else{
        const ext = file.split('.').pop().toLowerCase();
        switch (ext) {
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

export const displayDynamicData = async () => {
    const dataElements = document.querySelectorAll('[u-get]');

    dataElements.forEach(element => {
        const key = element.getAttribute('u-get')?.trim();

        if (key) {
            const value = getData(key);
            if (value !== null) {
                element.innerText = value;
            }
        }
    });
};

export const refreshUI = async () => {
    handleImports();
    evaluateForIf();
    displayDynamicData();
}

clearAllLoadedScripts();

function clearAllLoadedScripts() {
    localStorage.removeItem('load_js');
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