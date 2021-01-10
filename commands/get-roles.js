const db = require("../database");
const Commands = require("../commands");

const Regex = /(?<action>new|add|remove|delete|del|list|all|get)(( -(?<scope>roleid|rid|id|i|rolename|name|n)( (?<role>\S+)?))?)?/mi;

module.exports = function() {
  new Commands.new("getrole", ["gr", "role", "r", "selfrole", "sr"], "utils", async (bot, args, msg) => {
    
    switch (true) {
		
      case Regex.test(args):
        
        const Input = args.match(Regex).groups;
        const GuildRoles = msg.channel.guild.roles;
        const Scope = {
          "roleid": "id",
          "rid": "id",
          "id": "id",
          "i": "id",
          "rolename": "name",
          "name": "name",
          "n": "name"
        }[Input.scope];
        
        function getGuildRole(role) {
          return GuildRoles.find((iRole) => {
            return iRole[Scope].toLowerCase() === role.toLowerCase();
          });
        };
        
        switch (Input.action) {
          
          case "new":
          case "add":
          
            // Let's do some checks
            await msg.channel.sendTyping();
            
            // Make sure that they have permission
            if (!msg.member.permissions.has("administrator") && (!msg.member.permissions.has("manageRoles") || !msg.member.permissions.has("manageServer"))) {
              return;
            };
            
            // Make sure we have everything we need
            if (!Input.scope | !Input.role) {
              await msg.channel.createMessage({
                content: "What's the " + (Input.scope ? "role" : "scope") + "?",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Make sure the role exists
            let role = GuildRoles.find((iRole) => {
              return iRole[Scope] === Input.role;
            });
            
            if (!role) {
              await msg.channel.createMessage({
                content: "I couldn't find that role.",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Everything looks right! Let's save it.
            db.prepare("insert into SelfRoles (roleId) values (?)")
              .run(role.id);
              
            // Tell em everything's good
            await msg.channel.createMessage({
              content: "Members can now get the **" + role.name + "** role!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
            
          case "delete":
          case "del":
          
            // Let's do some checks
            await msg.channel.sendTyping();
            
            // Make sure that they have permission
            if (!msg.member.permissions.has("administrator") && (!msg.member.permissions.has("manageRoles") || !msg.member.permissions.has("manageServer"))) {
              return;
            };
            
            // Make sure we have everything we need
            if (!Input.scope | !Input.role) {
              await msg.channel.createMessage({
                content: "What's the " + (Input.scope ? "role" : "scope") + "?",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Find the role
            const RoleId = Scope === "id" ? Input.role : (() => {
              return GuildRoles.find((iRole) => {
                return iRole.name === Input.role;
              }).id;
            })();
            
            // Check if the role is in the database
            if (db.prepare("select * from SelfRoles where roleId = (?)").get(RoleId)) {
              
              // Delete it
              db.prepare("delete from SelfRoles where roleId = (?)").run(RoleId);
              
            };
            
            // Done!
            await msg.channel.createMessage({
              content: "Members can no longer get that role!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
            
          case "all":
          case "list":
            
            // Get the roles and turn them into a string
            const Roles = db.prepare("select * from SelfRoles").all();
            var descRoles = "";
            
            for (var i = 0; Roles.length > i; i++) {
              
              // Check if role exists
              var guildRole = getGuildRole(Roles[i].roleId, "id");
              
              descRoles = descRoles + 
                          (i !== 0 ? "\n" : "") + "**" + // line break
                          (guildRole ? "🔖 " + guildRole.name : "⚠ `<DELETED ROLE>`") + // role name
                          "** (" + guildRole.id + ")"; // role ID
              
            };
            
            await msg.channel.createMessage({
              content: "All members can get these roles at the moment:",
              embed: {
                description: descRoles
              },
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });

            break;
            
          case "remove":
            
            // Let's do some checks
            await msg.channel.sendTyping();
            
            // Make sure we have everything we need
            if (!Input.scope | !Input.role) {
              await msg.channel.createMessage({
                content: "What's the " + (Input.scope ? "role" : "scope") + "?",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            function getRoleFromMember() {
              
              // Make sure role exists
              var guildRole = getGuildRole(Input.role);
              
              // Make sure they have it
              return guildRole && msg.member.roles.find((iRole) => {
                return iRole === guildRole.id;
              }) ? guildRole : undefined;
              
            };
            
            var requestedRole = getRoleFromMember();
            
            if (!requestedRole) {
              await msg.channel.createMessage({
                content: "You don't have that role!",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Make sure it's an available role
            if (!db.prepare("select * from SelfRoles where roleId = (?)").get(requestedRole.id)) {
              await msg.channel.createMessage({
                content: "Sorry, but that role isn't on the self-role list. I can't remove it from you.",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Give em the role
            await msg.member.removeRole(requestedRole.id, "Asked for it");
            
            // And we're done
            await msg.channel.createMessage({
              content: "Done!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
          
          case "get":
          
            // Let's do some checks
            await msg.channel.sendTyping();
            
            // Make sure we have everything we need
            if (!Input.scope | !Input.role) {
              await msg.channel.createMessage({
                content: "What's the " + (Input.scope ? "role" : "scope") + "?",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Make sure the role exists
            var requestedRole = getGuildRole(Input.role, Scope);
            if (!requestedRole) {
              await msg.channel.createMessage({
                content: "That role doesn't exist in this server!",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Make sure it's an available role
            if (!db.prepare("select * from SelfRoles where roleId = (?)").get(requestedRole.id)) {
              await msg.channel.createMessage({
                content: "Sorry, but you can't get that role from me!",
                messageReferenceID: msg.id,
                allowedMentions: {
                  repliedUser: true
                }
              });
              return;
            };
            
            // Give em the role
            await msg.member.addRole(requestedRole.id, "Asked for it");
            
            // And we're done
            await msg.channel.createMessage({
              content: "Done!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
          
          default:
            break;
          
        };
      
      default:
        break;
		
    };
    
  });
};