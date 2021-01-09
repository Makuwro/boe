const db = require("../database");
const Commands = require("../commands");

const Regex = /(?<action>new|add|remove|delete|del|list|all)(( -(?<scope>roleid|rid|id|i|rolename|name|n)( (?<role>\S+)?))?)?/mi;

module.exports = function() {
  new Commands.new("defaultrole", ["drole"], "utils", async (bot, args, msg) => {
    
    // Make sure that they have permission
    if (!msg.member.permissions.has("manageRoles") || !msg.member.permissions.has("manageServer")) {
      return;
    };
    
    switch (true) {
		
      case Regex.test(args):
        
        const Input = args.match(Regex).groups;
        const GuildRoles = msg.channel.guild.roles;
        
        function getScope() {
          
          return {
            "roleid": "id",
            "rid": "id",
            "id": "id",
            "i": "id",
            "rolename": "name",
            "name": "name",
            "n": "name"
          }[Input.scope];
          
        };
        
        switch (Input.action) {
          
          case "new":
          case "add":
          
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
            let scope = getScope();
            let role = GuildRoles.find((iRole) => {
              return iRole[scope] === Input.role;
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
            db.prepare("insert into DefaultRoles (roleId) values (?)")
              .run(role.id);
              
            // Tell em everything's good
            await msg.channel.createMessage({
              content: "I will give new members the **" + role.name + "** role!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
            
          case "delete":
          case "del":
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
            
            // Find the role
            const RoleId = getScope() === "id" ? Input.role : (() => {
              return GuildRoles.find((iRole) => {
                return iRole.name === Input.role;
              }).id;
            })();
            
            // Check if the role is in the database
            if (db.prepare("select * from DefaultRoles where roleId = (?)").get(RoleId)) {
              
              // Delete it
              db.prepare("delete from DefaultRoles where roleId = (?)").run(RoleId);
              
            };
            
            // Done!
            await msg.channel.createMessage({
              content: "I will no longer give new members that role!",
              messageReferenceID: msg.id,
              allowedMentions: {
                repliedUser: true
              }
            });
            
            break;
            
          case "all":
          case "list":
            
            // Get the roles and turn them into a string
            const Roles = db.prepare("select * from DefaultRoles").all();
            var descRoles = "";
            
            function getGuildRole(roleId) {
              return GuildRoles.find((iRole) => {
                return iRole.id === roleId;
              });
            };
            
            for (var i = 0; Roles.length > i; i++) {
              
              // Check if role exists
              const GuildRole = getGuildRole(Roles[i].roleId);
              
              descRoles = descRoles + 
                          (i !== 0 ? "\n" : "") + "**" + // line break
                          (GuildRole ? "🔖 " + GuildRole.name : "⚠ `<DELETED ROLE>`") + // role name
                          "** (" + GuildRole.id + ")"; // role ID
              
            };
            
            await msg.channel.createMessage({
              content: "Here are the roles I'm giving the new members now:",
              embed: {
                description: descRoles
              },
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