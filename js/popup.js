


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
                    msg.innerHTML += "Site Added";
                });
            }
            else {
                if (!(bad_sites.indexOf(full_url) >= 0)) {
                    btn.addEventListener('click', function () {
                        bad_sites.push(full_url);
                        chrome.storage.local.set({ guilty_sites: bad_sites });
                        btn.remove();
                        msg.innerHTML += "Site Added";
                    });
                }
                else {
                    msg.innerHTML = "";
                    msg.innerHTML += "Site Already Added";
                    btn.innerText = "Remove Site";
                    btn.addEventListener('click', function() {
                        let url_index = bad_sites.indexOf(full_url);
                        bad_sites.splice(url_index, 1);
                        chrome.storage.local.set({ guilty_sites: bad_sites });
                    })
                }
            }
        });
    });
});
