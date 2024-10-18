import { LOGIN, AVAILABLE_PAGES, BASE_URL, ERROR_404_PATH } from './ucore/config/constants.js';
import { isUserLoggedIn, redirectToLogin } from './ucore/router/logincheck.js';
import { thems } from './ucore/router/core.js';

if(!isUserLoggedIn() && LOGIN === true){
	redirectToLogin();
}else{
	thems();
}