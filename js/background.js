
let context_menu_link, parentURL, all_guilty_sites;
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


chrome.tabs.query({ active: true }, function (tabs) {

    chrome.storage.local.get(['guilty_sites'], function (result) {

        let guilty_sites = result.guilty_sites;
        all_guilty_sites = guilty_sites;

        chrome.tabs.onCreated.addListener(function (tab) {

            let parent_tab_id = tab.openerTabId;

            if (parent_tab_id) {
                if (
                    !(
                        (tab.url === context_menu_link) ||
                        (tab.title == "New Tab") ||
                        (tab.url.startsWith('chrome')) ||
                        (tab.url == "Start Page") ||
                        (tab.url.startsWith('vivaldi'))
                    )
                ) {
                    chrome.tabs.get(parent_tab_id, function (parent_tab) {

                        let parent_tab_url = parent_tab.url;
                        parent_window_id = parent_tab.windowId;

                        let parent_url = (new URL(parent_tab_url)).protocol + "//" + (new URL(parent_tab_url)).hostname;
                        parentURL = parent_url;

                        if (tab.url.startsWith(parent_url)) {
                            let current_parent_url = parent_tab.url;

                            if (current_parent_url != parent_tab_url) {
                                chrome.tabs.remove(parent_tab_id);
                            }
                        }
                        else {
                            if (
                                (guilty_sites.indexOf(parent_url) >= 0) &&
                                (!(tab.url.startsWith(parent_url)))
                            ) {
                                chrome.tabs.remove(tab.id);
                            }
                        }
                    });
                }
            }
        });
    });
});

chrome.tabs.onCreated.addListener(function (tab) {

    chrome.tabs.query({ windowType: "popup" }, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            new_tabs[i] = tabs[i];
        }
        if (
            (all_guilty_sites.indexOf(parentURL) >= 0) &&
            (!(new_tabs[0].url.startsWith(parentURL)))
        ) {
            chrome.tabs.remove(new_tabs[0].id);
        }
    });
});