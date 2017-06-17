# Superhost-Tools
**Open Source Airbnb Auto Messaging and Pricing Tool for Hosts**

[Superhost tools](https://SuperhostTools.com) is an auto messaging tool and pricing engine for Airbnb hosts.  It allows you to send automated messages to your Airbnb guests.  Messages can be sent before or after a guests check-in or check-out or can be sent immediately after a booking is made.  In addition to messaging, it can also automatically leave reviews for guests after they check out.  The pricing engine uses Airbnb's Smart Pricing as a base price and allows you to apply rules on top of those prices.  For example, you can set your price 10% higher than Airbnb smart price or increase all weekend prices by $50.  It can also increase or decrease prices over a period of time and you can setup rules for orphan days (a short period between bookings).

Try it out.  Let me know what you think.

## Try it out

[SuperhostTools.com](https://SuperhostTools.com)

## Requirements
Superhost Tools pricing was designed to work Airbnb's smart pricing feature.  If your account does not have smart pricing, contact Airbnb and ask them to enable it.  Superhost tools has not been tested with Airbnb hosting accounts that don't have smart pricing but in theory should still work.

1. Bower
2. Node
3. npm
4. MonogoDB
5. UptimeRobot.com account (to ping server)

## Install on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

After deploying:
- Login to the Mailgun account created for you by Heroku to verify it.
- Set UptimeRobot.com to ping the following URLs every 15 min:
  - yourHerokuDomain.com/checkRules
  - yourHerokuDomain.com/updatePricing

## How to install on a local computer
Note: the code is set to not send messages or change prices on Airbnb from a local dev environment.  I did this because I didn't want to accidentally send a message or set a price during development.  You can either disable this or run it on a server like Heroku.

1. Install all the node dependencies, open terminal and browse to the projects root directory and type `npm install`
2. In terminal change to the public directory, type `cd public/`
3. Then install all the bower components, type 'bower install'.
4. Open email/config.js and add your mailgun info.

## How to run on local computer
1. Start the Mongo DB, open terminal and browse to the projects root directory and type `mongod`
2. Now start the node instance, open a second terminal window and browse to the projects root directory and type `node app.js`
3. Open your browser and browse to 'http://localhost:1337/'

## To-do (pull requests welcome)
- [x] Add Heroku deploy button.
- [ ] Remove airbnb credentials from DB and just store the access-token
- [ ] Allow users to manually send a scheduled message
- [ ] Allow users to modify messages individually
- [ ] Clean up README
- [ ] Add pricing engine user introduction walk though (similar to the messaging walk though).  New users are probably pretty confused how to use it.  Need a better explanation of how to use it for users that have just registered accounts.
- [ ] Create tests for the code
- [x] Re-factor DB code and DB structure.
- [ ] Add config values to Heroku Config Vars
- [x] Reorder pricing rules
- [x] Add min and max pricing rules

## HELP WANTED
I'm still currently working on fixing bugs and adding features to Superhost Tools and can use your help.  Send me pull requests and I'll respond ASAP.  :)  Thanks!
