'use strict';


module.exports = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
    },
    mailer: {
        defaultFromAddress: process.env.MAILGUN_DEFAULT_FROM_ADDRESS
    }
};
