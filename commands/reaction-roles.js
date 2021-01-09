const cache = require("../cache");
const db = require("../database");
const Commands = require("../commands");

const NewRRRegex = /new( -(e|emoji) (?<emoji>\S+))?( -(c|cid|channel|channelid) (?<channelId>\S+))?( -(m|mid|message|messageId) (?<messageId>\S+))?( -(r|rid|role|roleid|) (?<roleId>\S+))?/mi;

module.exports = function() {
	new Commands.new("rr", ["reactionrole"], "roles", async (bot, args, msg) => {
    
    switch (true) {
      
      case NewRRRegex.test(args):
      
        const Input = args.match(NewRRRegex).groups;
        
        // Let's do some checks
        await msg.channel.sendTyping();
        
        // Make sure every variable was supplied
        if (!Input.channelId || !Input.messageId || !Input.roleId || !Input.emoji) {
          console.log(Input.emoji)
          msg.channel.createMessage({
            content: "What's the " + (Input.emoji ? (
              (
                Input.channelId ? (
                  Input.messageId ? "role" : "message"
                ) : "channel"
              ) + " ID"
            ) : "emoji") + "?",
            messageReferenceID: msg.id,
            allowedMentions: {
              repliedUser: true
            }
          });
          return;
        };
        
        // Now let's make sure that the bot
        // can access the message and channel
        var reactMessage;
        try {
          reactMessage = await bot.getMessage(Input.channelId, Input.messageId);
        } catch (err) {
          msg.channel.createMessage({
            content: "Message " + Input.messageId + " doesn't exist in <#" + Input.channelId + ">",
            messageReferenceID: msg.id,
            allowedMentions: {
              repliedUser: true
            }
          });
          return;
        };
        
        // Let's make sure that the role exists
        function findRole(currentRole) {
          return currentRole.id === Input.roleId;
        };
        
        if (!msg.channel.guild.roles.find(findRole)) {
          msg.channel.createMessage({
            content: "I couldn't find Role " + Input.roleId + " in this server.",
            messageReferenceID: msg.id,
            allowedMentions: {
              repliedUser: true
            }
          });
          return;
        };
        
        // Let's make sure that we can
        // use that emoji
        var emoji = Input.emoji.includes("<") ? Input.emoji.substring(1, Input.emoji.length - 1) : Input.emoji;
        try {
          await msg.addReaction(emoji);
          await msg.removeReaction(emoji);
        } catch (err) {
          msg.channel.createMessage({
            content: "I couldn't add that emoji to your message! Do I have permission to react in this channel or are you flexing your Nitro?",
            messageReferenceID: msg.id,
            allowedMentions: {
              repliedUser: true
            }
          });
          return;
        };
        
        // Check permission in the channel
        const ReactChannel = bot.getChannel(Input.channelId);
        if (!ReactChannel.permissionsOf(bot.user.id).has("addReactions")) {
          msg.channel.createMessage({
            content: "I don't have permission to react in <#" + Input.channelId + ">...",
            messageReferenceID: msg.id,
            allowedMentions: {
              repliedUser: true
            }
          });
          return;
        };
        
        // Register this into the database
        db.prepare("insert into RoleMessages (roleMessageId, emote, roleId) values (?, ?, ?)")
          .run(Input.messageId, emoji, Input.roleId);
        
        // Add the reaction
        await reactMessage.addReaction(emoji);
        
        // Everything is OK!
        msg.channel.createMessage({
          content: "Self-role message created!",
          messageReferenceID: msg.id,
          allowedMentions: {
            repliedUser: true
          }
        });
        
        break;
      
      default: 

        break;
      
    };
  });
};