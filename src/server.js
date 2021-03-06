import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import botkit from 'botkit';
import yelp from 'yelp-fusion';

import dotenv from 'dotenv';

dotenv.config({ silent: true });

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});


// hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// hungry response
controller.hears(['I\'m hungry', 'hungry', 'recommendations', 'restaurants', 'near me'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'What kind of food would you like to eat?');
});

// help response
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hungry? I\'m here to give you restaurant recommendations in the Hanover, NH area! Just let me know what type of food you\'re interested in right now.');
});

// yelp response
const yelpClient = yelp.client(process.env.YELP_API_KEY);

controller.hears(['sushi', 'thai', 'coffee', 'pizza', 'american'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const foodType = message.match[0];
  console.log(foodType);
  yelpClient.search({
    term: foodType,
    location: 'hanover, nh',
  }).then((response) => {
    const business = response.jsonBody.businesses[0];
    console.log(business);
    console.log(business.price);
    bot.reply(message, {
      text: `I recommend you try out ${business.name}!`,
      attachments: [
        {
          title: `${business.name}`,
          image_url: `${business.image_url}`,
        },
        {
          fields: [{
            title: 'Address',
            value: `${business.location.address1}, ${business.location.city}, ${business.location.state} ${business.location.zip_code}`,
          },
          {
            title: 'Rating',
            value: `${business.rating}`,
          }],
        },
      ],
    });
  }).catch((e) => {
    console.log(e);
    bot.reply(`Sorry, I didn't find any results for ${foodType} near Hanover.`);
  });
});

controller.hears(['I want (.*) food', 'I want (.*)', 'I\'m feeling (.*)'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const foodType = message.match[1];
  console.log(foodType);
  yelpClient.search({
    term: foodType,
    location: 'hanover, nh',
  }).then((response) => {
    const business = response.jsonBody.businesses[0];
    console.log(business);
    // bot.reply(message, `I recommend you try out ${business.name}!`);
    bot.reply(message, {
      text: `I recommend you try out ${business.name}!`,
      attachments: [
        {
          title: `${business.name}`,
          image_url: `${business.image_url}`,
        },
        {
          fields: [{
            title: 'Address',
            value: `${business.location.address1}, ${business.location.city}, ${business.location.state} ${business.location.zip_code}`,
          },
          {
            title: 'Rating',
            value: `${business.rating}`,
          }],
        },
      ],
    });
  }).catch((e) => {
    console.log(e);
    bot.reply(`Sorry, I didn't find any results for ${foodType} near Hanover.`);
  });
});

// thanks response
controller.hears(['thanks', 'thank you'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'No problem! I\'m happy to help');
});

// bye response
controller.hears(['bye', 'goodbye', 'see you', 'adios'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Bye! Talk to you next time!');
});

// default response
controller.hears(['.*', 'what'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Sorry, I don\'t quite understand you. I\'m here to give you restaurant recommendations in the Hanover, NH area! Just let me know what type of food you\'re interested in right now.');
});

// outgoing webhook
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'I\'m ready to help!');
});

// initialize
const app = express();

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
// const port = process.env.PORT || 9090;
// app.listen(port);

// console.log(`listening on: ${port}`);
