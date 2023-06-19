/** Globals */

/** Helper Functions (NON-HTML) */
/**
 * Checks the local storage for the email value and validates that it has
 * the @sign.
 * @returns true if email key exists, false otherwise  
 */
function is_email_set() {
    let email = window.localStorage.getItem("consumer-email");
    return email != null && email.includes('@');
}

/** Interval Based Callbacks */
function email_set_callback() {
    if (is_email_set()) {
        // store the ctoken that we get after registration
        chrome.runtime.sendMessage({action: 'data-email', email: window.localStorage.getItem('consumer-email')}, null, (ctoken) => {
            if (!ctoken.includes('tkn')) {
                // not a valid token, so we just restart.
                setTimeout(email_set_callback, 2000);
            } else {
                window.localStorage.setItem('consumer-token', ctoken);
            }
        });
    } else {
        setTimeout(email_set_callback, 2000);
    }
}

/** HTML Event Callbacks */
function email_set() {
    let ev = document.getElementById('cond-input-email');
    window.localStorage.setItem('consumer-email', ev.value);
    console.log(`Set the email to: ${ev.value}`);

    ev.value = "";
    email_set_callback();
}

// registering these callbacks
document.getElementById('cond-input-email-btn').addEventListener('click', email_set)
email_set_callback()