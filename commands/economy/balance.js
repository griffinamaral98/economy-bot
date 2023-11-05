const { ApplicationCommandOptionType } = require("discord.js");
const UserProfile = require("../../schemas/UserProfile");

module.exports = {
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
      return;
    }

    const targetUserId =
      interaction.options.getUser("target-user")?.id || interaction.user.id;

    await interaction.deferReply();

    try {
      let userProfile = await UserProfile.findOne({ userId: targetUserId });

      if (!userProfile) {
        userProfile = new UserProfile({ userId: targetUserId });
      }

      interaction.editReply(
        targetUserId === interaction.user.id
          ? `Your balance is $${userProfile.balance}`
          : `<@${targetUserId}>'s balance is $${userProfile.balance}`
      );
    } catch (error) {
      console.log(`Error handling /balance: ${error}`);
    }
  },

  data: {
    name: "balance",
    description: "Check your balance.",
    options: [
      {
        name: "target-user",
        description: "Check the balance of another user.",
        type: ApplicationCommandOptionType.User,
      },
    ],
  },
};
