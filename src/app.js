/* jshint esversion:8*/
const Discord = require("discord.js");
const PouchDB = require("pouchdb");
const db = new PouchDB("server_db");

const client = new Discord.Client();

const TOKEN = "NTgyMjk0ODQ4NTM5NzIxNzI5.XOrvUw.lF-RVfYZRjA1-vPzGk5SZXAvlOg";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(db.name + " is on");
  /*client.channels.forEach(c => {
        console.log("    " + c.name + " - " + c.id);
      });*/
});

client.on("guildMemberRemove", () => {});

client.on("message", msg => {
  if (
    msg.content.startsWith("!k ") &&
    !msg.author.bot &&
    msg.channel.type != "dm"
  ) {
    logToChannel(msg);
    let messageArr = msg.content.split(" ");
    messageArr = messageArr.slice(1);
    if (messageArr[0] == null) return;
    //remove empty elements
    for (var i = 0; i < messageArr.length; i++) {
      if (messageArr[i] === "") {
        messageArr.splice(i, 1);
        i--;
      }
    }
    console.log("org msg index 0: " + messageArr[0]);

    /*TODO: idsi verilen üyenin son mesaj tarihine bakılacak belirtilen süreden fazla is rolleri silinecek*/

    if (messageArr[0] == "help") {
      return helpEmbed(msg);
    }
    if (messageArr[0] == "setmuterole") {
      return setMuteRole(msg, messageArr[1]);
    }
    if (messageArr[0] == "msgdel") {
      let ch;
      messageArr = messageArr.slice(1);
      if (messageArr[0].startsWith("<#")) ch = msg.mentions.channels.first();
      else return msg.channel.send("channel söylenmedi");
      messageArr = messageArr.slice(1);
      ch.fetchMessage(messageArr[0])
        .then(msg => {
          if (msg) {
            msg.delete();
          }
        })
        .catch(err => {
          console.error(err);
        });
      return msg.delete();
    }

    if (messageArr[0] == "mute") {
      messageArr = messageArr.slice(1);
      let mute_role;
      db.get(msg.guild.id)
        .then(doc => {
          doc.muteRole == null
            ? msg.channel.send("There is no mute role. Use setmuterole.")
            : (mute_role = doc.muteRole);
        })
        .catch(function(err) {
          console.error(err);
        });
      let member = msg.mentions.members.first();
      let old_roles = [];
      member.roles.find(role => old_roles.push(role.id));
      member.removeRoles(old_roles);
      saveRoles(member, msg.guild, old_roles);
      //member.addRole(mute_role);
      messageArr = messageArr.slice(1);
      return msg.channel.send(member + " " + editMessage(messageArr));
    }

    if (messageArr[0] == "unmute") {
      let member = msg.mentions.members.first();
      let mute_role = msg.guild.roles.find(role => role.name === "Mahkûm");
      member.removeRole(mute_role);
      return msg.channel.send(member + " unmuted");
    }

    if (messageArr[0] == "setlogchannel") {
      messageArr = messageArr.slice(1);
      if (messageArr[0].startsWith("<#"))
        return addLogChannel(msg, messageArr[0]);
    }

    if (messageArr[0] == "delete") {
      msg.delete();
      messageArr = messageArr.slice(1);
      if (messageArr[0].startsWith("<#")) return sendToChannel(msg, messageArr);
      else return msg.channel.send(editMessage(messageArr));
    }

    if (messageArr[0].startsWith("<#")) {
      return sendToChannel(msg, messageArr);
    } else {
      return msg.channel.send(editMessage(messageArr));
    }
  }
});

function sendToChannel(msg, messageArr) {
  client.channels.find(channel => {
    if (channel == messageArr[0]) {
      channel.send(editMessage(messageArr.slice(1))).catch(e => {
        console.log(e);
        msg.channel.send("The bot cannot access " + channel);
      });
    }
  });
  return;
}

function helpEmbed(msg) {
  let helpEmbed = new Discord.RichEmbed()
    .setDescription("Bot Info")
    .setColor("#00ffef")
    .addField("help", "1")
    .addField("setlogchannel", "2")
    .addField("delete", "3");

  return msg.channel.send(helpEmbed);
}

function logToChannel(msg) {
  db.get(msg.guild.id)
    .then(doc => {
      client.channels.find(channel => {
        if (channel == doc.logChannel) {
          let logEmbed = new Discord.RichEmbed()
            .setDescription("Log")
            .setColor("#00ffef")
            .addField(
              "User",
              msg.author.username + "#" + msg.author.discriminator
            )
            .addField("ID", msg.author.id)
            .addField("Content", msg.content)
            .addField("Timestamp", msg.createdAt);

          return channel.send(logEmbed).catch(e => {
            console.log(e);
            msg.channel.send("The bot cannot access " + channel);
          });
        }
      });
    })
    .catch(e => {
      console.log(e);
    });
}

function addLogChannel(msg, channel) {
  let logChannel = {
    _id: msg.guild.id,
    logChannel: channel
  };
  db.put(logChannel, (err, res) => {
    if (!err) {
      msg.channel.send("Logs can be visible at " + channel);
    }
  });
}

function setMuteRole(msg, role) {
  let mute_role = msg.guild.roles.find(r => r.name === role);
  if (mute_role == null)
    msg.guild
      .createRole({
        name: "Muted",
        color: "RED"
      })
      .then(r =>
        msg.channel.send(
          `Created new role with name ${r.name} and color ${r.color}`
        )
      )
      .catch(console.error);
  db.get(msg.guild.id)
    .then(doc => {
      let new_doc = {
        _id: msg.guild.id,
        _rev: doc._rev,
        logChannel: doc.logChannel,
        muteRole: mute_role
      };
      db.put(new_doc, (err, res) => {
        if (err) {
          console.error(err);
        } else if (res) {
          msg.channel.send(mute_role + " seted for Mute role");
        }
      });
    })
    .catch(err => {
      console.log(err);
    });
}

function saveRoles(member, guild, old_roles) {
  console.log(member + " " + guild + " " + old_roles);
}

function editMessage(arr) {
  text = "";
  arr.forEach(i => {
    text += i + " ";
  });
  return text;
}

client.login(TOKEN);
