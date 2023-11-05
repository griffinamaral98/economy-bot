const {
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

const choices = [
  { name: "Rock", emoji: "🤘", beats: "Scissors" },
  { name: "Paper", emoji: "📃", beats: "Rock" },
  { name: "Scissors", emoji: "✂", beats: "Paper" },
];

const UserProfile = require("../../schemas/UserProfile");

module.exports = {
  run: async ({ interaction }) => {
    try {
      const targetUser = interaction.options.getUser("user");
      const amountToWager = interaction.options.getInteger("amount");

      if (interaction.user.id === targetUser.id) {
        interaction.reply({
          content: "You cannot play rock paper scissors with yourself.",
          ephemeral: true,
        });
        return;
      }

      if (targetUser.bot) {
        interaction.reply({
          content: "You cannot play rock paper scissors with a bot.",
          ephemeral: true,
        });
        return;
      }

      let userProfile = await UserProfile.findOne({
        userId: interaction.user.id,
      }).select("userId balance");

      if (!userProfile || userProfile.balance < amountToWager) {
        await interaction.reply({
          content: "You don't have enough money to place this wager.",
          ephemeral: true,
        });
      }

      userProfile.balance -= amountToWager;
      await userProfile.save();

      let targetUserProfile = await UserProfile.findOne({
        userId: targetUser.id,
      }).select("userId balance");

      if (!targetUserProfile || targetUserProfile.balance < amountToWager) {
        await interaction.reply({
          content: `${targetUser} doesn't have enough balance to match the wager.`,
          ephemeral: true,
        });
        return;
      }

      targetUserProfile.balance -= amountToWager;
      await targetUserProfile.save();

      const embed = new EmbedBuilder()
        .setTitle("Rock Paper Scissors")
        .setDescription(`It's currently ${targetUser}'s turn.`)
        .setColor("Yellow")
        .setTimestamp(new Date());

      const buttons = choices.map((choice) => {
        return new ButtonBuilder()
          .setCustomId(choice.name)
          .setLabel(choice.name)
          .setStyle(ButtonStyle.Primary)
          .setEmoji(choice.emoji);
      });

      const row = new ActionRowBuilder().addComponents(buttons);

      const reply = await interaction.reply({
        content: `${targetUser}, you have been challenged to a game of Rock Paper Scissors, by ${interaction.user} with a wager amount of $${amountToWager}. To start playing, click one of the buttons below.`,
        embeds: [embed],
        components: [row],
      });

      const targetUserInteraction = await reply
        .awaitMessageComponent({
          filter: (i) => i.user.id === targetUser.id,
          time: 30_000,
        })
        .catch(async (error) => {
          embed.setDescription(
            `Game over. ${targetUser} did not respond in time.`
          );
          await reply.edit({ embeds: [embed], components: [] });
        });

      if (!targetUserInteraction) return;

      const targetUserChoice = choices.find(
        (choice) => choice.name === targetUserInteraction.customId
      );

      await targetUserInteraction.reply({
        content: `You picked ${targetUserChoice.name + targetUserChoice.emoji}`,
        ephemeral: true,
      });

      embed.setDescription(`It's currently ${interaction.user}'s turn.`);
      await reply.edit({
        content: `${interaction.user} it's your turn now.`,
        embeds: [embed],
      });

      const initialUserInteraction = await reply
        .awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: 30_000,
        })
        .catch(async (error) => {
          embed.setDescription(
            `Game over. ${interaction.user} did not respond in time.`
          );
          await reply.edit({ embeds: [embed], components: [] });
        });

      if (!initialUserInteraction) return;

      const initialUserChoice = choices.find(
        (choice) => choice.name === initialUserInteraction.customId
      );

      let result;

      if (targetUserChoice.beats === initialUserChoice.name) {
        result = `${targetUser} won!`;
        targetUserProfile.balance += 2 * amountToWager;
        await targetUserProfile.save();
      }

      if (initialUserChoice.beats === targetUserChoice.name) {
        result = `${interaction.user} won!`;
        userProfile.balance += 2 * amountToWager;
        await userProfile.save();
      }

      if (targetUserChoice.name === initialUserChoice.name) {
        result = "It was a tie!";
        userProfile.balance += amountToWager;
        targetUserProfile.balance += amountToWager;
        await Promise.all([userProfile.save(), targetUserProfile.save()]);
      }

      embed.setDescription(
        `${targetUser} picked ${
          targetUserChoice.name + " " + targetUserChoice.emoji
        }\n${interaction.user} picked ${
          initialUserChoice.name + " " + initialUserChoice.emoji
        }\n\n${result}`
      );

      reply.edit({ embeds: [embed], components: [] });
    } catch (error) {
      console.log(`Error with /rps. Error: ${error}`);
    }
  },

  data: {
    name: "rps",
    description: "Play rock paper scissors with another user.",
    dm_permission: false,
    options: [
      {
        name: "user",
        description: "The user you want to play with.",
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: "amount",
        description: "The amount you want to wager.",
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
    ],
  },
};
