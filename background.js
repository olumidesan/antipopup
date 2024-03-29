import {
	LS,
	closeTab,
	queryTabs,
	formatUrl,
	getTabDetails,
	URL_CACHE_KEY,
	SITES_CACHE_KEY,
	DUPLICATION_FLAG_KEY,
	CONTEXT_MENU_FLAG_KEY,
	PARENT_TAB_DETAILS_KEY,
} from "./utils.js";


const humanMinDuration = 1900 //ms
const contextMenuItem = {
	"id": "newTabContextMenu",
	"title": "Purposely open in a new tab",
	"contexts": ["link"],
}


// Compares the current and parent tab
// and returns if the tab should be removed
async function isTabGuilty(destinationUrl, parentUrl) {

	// Destination and parent urls cannot be null or empty strings
	if (!destinationUrl || !parentUrl || destinationUrl === '') {
		return false
	}

	let isGuilty = false;

	// Get list of user-added guilty sites
	let allGuiltySites = await LS.getItem(SITES_CACHE_KEY);

	// Exclude Chrome Tabs. This checks the current tab's url to see if it's guilty
	if (!destinationUrl.toLowerCase().startsWith('chrome')) {

		// Format to just protocol + hostname
		let parentHostUrl = formatUrl(parentUrl);

		if (allGuiltySites // Not empty or undefined
			&&
			(allGuiltySites.indexOf(parentHostUrl) >= 0) // Url is in guilty list
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

	let currentTabDetails = await getTabDetails(tabId)
	let parentTabDetails = await getTabDetails(parentTabId)

	let parentUrl = parentTabDetails.url;
	
	// If the pendingUrl has not been set yet, use url
	let destinationUrl = currentTabDetails.pendingUrl;
	if (!destinationUrl) destinationUrl = currentTabDetails.url;

	// Cache the key to storage
	LS.setItem(URL_CACHE_KEY, parentUrl);
	LS.setItem(PARENT_TAB_DETAILS_KEY, parentTabDetails)

	// Close guilty tab
	let shouldCloseCurrentTab = await isTabGuilty(destinationUrl, parentUrl)
	if (shouldCloseCurrentTab) await closeTab(tabId);

	// Tab Duplication?
	// Common with websites that open the current page 
	// in a new tab and open an ad in the current tab
	if (formatUrl(destinationUrl) === formatUrl(parentUrl)) {
		await LS.setItem(DUPLICATION_FLAG_KEY, {
			tabId: tabId,
			isDuplicate: true,
			timeStamp: Date.now(),
			destination: destinationUrl,
		})
	}
}

// Handler for when a new window is created
async function onWindowCreatedListener(tab) {

	// The window of the tab that created the [new-window] popup
	let originalWindowId = chrome.windows.WINDOW_ID_CURRENT;

	// Properties of a typical popup window. it's active and alone
	let popupOptions = { windowType: "popup", active: true, index: 0 };

	// Get all popup tabs
	let popupTabs = await queryTabs(popupOptions);
	if (popupTabs.length === 0) return

	// Take the most recently opened
	let popupTab = popupTabs[popupTabs.length - 1];

	// Get popup url
	let popupUrl = popupTab.pendingUrl;
	if (!popupUrl) popupUrl = popupTab.url;

	// Get the windowId of the popup
	let popupWindowId = popupTab.windowId;

	// Get original tab's parent url
	let parentUrl = await LS.getItem(URL_CACHE_KEY)

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
		let duplicateTab = await LS.getItem(DUPLICATION_FLAG_KEY);

		if (duplicateTab && duplicateTab.timeStamp) {

			// Human cloning of a tab would be more than humanMinDuration
			let automatedTransition = (Date.now() - duplicateTab.timeStamp) < humanMinDuration ? true : false;

			let parentUrl = parentTabDetails.url;
			let tabIsGuilty = await isTabGuilty(tab.url, parentUrl);

			// If a duplication has been detected
			if (duplicateTab.isDuplicate && tabIsGuilty && automatedTransition) {

				// Delete now ad tab
				// await closeTab(tab.id);

				// OR

				// Remove duplicate and revert original to intended
				chrome.tabs.remove(duplicateTab.tabId, async () => {					
					await isTabGuilty(tab.url, parentUrl); // Delay

					// Force redirect by repeating. Some sites are stubborn
					chrome.tabs.update(tab.id, { url: duplicateTab.destination });
					chrome.tabs.update(tab.id, { url: duplicateTab.destination });
				})
			}

			// Reset
			LS.setItem(DUPLICATION_FLAG_KEY, {
				tabId: null,
				timeStamp: null,
				destination: null,
				isDuplicate: false,
			});
		}
	}
}



// --------
// Register Listeners

chrome.contextMenus.removeAll(function () {
	chrome.contextMenus.create(contextMenuItem);
});

// Listener for context-menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
	LS.setItem(CONTEXT_MENU_FLAG_KEY, true);
	chrome.tabs.create({ url: info.linkUrl });
});

// Listener for new tab popups
chrome.tabs.query({ active: true, currentWindow: true }, () => {
	chrome.tabs.onCreated.addListener((tab) => onTabCreatedListener(tab))
});

// Listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	onTabUpdatedListener(tabId, changeInfo, tab)
})

// Listener for window popups
chrome.tabs.onCreated.addListener((tab) => {
	onWindowCreatedListener(tab);
});