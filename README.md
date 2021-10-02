# We Subbed

## Developer's Note:

I made this in a weekend in an attempt to provide a better alternative to [subscrybe](https://subscrybe.me/discord),
who recently decided to link to an embed on their own website instead of a link
to YouTube itself. I also think that a project of this nature would benefit from
being open source, of which subscrybe does not appear to be.

This is fresh out of development, so there's probably a few bugs,
but I am **not** planning on actively developing this project. I will fix critical
bugs as they come in, but not much else. If there is community interest in continuing
the development of this bot, please feel free to send PR's my way, I'd be happy to merge
it into the official project.

## Community Usage

Please go to the [landing page](https://wesubbed.com) to add this bot to your server. The commands
are also listed in an easy to read format over there.

## Development

Until I have the time, I'm not going to create detailed instructions on how to get your development
environment set up, and I will trust the developer to follow the necessary steps and documentation
for the API's used in this project.

### Merge Requests

If you wish to work on this bot, go ahead and follow the instructions below to set up a dev environment.
At this time, the best course of action for getting your changes merged in would be to fork the project,
and create a merge request when you are finished with your work. There is no automatic deployment at this
moment, so your changes may not reflect immediately in production, but once that gets set up, it should be
pretty quick.

### config.json

Because of the delicate nature of API keys, `config.json` is not to be checked into git with _any_. There
is instead a template you can use to develop with. Just copy the file and rename it to `config.json`, and
enter in your keys and data for testing. These keys can be obtained by following the instructions, and platform
documentation below.

### Discord API

For testing purposes, you can create your own Discord application and bot. `config['token']` refers to
the Discord bot token. This is not aptly named, and will likely change in the future. `config['prefix']`
denotes the command the bot will look for.

### Youtube Data API v3

In order to gather channel information as well as subscribe to channel atom feeds, the YouTube Data API
is needed. This is more complicated to set up, but the necessary documentation can be found
[here](https://developers.google.com/youtube/registering_an_application) to set up an API key.
`config['yt_api']` refers to the API key you'll generate.

### Pubsubhubbub

This is one of the worst pieces of technology I've ever dealt with, and it's a wonder why Google decided
to use this instead of just normal webhooks. But it's what we've got. All you'll need to test this is
a host and a port. Port forwarding is the best option for this. `config['callback']` is what the API
will use to tell YouTube where to send the new video payload.

### MongoDB

The bot uses MongoDB to keep track of all of the guilds, and all of the channel ID's these guilds are
subscribed to. As a result, you'll need to have MongoDB installed on your machine and running during
testing. This is trivial on Windows/Mac, but less so on Linux. Please follow the documentation for your
distribution to install the software.