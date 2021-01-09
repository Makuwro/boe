// Get environment variables
require('dotenv').config();

// Require packagaes
const Eris = require("eris");
const fs = require("fs");
const path = require("path");
const bot = Eris(process.env.token);

// Get the database ready
const db = require("./database");
const cache = require("./cache");

// Experimental mode
const ExperimentalMode = true;

const RegularRoleId = "498493188357750814";
const RegularRequiredMsgAmount = 25;

// Process commands
const Commands = require("./commands");
  
fs.readdirSync(path.join(__dirname, "commands")).forEach(function(fileName) {
	const File = require("./commands/" + fileName);
	if (typeof(File) === "function") {
	  File(bot);
	}
});

Commands.registerBot(bot);

bot.on("messageCreate", async (msg) => {
  
  const ServerPrefix = Commands.getPrefix(msg.channel.id);
  
  // Check if they just want the bot prefix
  const AuthorPing = "<@" + msg.author.id + ">";
  if (msg.content === "<@" + bot.user.id + ">" || msg.content === "<@!" + bot.user.id + ">") {
    msg.channel.createMessage(AuthorPing + " My prefix is **`" + ServerPrefix + "`**!");
    return;
  };

  if (!msg.author.bot && msg.author.id !== bot.user.id && msg.content.substring(0, ServerPrefix.length) === ServerPrefix) {
    if (msg.content.indexOf(" ") != -1) {
      var commandName = msg.content.substring(1, msg.content.indexOf(" "));
      var args = msg.content.substring(msg.content.indexOf(" ")+1);
    } else {
      var commandName = msg.content.substring(1);
    };

    try {
      const Command = Commands.get(commandName.toLowerCase());
      Command ? Command.execute(args, msg) : undefined;
    } catch (err) {
      msg.channel.createMessage({
        content: AuthorPing + " Something bad happened! Please try again.",
        embed: {
          description: "Please [submit this report to Beastslash](https://github.com/beastslash/toasty/issues) if this continues. \nThink you can help us fix this? [Shoot a pull request](https://github.com/beastslash/toasty/pulls) our way!",
          fields: [{
            name: "Error",
            value: err.name + ": " + err.message
          }, {
            name: "Stack",
            value: err.stack
          }]
        }
      });
    };
    
  };
	
  if (!msg.author.bot && !msg.member.roles.find((role) => role.id === RegularRoleId)) {
    
    // Check if we can promote them
    const CurrentDate = new Date();
    const BeginningDate = new Date(CurrentDate.getFullYear() + "-" + (CurrentDate.getMonth() + 1) + "-01").getTime();
    
    var currentAmount = 0;
    const TextChannels = msg.channel.guild.channels.filter((channel) => channel.type === 0);
    for (var i = 0; TextChannels.length > i; i++) {
      
      const CurrentChannel = TextChannels[i];
      
      // Make sure it's a text channel that we can access
      if (CurrentChannel.type !== 0 || !CurrentChannel.permissionsOf(bot.user.id).has("readMessages") || !CurrentChannel.permissionsOf(bot.user.id).has("readMessageHistory")) continue;
      
      try {
        
        var currentMessages = await CurrentChannel.getMessages(100);
        
        for (x = 0; currentMessages.length > x; x++) {
          
          if (currentAmount >= RegularRequiredMsgAmount || currentMessages[x].createdAt < BeginningDate) break;
          
          if (currentMessages[x].author.id === msg.author.id && currentMessages[x].createdAt >= BeginningDate) currentAmount++;
          
        };
        
        if (currentAmount >= RegularRequiredMsgAmount) {
          
          await msg.member.addRole(RegularRoleId, "Reached " + RegularRequiredMsgAmount + " messages this month");
          break;
          
        };
        
      } catch (err) {
        
      };
      
    };
    
  };
  
  // Check if it's a QOTD
  function findSecondsRole(role) {
    return role === "602303279468118026";
  };
  
  if (msg.channel.id === "517078514277679152" && (msg.mentionEveryone || msg.roleMentions.find(findSecondsRole))) {
    msg.crosspost();
  };
  
});

