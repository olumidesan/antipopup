
let context_menu_link,
	from_context_menu,
    new_tab_url,
    removed_tab_id,
    parentURL,
	parentTabURL,
	tab_duplication,
    all_guilty_sites;
let new_tabs = new Array();
let contextMenuItem = {
    "title": "Purposely open in a new tab",
    "contexts": ["link"],
    "onclick": function (info, tab) {
        chrome.tabs.create({ url: info.linkUrl });
    }
}
chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create(contextMenuItem);
});
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    let clicked_link = info.linkUrl;
    context_menu_link = clicked_link;
	from_context_menu = true;
});
chrome.storage.onChanged.addListener(function (changes, local) {
    chrome.runtime.reload();
});
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.get(['guilty_sites'], function (result) {
        all_guilty_sites = result.guilty_sites;
    });
    // Listener for new tab popups
    chrome.tabs.onCreated.addListener(function (tab) {
		if (from_context_menu) {
			return
		}
        let parent_tab_id = tab.openerTabId;
		let tab_id = tab.id;
		chrome.tabs.get(parent_tab_id, function (parent_tab) {
			let parent_tab_url = parent_tab.url;
			chrome.tabs.get(tab_id, function (tab) {
				tab_duplication = false
				let destination = tab.pendingUrl;
				console.log(parent_tab_id, parent_tab_url);
				console.log(tab_id, destination);
				// If the destination isn't a chrome tab
				if (!(destination.startsWith('chrome'))) {
					// Tab Duplication?
					// Common with websites that open the current page in a new tab 
					// and open an ad in the current tab
					if (destination === parent_tab_url) {
						tab_duplication = true;
					}			
					// Format the parent_url for comparison
					let parent_url = (new URL(parent_tab_url)).protocol + "//" + (new URL(parent_tab_url)).hostname;
					parentURL = parent_url;
					parentTabURL = parent_tab_url;
					if (
						(all_guilty_sites.indexOf(parent_url) >= 0) &&
						(!(destination.startsWith(parent_url)))
						) {
							removed_tab_id = tab.id;
							chrome.tabs.remove(tab.id);
						} 
				}
				parent_window_id = parent_tab.windowId;
				chrome.tabs.onUpdated.addListener(function (tid, tab) {
					if (tid === tab_id) {
						if (tab.url !== undefined) {
							new_tab_url = (new URL(tab.url)).protocol + "//" + (new URL(tab.url)).hostname;
							if (
								tab_duplication && 
								!(new_tab_url.startsWith(parentURL)) && 
								(all_guilty_sites.indexOf(parentURL) >= 0)
								) {
									chrome.tabs.remove(tab_id);						
								}
						}
					}
		});
            });
		});
    });
});
// Listener for window popups
chrome.tabs.onCreated.addListener(function (tab) {
    let tab_window_id = chrome.windows.WINDOW_ID_CURRENT;
    chrome.tabs.query({ windowType: "popup", active: true, index: 0 }, function (tabs) {
        new_tabs[0] = tabs[0];
        if (new_tabs[0] !== undefined) {
            if (tab_window_id !== new_tabs[0].windowId) {
                if (
                    (all_guilty_sites.indexOf(parentURL) >= 0) &&
                    (!(new_tabs[0].url.startsWith(parentURL)))
                ) {
                    chrome.tabs.remove(new_tabs[0].id);					
                }
            }
        }
    });
});



