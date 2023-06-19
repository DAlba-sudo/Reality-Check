// this file will manage the status of relevant items for the extension
let stats = {
    has_email: null,
    has_consumer_token: null,
    localhost_debug_environment_active: null,
    recon_webserver_net_active: null,
    recon_webserver_host_active: null,
};

let stat_text = {
    has_email: "Email Found",
    has_consumer_token: "Consumer Token (from server)",
    localhost_debug_environment_active: "Localhost Development Environment",
    recon_webserver_net_active: "Recon-Webserver Found on R204 Domain",
    recon_webserver_host_active: "Recon-Webserver Found using DNS",
}

let stats_update = {
    has_email: has_email_stored,
    has_consumer_token: has_consumer_token_stored,
    localhost_debug_environment_active: () => {return check_environment("127.0.0.1:8000")},
    recon_webserver_net_active: () => {return check_environment("recon-webserver.r204.net:8000")},
    recon_webserver_host_active: () => {return check_environment("recon-webserver:8000")},
}

let all_stat_keys = [
    'has_email', 
    'has_consumer_token', 
    'localhost_debug_environment_active', 
    'recon_webserver_net_active',
    'recon_webserver_host_active'
];

let additional_cleanup = {
    has_email: email_cleanup,
}

function email_cleanup(is_green) {
    let email_row = document.getElementById('cond-input-email-container');
    if (is_green) {
        email_row.classList.add('hidden');
    } else {
        email_row.classList.remove('hidden');
    }
}

/** Status Checkers: Local Storage */
/**
 * Checks local storage to see if the email has been set already.
 * @returns true if the email has been set in local, false otherwise
 */
async function has_email_stored() {
    let consumer_email = window.localStorage.getItem('consumer-email');
    return consumer_email != null;
}

/**
 * Checks to see if the consumer token has been stored.
 * @returns tuple consisting of the consumer token's status, and the token itself.
 */
async function has_consumer_token_stored() {
    let consumer_token = window.localStorage.getItem('consumer-token');
    return consumer_token != null;
}

/** Status Checkers: Network Related */
async function check_environment(host) {
    let promise = fetch(`http://${host}/api/heartbeat`);
    let result = await promise
        .then((response) => {
            return response.status >= 200 && response.status <= 300;
        })
        .catch((reason) => {
            return false;
        });

    return result;
}

function gen_stat_text(base_text, is_true) {
    if (!is_true) {
        return `No ${base_text}`;
    }

    return base_text;
}

function update_status(key, is_green) {
    let index = all_stat_keys.indexOf(key);
    if (index == -1) {
        return false;
    }
    
    // we update the status
    let ul_container = document.getElementById('status-container');
    let list_items = ul_container.getElementsByTagName('li');

    let color = "green";

    if (!is_green) {
        color = "error"
    }

    list_items[index].getElementsByTagName('span')[0].classList.remove('green-nudge', 'error-nudge', 'flash-green', 'flash-error');
    list_items[index].getElementsByTagName('span')[0].classList.add(`${color}-nudge`, `flash-${color}`);
    list_items[index].getElementsByClassName('status-text')[0].innerText = gen_stat_text(stat_text[key], is_green);

    try {
        additional_cleanup[key](is_green);
    } catch (e) {

    }
}

/** Interval Callbacks: Updating status values */
async function update_all_status() {
    for (let key of all_stat_keys) {
        let value = await stats_update[key]();
        if (stats[key] != value) {
            stats[key] = value;

            update_status(key, value);
        }
    }
}

update_all_status();
setInterval(update_all_status, 950);


