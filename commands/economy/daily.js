const UserProfile = require("../../schemas/UserProfile");

const dailyAmount = 500;

module.exports = {
  run: async ({ interaction }) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: "You can only run this command in a server.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply();

      let userProfile = await UserProfile.findOne({
        userId: interaction.member.id,
      });

      console.log("Retrieved userProfile:", userProfile);

      if (!userProfile) {
        console.log("Creating new userProfile...");

        userProfile = new UserProfile({
          userId: interaction.member.id,
          balance: dailyAmount,
          lastDailyCollected: new Date(),
        });
      } else {
        const lastDailyDate = userProfile.lastDailyCollected?.toDateString();
        const currentDate = new Date().toDateString();

        if (lastDailyDate === currentDate) {
          interaction.editReply(
            "You have already collected your dailies today. You can collect more tomorrow"
          );
          return;
        }

        userProfile.balance = (userProfile.balance || 0) + dailyAmount;
        userProfile.lastDailyCollected = new Date();
      }

      await userProfile.save();

      interaction.editReply(
        `$${dailyAmount} was added to your balance.\nNew balance: $${userProfile.balance}`
      );
    } catch (error) {
      console.log(`Error handling /daily: ${error}`);
    }
  },

  data: {
    name: "daily",
    description: "Collect your dailies!",
  },
};
