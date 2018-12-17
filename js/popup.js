


document.addEventListener('DOMContentLoaded', function () {

    let btn = document.getElementById('site_adder'),
        msg = document.getElementById('site_added'),
        input = document.getElementById('domain');

    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
        let url = tabs[0].url;
        full_url = (new URL(url)).protocol + "//" + (new URL(url)).hostname;
        input.value = full_url;

        chrome.storage.local.get(['guilty_sites'], function (result) {
            let bad_sites = result.guilty_sites;

            if (bad_sites === undefined) {
                bad_sites = [];
                btn.addEventListener('click', function () {
                    bad_sites.push(full_url);
                    chrome.storage.local.set({ guilty_sites: bad_sites });
                    btn.remove();
                    input.value = " ";
                    msg.innerHTML += "URL Added";
                });
            }
            else {
                if (!(bad_sites.indexOf(full_url) >= 0)) {
                    btn.addEventListener('click', function () {
                        bad_sites.push(full_url);
                        chrome.storage.local.set({ guilty_sites: bad_sites });
                        btn.remove();
                        input.value = " ";
                        msg.innerHTML += "URL Added";
                    });
                }
                else {
                    input.value = " ";
                    btn.remove();
                    msg.innerHTML = "";
                    msg.innerHTML += "URL Already Added";
                }
            }
        });
    });
});
