import {
    LS,
    queryTabs,
    formatUrl,
    SITES_CACHE_KEY,
} from "./utils.js";


function onClickEventListener(mode, hostname, guiltySites, btn, msg) {
    let newMessage = mode === 'add' ? "Site Added" : "Site Removed";

    if (mode === 'add') {
        // Update guilty list
        guiltySites.push(hostname);
    }
    else {
        // Remove the hostname from the guilty list
        let urlIndex = guiltySites.indexOf(hostname);
        guiltySites.splice(urlIndex, 1);
    }

    // Save the remaining
    LS.setItem(SITES_CACHE_KEY, guiltySites);

    // Reset
    btn.remove();
    msg.innerHTML = '';
    msg.innerHTML += newMessage;
}


async function onDomContentLoadedListener() {
    let btn = document.getElementById('add'),
        msg = document.getElementById('info'),
        input = document.getElementById('domain');

    let queryOptions = { 'active': true, 'lastFocusedWindow': true }
    let [activeTab] = await queryTabs(queryOptions);
    if (!activeTab) return

    let tabHostname = formatUrl(activeTab.url);
    input.value = tabHostname; // Set input

    // Overwrite if empty
    let guiltySites = await LS.getItem(SITES_CACHE_KEY);
    if (!guiltySites) guiltySites = [];

    // Already present?
    if (guiltySites.indexOf(tabHostname) >= 0) {
        // Update UI
        msg.innerHTML = "";
        btn.innerText = "Remove Site";
        msg.innerHTML += "Site already Added";

        btn.addEventListener('click', () => {
            onClickEventListener('remove', tabHostname, guiltySites, btn, msg)
        });
    }
    else { // Add and save
        btn.addEventListener('click', () => {
            onClickEventListener('add', tabHostname, guiltySites, btn, msg)
        });
    }
}

document.addEventListener('DOMContentLoaded', onDomContentLoadedListener)
