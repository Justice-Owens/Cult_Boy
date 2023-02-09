# Cult Boy!

Cult Boy is a bot made for Discord that really begins to shine once you begin adding various triggers to the database. Cult Boy will scan through messages in chat and compare words and phrases to a local database of triggers (None of your messages are stored by Cult Boy). If there is a match, Cult Boy will respond in the channel the message was posted in with either a message, an image, join the voice chat of the original poster (if they are in one), or any combination of these things! You will find that as you add more triggers to the database, Cult Boy will begin to take on a personality of his own, reflective of the general culture within a discord server. This bot currently does not have a special role that will allow only certain people to use the commands so it works best, currently, in small servers.

### How to Install/Run

Cult Boy's repository comes with all of his dependencies in /node_modules. Simply clone the repository into the folder you wish and follow the following steps:
```
1. Turn on “Developer mode” in your Discord account
2. Click on “Discord API”
3. In the Developer portal, click on “Applications”. Log in again and then, back in the “Applications” menu, click on “New Application”
4. Name the bot and then click “Create”
5. Go to the “Bot” menu and generate a token using “Add Bot”
6. Copy and paste the token into the token field in the file "botconfig"
7. Click on “OAuth2”, activate “bot”, set the permissions, and then click on “Copy”
8. Select your server to add your bot to it.
```

To run Cult Bot, simply open powershell or command prompt in the folder you cloned the bot into and type the following command:
```
node Cult_Boy.js
```

Cult Boy should appear online in your server and actively respond to messages as long as you leave the powershell or command prompt you used to run it open!

