const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const feed = require('pubsubhubbub');
const xml = require('fast-xml-parser');
const Guild = require('./guild.db');
const youtube = require('./youtube');

require('dotenv').config();

// Config
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));

// Feed
const hub = 'http://pubsubhubbub.appspot.com/';
const topic = 'https://www.youtube.com/xml/feeds/videos.xml?channel_id=';
const all_subbed = [];

async function sleep(ms)
{
    return new Promise((res) => {
        setTimeout(res, ms);
    });
}

async function subscribe(id)
{
    if (!all_subbed.includes(id)) {
	console.log("Trying to subscribe...");
        subscriber.subscribe(topic + id, hub, (err) => {
            if (err) {
                console.log(err);
            }
            all_subbed.push(id);
        });
    }
}

function unsubscribe(id)
{
    subscriber.unsubscribe(topic + id, hub, (err) => {
        if (err) {
            console.log(err);
        }
    });
}

const subscriber = feed.createServer({
    callbackUrl: config['callback']
});
subscriber.on('listen', () => {

    Guild.find().then(guilds => {
        guilds.forEach(async guild => {
	    for (let i = 0; i < guild.subscribed.length; i++) {
		const channel_id = guild.subscribed[i];
		await sleep(250);
		console.log("Subscribing");
                unsubscribe(channel_id);
                subscribe(channel_id);
	    }
        });
    });
});
subscriber.on('subscribe', data => {
    if (!data.topic) {
	console.log(data);
    }
    console.log('Subscribed: ' + data.topic);
});
subscriber.on('feed', data => {
    console.log('We got something!');
    const [link, channel_id] = getVideoLink(data.feed);

    if (!link)
        return;

    // const [link, channel_id] = getVideoLink(fs.readFileSync(path.join(__dirname, 'test.xml')));

    Guild.find({ subscribed: channel_id }).then(guilds => {
        guilds.forEach(guild_obj => {
            client.guilds.fetch(guild_obj.server).then(guild => {
                guild.channels.fetch(guild_obj.channel_out).then(channel => {
                    channel.send("New Video: " + link);
                });
            });
        });
    });
});

// Start Discord
client.once('ready', () => {
    console.log("Here we go!");
});

// Join Server
client.on('guildCreate', (guild) => {
    const g = new Guild({
        server: guild.id.toString(),
        channel_out: '',
        subscribed: []
    });
    g.save({}).then(_ => {
        console.log("Saved new server to database");
    });
});

// Leave server
client.on('guildDelete', (guild) => {
    Guild.deleteOne({ server: guild.id.toString() }).then(_ => {
        console.log("Removed from server, deleted data");
    });
});

// Handle commands
client.on('message', async (message) => {

    if (message.toString().startsWith(config['prefix'])) {
	// Check we have permissions
	if (!message.member || !message.member.permissions.has('MANAGE_CHANNELS')) {
	    console.log("Can't check permissions");
            return;
        }

        const args = message.toString().split(' ');

        switch (args[1]) {
            case 'output': {

                message.guild.channels.fetch(args[2].substr(2, args[2].length - 3)).then(found => {
                    if (!found) {
                        console.log('Could not find text channel with name ' + args[2]);
                        return;
                    }

                    Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                        doc.channel_out = found.id.toString();
                        doc.save({}).then(_ => {
                            message.react('👍');
                        });
                    });
                });

                break;
            }

            case 'subscribe': {
                const url = args[2];
                youtube.getChannelID(url).then(id => {
                    Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                        doc.subscribed.push(id);
                        doc.save({}).then(_ => {
                            message.react('👍');
                        });

                        // Subscribe
                        subscribe(id).catch(e => {
			    console.log(e);
			});
                    });
                });
                break;
            }

            case 'unsubscribe': {
                const url = args[2];
                youtube.getChannelID(url).then(id => {
                    Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                        doc.subscribed.pull(id);
                        doc.save({}).then(_ => {
                            message.react('👍');
                        })
                    });
                });
                break;
            }

            case 'list': {
                Guild.findOne({ server: message.guild.id.toString() }).then(async guild => {
                    const ids = guild.subscribed;
                    const names = new Map();

                    // Get channel names
                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];
                        const name = await youtube.getChannelNameFromID(id);
			if (!name)
			    continue;
                        names.set(id, name);
                    }

                    // Construct fields for Discord
                    let fields = [];
                    names.forEach((value, key) => {
                        fields.push({ name: value, value: 'https://youtube.com/channel/' + key });
                    });

                    // Sort alphabetically
                    fields.sort(function (a, b) {
                        return (a.name.toLowerCase() < b.name.toLowerCase()) ? -1 : 1;
                    });

                    // Create embeds
                    const embeds = [];
                    while (fields.length > 0) {
                        let temp = fields.slice(0, 25);
                        fields = fields.slice(25);
                        const embed = new Discord.MessageEmbed()
                            .setColor('#FF0000')
                            .setTitle('Subscribed Channels')
                            .setDescription("Here are all of the channels you're subscribed to!")
                            .addFields(temp)
                            .setTimestamp()
                            .setFooter('Generated by a bot! Bleep, bloop');
                        embeds.push(embed);
                    }

                    // Send down the line
                    message.guild.channels.fetch(guild.channel_out).then(channel => {
                        channel.send({ embeds });
                        message.react('👍');
                    });

                });

                break;
            }

            case 'ping': {
                // Testing only
                if (process.env.MODE === 'production')
                    break;

                Guild.findOne({ server: message.guild.id.toString() }).then(doc => {
                    message.guild.channels.fetch(doc.channel_out).then(channel => {
                        channel.send("pong!");
                    });
                });

                break;
            }
        }
    }
});

// Login
client.login(config['token']);

function getVideoLink(data)
{
    console.log(data.toString());
    const video = xml.parse(data.toString());
    console.log(video);

    // Ignore deleted videos
    if (video.feed['at:deleted-entry']) {
        return [];
    }

    return [
        'https://youtube.com/watch?v=' + video.feed.entry['yt:videoId'],
        video.feed.entry['yt:channelId']
    ];
}

// Listen to feed
if (process.env.MODE !== 'development') {
    subscriber.listen(22765);
    console.log("Feed listening on 22765");
}

// const test_link = getVideoLink(fs.readFileSync(path.join(__dirname, 'test.xml')));
// console.log(test_link);