bot.on("messageReactionAdd", async (msg, emoji, reactor) => {
  
  const Members = await msg.channel.guild.fetchMembers({userIDs: [bot.user.id, reactor.id]});
  const UserMember = Members[0];
  const BotMember = Members[1];
  
  console.log(BotMember);
  
  // Make sure they aren't a bot
  if (UserMember.bot) {
    return;
  };
  
  // Check if the message is a role message
  const RoleMessageInfo = db.prepare("select * from RoleMessages where roleMessageId = (?) and emote = (?)").get(msg.id, emoji.id || emoji.name);
  if (!RoleMessageInfo) {
    return;
  };
  
  // Check if we can add roles
  if (!BotMember.permissions.has("manageRoles")) {
    console.warn("Can't add roles");
    return;
  };
  
  UserMember.addRole(RoleMessageInfo.roleId, "Reacted to message associated with the role");
  
});

bot.on("messageReactionRemove", async (msg, emoji, userId) => {
  
  const Members = await msg.channel.guild.fetchMembers({userIDs: [bot.user.id, userId]});
  const UserMember = Members[0];
  const BotMember = Members[1];
  
  // Make sure they aren't a bot
  if (UserMember.bot) return;
  
  // Check if the message is a role message
  const RoleMessageInfo = db.prepare("select * from RoleMessages where roleMessageId = (?) and emote = (?)").get(msg.id, emoji.id || emoji.name);
  if (!RoleMessageInfo) return;
  
  // Check if we can add roles
  if (!BotMember.permissions.has("manageRoles")) {
    console.warn("Can't add roles");
    return;
  };
  
  UserMember.removeRole(RoleMessageInfo.roleId, "Removed reaction of message associated with the role");
  
});

bot.on("voiceChannelJoin", async (member, voiceChannel) => {
  
  if (member.bot) return;
  
  const VoiceAndTextChannelInfo = db.prepare("select * from VoiceAndTextChannels where voiceChannelId = (?)").get(voiceChannel.id);
  if (!VoiceAndTextChannelInfo) return;
  
  const TextChannel = bot.getChannel(VoiceAndTextChannelInfo.textChannelId);
  await TextChannel.editPermission(member.id, 1024, 0, "member", "Revealing hidden VC");
  
  console.log("Added " + member.id)
  
});

bot.on("voiceChannelLeave", async (member, voiceChannel) => {
  
  if (member.bot) return;
  
  const VoiceAndTextChannelInfo = db.prepare("select * from VoiceAndTextChannels where voiceChannelId = (?)").get(voiceChannel.id);
  if (!VoiceAndTextChannelInfo) {
    return;
  };
  
  const TextChannel = bot.getChannel(VoiceAndTextChannelInfo.textChannelId);
  await TextChannel.deletePermission(member.id, "Hiding VC again");
  
  console.log("Remove " + member.id)
  
});

bot.on("voiceChannelSwitch", async (member, newVC, oldVC) => {
  
  if (member.bot) return;
  
  const OldVoiceAndTextChannelInfo = db.prepare("select * from VoiceAndTextChannels where voiceChannelId = (?)").get(oldVC.id);
  if (OldVoiceAndTextChannelInfo) {
    try {
      let textChannel = bot.getChannel(OldVoiceAndTextChannelInfo.textChannelId);
      await textChannel.deletePermission(member.id, "Hiding VC again");
    } catch (err) {
      
    };
  };
  
  const NewVoiceAndTextChannelInfo = db.prepare("select * from VoiceAndTextChannels where voiceChannelId = (?)").get(newVC.id);
  if (NewVoiceAndTextChannelInfo) {
    try {
      var textChannel = bot.getChannel(NewVoiceAndTextChannelInfo.textChannelId);
      await textChannel.editPermission(member.id, 1024, 0, "member", "Revealing hidden VC");
      
    } catch (err) {
      
    };
  };
  
});

bot.on("guildMemberAdd", async (guild, member) => {
  
  // Check if there are any default roles
  // and give it to em 
  const DefaultRoles = db.prepare("select * from DefaultRoles").all();
  for (var i = 0; DefaultRoles.length > i; i++) {
    
    await member.addRole(DefaultRoles[i].roleId);
    
  };
  
});

bot.on("error", (err) => {
  
});

bot.on("ready", () => {
  
  console.log("Not ready");
  
  if (ExperimentalMode) {
    bot.editStatus("idle", {name: "Maintenance Mode: " + new Date().getTime().toString()});
  };
  
  console.log("Ready!");
  
});

bot.connect();