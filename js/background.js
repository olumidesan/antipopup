
let context_menu_link,
    change_happened,
    glob_url,
    new_tab_url,
    removed_tab_id,
    global_tab_url,
    global_tab_id,
    parentURL,
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
});

chrome.storage.onChanged.addListener(function (changes, local) {
    chrome.runtime.reload();
});


chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    global_tab_id = tabs[0].id;
    glob_url = tabs[0].url;
    global_tab_url = (new URL(glob_url)).protocol + "//" + (new URL(glob_url)).hostname;


    chrome.storage.local.get(['guilty_sites'], function (result) {

        let guilty_sites = result.guilty_sites;
        all_guilty_sites = guilty_sites;
    });

    chrome.tabs.onUpdated.addListener(function (global_tab_id, tab) {
        if (tab.url !== undefined) {
            new_tab_url = (new URL(tab.url)).protocol + "//" + (new URL(tab.url)).hostname;
            change_happened = true;
        }
        
    });

    // Listener for new tab popups
    chrome.tabs.onCreated.addListener(function (tab) {
        let parent_tab_id = tab.openerTabId;

        if (parent_tab_id) {
            if (
                !(
                    (tab.url === context_menu_link) ||
                    (tab.title == "New Tab") ||
                    (tab.url.startsWith('chrome'))
                )
            ) {
                chrome.tabs.get(parent_tab_id, function (parent_tab) {

                    let parent_tab_url = parent_tab.url;
                    parent_window_id = parent_tab.windowId;

                    let parent_url = (new URL(parent_tab_url)).protocol + "//" + (new URL(parent_tab_url)).hostname;
                    parentURL = parent_url;

                    if (
                        (all_guilty_sites.indexOf(parent_url) >= 0) &&
                        (!(tab.url.startsWith(parent_url)))
                    ) {
                        removed_tab_id = tab.id;
                        chrome.tabs.remove(tab.id);
                    }
                });
            }
        }
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




// Listener for those websites that open the current page in a new tab and open an ad in the current tab
chrome.tabs.onCreated.addListener(function (tab) {

    if (change_happened === true && (tab.title != "New Tab" || (!(tab.url.startsWith('chrome'))))) {
        if (removed_tab_id !== undefined) {
            chrome.tabs.get(removed_tab_id, function (tab) {
                if (chrome.runtime.lastError  && new_tab_url != global_tab_url) {
                    chrome.tabs.update(global_tab_id, { url: glob_url });
                }
            });
        }
    }
});


