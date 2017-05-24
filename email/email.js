'use strict';

var config = require('./config');
var nodemailer = require('nodemailer');
//var path = require('path');
//var templatesDir = path.resolve(__dirname, '..', 'views/mailer');
var templatesDir = __dirname;
var emailTemplates = require('email-templates');
var mg = require('nodemailer-mailgun-transport');

var EmailAddressRequiredError = new Error('email address required');

var defaultTransport = nodemailer.createTransport(mg(config));

exports.sendOne = function (templateName, locals, fn) {
    // make sure that we have an user email
    if (!locals.email) {
        return fn(EmailAddressRequiredError);
    }
    // make sure that we have a message
    if (!locals.subject) {
        return fn(EmailAddressRequiredError);
    }
    emailTemplates(templatesDir, function (err, template) {
        if (err) {
            //console.log(err);
            return fn(err);
        }
        // Send a single email
        template(templateName, locals, function (err, html, text) {
            if (err) {
                //console.log(err);
                return fn(err);
            }
            // if we are testing don't send out an email instead return
            // success and the html and txt strings for inspection
            // if (process.env.NODE_ENV === 'test') {
            //     return fn(null, '250 2.0.0 OK 1350452502 s5sm19782310obo.10', html, text);
            // }
            var transport = defaultTransport;
            transport.sendMail({
                from: config.mailer.defaultFromAddress,
                to: locals.email,
                bcc: "tkrones@gmail.com",
                subject: locals.subject,
                html: html,
                // generateTextFromHTML: true,
                text: text
            }, function (err, responseStatus) {
                if (err) {
                    return fn(err);
                }
                return fn(null, responseStatus.message, html, text);
            });
        });
    });
}
