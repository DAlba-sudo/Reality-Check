// this serves as our production instance helper 
// module.

/** Global Variable Initialization */
let debug_hostname = "http://127.0.0.1:8000";
let recon_hostname = "http://recon-webserver:8000";

export let core = {
    hostname: debug_hostname,
    consumer_token: null,
}

/**
 * A quick helper function with pre-defined headers for 
 * posting data to the server.
 * 
 * @param {String} url the url we will post to
 * @param {JSON} data the data that we will post
 * @returns the response
 */
export async function data_post(url, data) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data),
    });
}

/** Helper Functions */
export function extract_domain(url) {
    let protocol_end = url.indexOf("://");
    let path_start = url.indexOf('/', protocol_end+3);
    let domains = url.substring(protocol_end+3, path_start);
    let domains_arr = domains.split('.');

    if (domains_arr.length > 2) {
        return `${domains_arr[domains_arr.length-2]}.${domains_arr[domains_arr.length-1]}`; 
    } else {
        return domains;
    }
}