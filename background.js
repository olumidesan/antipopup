
import {
	LS,
	queryTabs, 
	formatUrl,
	getTabDetails, 
	URL_CACHE_KEY,
	SITES_CACHE_KEY, 
	DUPLICATION_FLAG_KEY,
	CONTEXT_MENU_FLAG_KEY,
	PARENT_TAB_DETAILS_KEY,
} from "./utils.js";


const contextMenuItem = {
	"id": "newTabContextMenu",
	"title": "Purposely open in a new tab",
	"contexts": ["link"],
}


// Compares the current and parent tab
// and returns if the tab should be removed
async function isTabGuilty(destinationUrl, parentUrl) {
	let isGuilty = false;

	// Get list of user-added guilty sites
	let all_guilty_sites = await LS.getItem(SITES_CACHE_KEY);

	// Exclude Chrome Tabs. This checks the current tab's url to see if it's guilty
	if (!(destinationUrl && destinationUrl.toLowerCase().startsWith('chrome'))) {

		// Format to just protocol + hostname
		let parentHostUrl = formatUrl(parentUrl);

		if (all_guilty_sites // Not empty or undefined
			&&
			(all_guilty_sites.indexOf(parentHostUrl) >= 0) // Url is in guilty list
			&&
			(!(destinationUrl.startsWith(parentHostUrl))) // Destination has a different hostname
		) {
			isGuilty = true;
		}
	}

	return isGuilty;
}

// Handler for when a new tab is created
async function onTabCreatedListener(tab) {

	// Allow tabs created from context menus
	let fromContextMenu = await LS.getItem(CONTEXT_MENU_FLAG_KEY);
	if (fromContextMenu) {		
		LS.setItem(CONTEXT_MENU_FLAG_KEY, false); // Reset
		return
	}

	let tabId = tab.id;
	let parentTabId = tab.openerTabId;

	// Shortcut 
	if (!parentTabId) return

	let parentTabDetails = await getTabDetails(parentTabId)
	let currentTabDetails = await getTabDetails(tabId)
	let tabDuplication = false

	let parentUrl = parentTabDetails.url;
	let destinationUrl = currentTabDetails.pendingUrl;

	// Cache the key to storage
	LS.setItem(URL_CACHE_KEY, parentUrl);
	LS.setItem(PARENT_TAB_DETAILS_KEY, parentTabDetails)
	
	// If the pendingUrl has not been set yet, use url
	if (!destinationUrl) destinationUrl = currentTabDetails.url;
	let shouldCloseCurrentTab = await isTabGuilty(destinationUrl, parentUrl)
	
	if (shouldCloseCurrentTab) chrome.tabs.remove(tabId);
	
	// Tab Duplication?
	// Common with websites that open the current page in a new tab 
	// and open an ad in the current tab
	if (destinationUrl === parentUrl) {
		tabDuplication = true;
		LS.setItem(DUPLICATION_FLAG_KEY, true)
	}
}

// Handler for when a new window is created
async function onWindowCreatedListener(tab) {

	// The window of the tab that created the [new-window] popup
	let originalWindowId = chrome.windows.WINDOW_ID_CURRENT;

	// Properties of a typical popup window. it's active and alone
	let popupOptions = { windowType: "popup", active: true, index: 0 };

	let parentUrl = await LS.getItem(URL_CACHE_KEY)

	// Get all popup tabs
	let popupTabs = await queryTabs(popupOptions);
	if (popupTabs.length === 0) return

	// Take the first
	let popupTab = popupTabs[0];

	// Get the windowId of the popup
	let popupWindowId = popupTab.windowId;

	// Get popup url
	let popupUrl = popupTab.pendingUrl;
	if (!popupUrl) popupUrl = popupTab.url;

	if (
		(originalWindowId !== popupWindowId) // Window is entirely a new popup
		&&
		(await isTabGuilty(popupUrl, parentUrl)) // The popup is not with same hostname
	) {
		chrome.tabs.remove(popupTab.id)
	}
}

async function onTabUpdatedListener(tabId, changeInfo, tab) {
	let parentTabDetails = await LS.getItem(PARENT_TAB_DETAILS_KEY)
	if (!parentTabDetails) return

	// If the updated tab == the parent tab
	if (tab.id === parentTabDetails.id) {
		let tabDuplication = await LS.getItem(DUPLICATION_FLAG_KEY);
		let tabIsGuilty = await isTabGuilty(tab.url, parentTabDetails.url);

		// Compare their urls and update if the parent changed
		if (tabIsGuilty && tabDuplication) {
			chrome.tabs.remove(parentTabDetails.id) // Remove duplicate
			chrome.tabs.update(tab.id, { url: parentTabDetails.url }); // Revert original
		}
	}

	// Reset
	LS.setItem(DUPLICATION_FLAG_KEY, false);
}


// --------
// Register Listeners


chrome.contextMenus.removeAll(function () {
	chrome.contextMenus.create(contextMenuItem);
});

chrome.contextMenus.onClicked.addListener( (info, tab) => {
	LS.setItem(CONTEXT_MENU_FLAG_KEY, true);
	chrome.tabs.create({ url: info.linkUrl });
});


// Listener for new tab popups
chrome.tabs.query({ active: true, currentWindow: true }, () => {
	chrome.tabs.onCreated.addListener((tab) => onTabCreatedListener(tab))
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	onTabUpdatedListener(tabId, changeInfo, tab)
})

// // Listener for window popups
chrome.tabs.onCreated.addListener((tab) => {
	onWindowCreatedListener(tab);
});