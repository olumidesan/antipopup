// Helpers

const URL_CACHE_KEY = "currentUrl";
const SITES_CACHE_KEY = "guiltySites"
const PARENT_TAB_DETAILS_KEY = "parentTab";
const DUPLICATION_FLAG_KEY = "duplicationFlag"
const CONTEXT_MENU_FLAG_KEY = "fromContextMenu"

async function getTabDetails(tabId) {
	return await chrome.tabs.get(tabId);
}

async function queryTabs(queryOptions) {
	return await chrome.tabs.query(queryOptions);
}

function formatUrl(url) {
	return (new URL(url)).protocol + "//" + (new URL(url)).hostname;
}

function stripQueryParameters(url) {
	return url.toLowerCase().split('?')[0]
}

// Proxy for Local Storage
const LS = {
	getItem: async key => (await chrome.storage.local.get(key))[key],
	setItem: (key, val) => chrome.storage.local.set({ [key]: val }),
};


export {stripQueryParameters}
export {getTabDetails}
export {queryTabs}
export {formatUrl}
export {LS}

export {URL_CACHE_KEY }
export {SITES_CACHE_KEY }
export {DUPLICATION_FLAG_KEY}
export {CONTEXT_MENU_FLAG_KEY}
export {PARENT_TAB_DETAILS_KEY}