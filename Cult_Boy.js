const botconfig = require("./botconfig.json"); //Identifies and adds in bot configs.
const Discord = require("discord.js"); //Grabs Discord libraries
const fs = require('fs'); //Loads file system
const time = require('time-parser'); //Loads time-parser
const ffmpeg = require('ffmpeg');
const {db,pdb} = require('./database.json'); //Loads database and picture database
const blockedchannels = [];
const ytdl = require('ytdl-core');
const bot = new Discord.Client({disableEveryone: true})

//Defaults mute to off
let hardmute = false;
let timemute = 1;


//Makes sure the bot is on/stays on
bot.on("ready", async () => {
  console.log(`${bot.user.username} is online!`)
  bot.user.setActivity("with your heart.", {type: "PLAYING"});
}); 


bot.on("message", async message => {
  if(message.author.bot) return;
  if(message.channel.type === "dm") return;
  
  let prefix = botconfig.prefix;
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0];
  const args = message.content.split(' ').slice(1);
  
  
//Legacy VK code
	
	//Returns blank if in blocked channel
	if (message.author.bot || blockedchannels.includes(message.channel.id)) return;
	
	//Essentially sets the triggers to be commands without prefixes
	const command = message.content.toLowerCase().substring(prefix.length).split(" ")[0];
	
	//Allows mute to work
	if (hardmute || timemute > Date.now()) return;
	
	
	//Pulls data from the db to put in the embedded message after a trigger has been identified
	Object.keys(db).map(item => {
        message.content.toLowerCase().split(' ').map(async x => {
            if (x === item || x.includes(item) && x.includes(item + `'`) || x.includes(item) && x.includes(item + '.') || x.includes(item) && x.includes(item + '"') || x.includes(item) && x.includes(`'` + item) || x.includes(item) && x.includes(`"` + item) || x.includes(item) && x.includes(item + '?') || x.includes(item) && x.includes(item + '!')) {
                if (db[item].embed && db[item].embed.image.url || db[item].embed && db[item].embed.description)
                    message.channel.send({ embed: db[item].embed });
				
				//Joins channel
                if (db[item].youtubeurl && message.member.voiceChannelID && !bot.voiceConnections.first()) {
                    let connection = await message.guild.channels.get(message.member.voiceChannelID).join();
					
					//Streams yt link in chat -> Filters to audioonly to save bandwidth
                    connection.playStream(ytdl(db[item].youtubeurl, {filter: 'audioonly'}));
					
					//Next two lines kick VK from voice after link finishes
                    const dispatcher = connection.dispatcher;

                    dispatcher.on('end', () => message.guild.channels.get(message.member.voiceChannelID).leave());
                };
            };
        });
    });
	
	//Same as above except for information from the pdb
    Object.keys(pdb).map(async item => {
        if (!message.content.toLowerCase().includes(item)) return;

        if (pdb[item].embed && pdb[item].embed.image.url || pdb[item].embed && pdb[item].embed.description )
            message.channel.send({ embed: pdb[item].embed });

        if (pdb[item].youtubeurl && message.member.voiceChannelID && !bot.voiceConnections.first()) {

            let connection = await message.guild.channels.get(message.member.voiceChannelID).join();

            connection.playStream(ytdl(pdb[item].youtubeurl, {filter: 'audioonly'}));

            const dispatcher = connection.dispatcher;

            dispatcher.on('end', () => message.guild.channels.get(message.member.voiceChannelID).leave());
        };
    });

	//Add command with arguments
	if (command === 'add' && args[0]) {
        nargs = args.join(' ').split(';;');

        let trigger = nargs[0].toLowerCase(),
            audio = nargs[1].replace(/none/gi, ''),
            image = nargs[2].replace(/none/gi, ''),
            res = nargs[3].replace(/none/gi, '');

        if (!audio && !image && !res) return message.channel.send('You need to specify at least one argument. You can\'t say `none` to all. Start over.');

        if (trigger.includes(' '))
            writedb = pdb;
        else
            writedb = db;

        writedb[trigger] = {
            "youtubeurl": audio,
            "embed": {
                "description": res,
                "color": 1554202,
                "image": {
                    "url": image
                }
            }
        }

        fs.writeFile('./database.json', JSON.stringify({ 'db': db, 'pdb': pdb }, '', '\t'), (err) => {
            if (err) return message.channel.send('Something went wrong.' + err.message);
            message.channel.send(`Successfully added to the database. Trigger: \`${trigger}\`` + (res ? `, response: \`${res}\`` : '') + (image ? `, image: <${image}>` : '') + (audio ? `, audio: <${audio}>` : ''));
        });
    }

	//add command without arguments
    if (command === 'add' && !args[0]) {
        message.channel.send('What word do you want to trigger a response?');

        const collector = message.channel.createMessageCollector(m => message.author.id === m.author.id, { time: 120000 });

        let step = 1;

        let trigger, image, res, audio;

        collector.on('collect', m => {
            if (m.content.toLowerCase() === 'cancel' || m.content.toLowerCase() === prefix + 'add')
                return collector.stop();

            if (step === 1) {
                trigger = m.content.toLowerCase();

                if (db[trigger] || pdb[trigger])
                    return m.channel.send(`Trigger \`${trigger}\` already exists in the database. What word do you want to trigger a response?`);

                message.channel.send(`Would you like to add sound to the response? If the sender of the message is in a voice channel while sending the trigger, the bot will play the audio. Send the YouTube URL if you do, reply with \`none\` if you don't want any sound to be played.`);
            };

            if (step === 2) {
                if (m.content.toLowerCase() === 'none')
                    audio = '';
                else
                    audio = m.content;

                message.channel.send(`Would you like to add an image to the response? Send the URL if you do (gifs are supported), reply with \`none\` if you don't want an image.`);
            }

            if (step === 3) {
                if (m.content.toLowerCase() === 'none')
                    image = '';
                else
                    image = m.content;

                message.channel.send(`What would you like the text-response to \`${trigger}\` to be?`);
            };

            if (step === 4) {
                if (m.content.toLowerCase() === 'none')
                    res = '';
                else
                    res = m.content;

                if (!res && !image && !audio) {
                    m.channel.send('You need to specify at least one argument. You can\'t say `none` to all. Start over.')
                    return collector.stop();
                }

                if (trigger.includes(' '))
                    writedb = pdb;
                else
                    writedb = db;

                writedb[trigger] = {
                    "youtubeurl": audio,
                    "embed": {
                        "description": res,
                        "color": 1554202,
                        "image": {
                            "url": image
                        }
                    }
                }

                fs.writeFile('./database.json', JSON.stringify({ 'db': db, 'pdb': pdb }, '', '\t'), (err) => {
                    if (err) return message.channel.send('Something went wrong.' + err.message);
                    m.channel.send(`Successfully added to the database. Trigger: \`${trigger}\`` + (res ? `, response: \`${res}\`` : '') + (image ? `, image: <${image}>` : '') + (audio ? `, audio: ${audio}` : ''));
                });
                collector.stop();
            };
            step++;
        });
    };

	//remove command with args
    if (command === 'remove' && args[0]) {
		 
		
        if (!db[args.join(' ')] && !pdb[args.join(' ')])
            return message.channel.send(`The trigger \`${args.join(' ')}\` wasn't found in the database.`);

        if (args[1])
            delete pdb[args.join(' ')]
        else
            delete(db[args.join(' ')])
		
		
        fs.writeFile('./database.json', JSON.stringify({ 'db': db, 'pdb': pdb }, '', '\t'), (err) => {
            if (err) return message.channel.send('Something went wrong.' + err.message);
            message.channel.send(`Trigger \`${args.join(' ')}\` deleted from the database.`);
        });
		
		 	
    };

	//remove command without args
    if (command === 'remove' && !args[0]) {
		
        message.channel.send('What trigger would you like to remove out of the database?');
		
		hardmute = true;
		timmute = 0; 

        const collector = message.channel.createMessageCollector(m => message.author.id === m.author.id, {
            time: 120000
        });

        collector.on('collect', m => {
            if (m.content.toLowerCase() === 'cancel' || m.content.toLowerCase() === prefix + 'add')
                return collector.stop();

            if (!db[m.content] && !pdb[m.content])
                return m.channel.send(`The trigger \`${m.content}\` wasn't found in the database.`);

            if (m.content.includes(' '))
                delete pdb[m.content];
            else
                delete db[m.content];

			hardmute = false;
			timmute = 1;
			
            fs.writeFile('./database.json', JSON.stringify({ 'db': db, 'pdb': pdb }, '', '\t'), (err) => {
                if (err) return message.channel.send('Something went wrong.' + err.message);
                m.channel.send(`Trigger \`${m.content}\` deleted from the database.`);
            });
            collector.stop();
        });
    };

	
  
//Displays Server Info
  if(cmd === `${prefix}serverinfo`){
    
    let sicon = message.guild.iconURL;
    let serverembed = new Discord.RichEmbed()
    .setDescription("Server Info")
    .setColor("17b71a")
    .setThumbnail(sicon)
    .addField("Server Name", message.guild.name) //For whatever reason, Discord uses guild to refer to the server
    .addField("Created on", message.guild.createdAt)
    .addField("You joined on", message.member.joinedAt)
    .addField("Total Members including bots", message.guild.memeberCount)
    
    return message.channel.send(serverembed);
  }
  
  //Pings bot
  if(cmd === `${prefix}ping`){
	
	let PingMessage = new Discord.RichEmbed()
	.setDescription("Pong!")
	.setColor("17b71a")
	  
    return message.channel.send(PingMessage);
  }
  
  //Unmutes bot
  if(cmd === `${prefix}unmute`){
    
    hardmute = false;
    timmute = 1; 
	
	let unmuteEmbed = new Discord.RichEmbed()
		.setDescription("Cult Boy's speaking privileges have been returned!")
		.setColor("17b71a")
		
	return message.channel.send (unmuteEmbed);
		
  }
  
  //Lists VK's commands
  if(cmd === `${prefix}help`){
    
    let helpembed = new Discord.RichEmbed()
    .setDescription( bot.user.username + "\'s Command List")
    .setColor("17b71a")
    .addField("mute", 'Removes ' + bot.user.username + '\'s speaking privileges indefinitely or for a set amount of time.') //Needs descriptions
    .addField("unmute", "Returns "  + bot.user.username + "\'s speaking privileges.")
    .addField("ping", 'pong!')
    .addField("add", bot.user.username + " will guide you through adding a new trigger.")
    .addField("remove", "Removes specified trigger.")
    .addField("botinfo", "Displays info about " + bot.user.username)
    .addField("serverinfo", "Displays info about the server " + bot.user.username + " is on.")
    .addField("purge", "Purges an amount of " + bot.user.username + "\'s messages in the current channel.")
    .addField("list", "Lists all of " + bot.user.username + "\'s triggers.")
    .addField("reboot", "Reboots " + bot.user.username + " remotely")
    .addField("stop", "Stops " + bot.user.username + " from talking in the voice channel.")
    
    return message.channel.send(helpembed);
}
  
  //Bot Info
  if(cmd ===`${prefix}botinfo`){
    
    let bicon = bot.user.displayAvatarURL; //Sets bicon as the bots avatar
    let botembed = new Discord.RichEmbed() //Creates embed
    .setDescription("Something something shitposting bot") //Bot description. Appears at top. Presumably can change position based on where it is in the code
    .setColor("#17b71a") //Sets embed color
    .setThumbnail(bicon) //Sets thumbnail on embed
    .addField("Bot Name" , bot.user.username) // .addField just adds a field in the embed. Stuff in quotes is bolded.
    .addField("Born on" , bot.user.createdAt)
    
    return message.channel.send(botembed); //Sends message like normal, but sends the embed instead of the usual message
  }
  
  //Mutes VK indefinitely
  if (cmd === `${prefix}mute` && !args[0]){
    
    let muteembed = new Discord.RichEmbed()
    .setDescription( bot.user.username + " has lost his speaking privileges.")
    .setColor("17b71a")
    
    return message.channel.send(muteembed);
  }
  
  //Mutes VK for a specified amount of time
  if(cmd === `${prefix}mute` && args[0]){
    
    let arg = args.join(' ');
    let tParse = time(arg).absolute;
    
    if (arg.includes('next '))
      tParse = time(arg.replace(/next /g, 'one')).absolute;
    
    if (arg.startsWith('a ') || arg.startsWith('an '))
      tParse = time(arg.replace(/a /g, 'one ').replace(/an /g, 'one ')).absolute;
    
    if (arg.includes(' min'))
      tParse = time(arg.replace(/ min/g, 'minutes')).absolute;
    
    if (!isNaN(arg) || !tParse)
      return message.channel.send ('Time argument is invalid. Try again.')
    
    if (time(arg).relative < 0)
      return message.channel.send ('You can\'t mute for a time in the past.')
    
    timemute = tParse;
    
    let TimedMute = new Discord.RichEmbed()
    .setDescription(`Cult Boy has been put in timeout for ${(time(arg).relative /1000 / 60).toFixed(2)} minutes`)
    .setColor("17b71a")
    .setFooter(bot.user.username + " will be allowed out of timeout at")
    .setTimestamp(new Date(tParse))
    
    return message.channel.send(TimedMute);
  }
  
  //Removes VK from voice channel
  if (cmd === `${prefix}stop`){
    bot.voiceConnections.map(x => x.channel.leave());
  }
  
  //Force restart VK
  if (cmd === `${prefix}reboot`){
    
	let ForceRestart = new Discord.RichEmbed()
	.setDescription("I'm sorry I'm broken. I'll be fixed soon!")
	.setColor("17b71a")
	
	await message.channel.send(ForceRestart);
	
    await bot.destroy();
    process.exit();
    //I removed the if statement that only allowed Jesse to reboot VK in case anyone else needs
    //to reboot VK. At least, that's what I believe the line did
  }
  
  //Purges chat from any toxicity that VK may have spewed
  if (cmd === `${prefix}purge`){
    let num = parseInt(args[0]);
    
    if (!args[0])
       num = 1;
    
    if (isNaN(num))
      return message.edit("Argument specified is not a number.");
    
    let messages = await message.channel.fetchMessages({ limit:100});
    
    let messagea = messages.array().filter(m => m.author.id === bot.user.id);
    
    messagea.length = num;
    
    messagea.map(m => m.delete().catch());
  }
  
  //Lists all of VK's triggers
  if (cmd === `${prefix}list`){
    
    let ListEmbed = new Discord.RichEmbed()
    .setColor("17b71a")
    .setDescription(Object.keys(db).concat(Object.keys(pdb)).join(', '))
    
    return message.channel.send(ListEmbed);

  }
});

bot.login(botconfig.token) //Logs bot in
