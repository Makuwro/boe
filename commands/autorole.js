const db = require("../database");
const Commands = require("../commands");

const Regex = /(?<action>new|add|remove|delete|del|list|all)(( -(?<scope>roleid|rid|id|i|rolename|name|n)( (?<role>\S+)?))?)?/mi;

module.exports = function() {
  new Commands.new("defaultrole", ["drole"], "utils", async (bot, args, msg) => {
    
    switch (true) {
		
      case Regex.test(args):
        
        const Input = args.match(Regex).groups;
        
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
            const GuildRoles = msg.channel.guild.roles;
            var scope;
            switch (Input.scope) {
              
              case "roleid":
              case "rid":
              case "id":
              case "i":
                
                scope = "id";
                break;
                
              case "rolename":
              case "name":
              case "n":
              
                // TODO: Fuzzy search
                scope = "name";
                break;
                
              default:
                break;
              
            };
            
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
            break;
            
          case "all":
          case "list":
            break;
            
          default:
            break;
          
        };
      
      default:
        break;
		
    };
    
  });
};