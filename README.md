# Superhost-Tools
Open Source Airbnb Auto Messaging and Pricing Tool for Hosts

Superhost tools is an auto messaging and pricing tool for Airbnb hosts.  It allows you to send automated messages to your Airbnb guests.  Messages can be sent before or after a guests check-in or check-out and can be sent after a booking.  It also is a pricing engine.  It uses Airbnb's Smart Pricing as a base price and allows you to apply rules on top of those prices.  For example, you can set your price 10% higher than Airbnb smart price or increase weekend prices by $50.

## HELP WANTED
I'm still currently working on Superhost Tools and can use your help.  Please feel free to add feature and fix bugs.  Send me pull requests and I'll respond ASAP.  :)

## WARNING
Superhost tools is still under development.  It works well to the best of my knowledge but I take no responsibility issue it may cause.  Use at your own risk!

## Requirements
Superhost Tools pricing was designed to work Airbnb's smart pricing feature.  If your account does not have smart pricing, contact Airbnb and ask them to enable it.  Superhost tools has not been tested with Airbnb hosting accounts that don't have smart pricing but in theory should still work.

1. Bower
2. Node
3. npm
4. MonogoDB
5. Maingun account (for email)

## Install on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

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

## To-do
### (push requests welcome)
1. Remove airbnb credentials from DB and just store the access-token
2. Allow users to manually send a message
3. Update README to be clearer
4. Add pricing engine user introduction.  New users are probably pretty confused how to use it.  Need a better explanation of how to use it for users that have just registered accounts.
5. Create tests for the code