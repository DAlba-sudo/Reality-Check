let url = window.location.href;
let hostname = window.location.hostname;
let hrefs = [];

function is_foreign(url) {
    let revised_url = "";
    if (url.charAt(0) == '/') {
        return false;
    } else if (url.indexOf('://') == -1) {
        // no protocol specified, we assume https.
        revised_url = `https://${url}`;
    }

    // we break the url into its component pieces
    let protocol_end = revised_url.indexOf("://");
    let path_start = revised_url.indexOf('/', protocol_end+3);
    let domains = revised_url.substring(protocol_end+3, path_start);
    
    if (domains.split('.').length > 2) {
        return domains.substring(domains.indexOf('.')+1) != hostname; 
    } else {
        return domains != hostname;
    }
}

chrome.runtime.sendMessage({action: 'init-url', hostname: window.location.href}, undefined, (result) => {
    if (result) {
        console.log("The urls has been stored, awaiting response from service worker.");
    }
});

