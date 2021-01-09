const sqlite3 = require("better-sqlite3");
const db = sqlite3("data.db");

db.prepare(`create table if not exists Events (
  eventMessageId text not null, 
  emote text not null, 
  role text, 
  allowLate bit default 1, 
  earlyRoles bit default 1, 
  hosts text, 
  startDate int, 
  endDate int)`).run();
  
db.prepare(`create table if not exists RoleMessages (
  roleMessageId text not null,
  emote text not null,
  roleId text not null
  )`).run();
  
db.prepare(`create table if not exists VoiceAndTextChannels (
  voiceChannelId text not null,
  textChannelId text not null
  )`).run()

module.exports = db;