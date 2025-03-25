import express from "express";
import { config } from "dotenv";
import { InteractionResponseType, InteractionType, verifyKey } from "discord-interactions";
import {
  clearBotDirectMessages,
  COOLDOWN_PERIOD,
  DISCORD_MESSAGE_LENGTH_LIMIT,
  MAX_MESSAGE_LENGTH,
  updateDiscordMessage,
  userCooldowns,
  createThread,
  generateMastraResponse,
} from "../helpers";

config();

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

async function handleResponse(
  text: string,
  interaction: any,
  threadId?: string
): Promise<void> {
  let remaining = text;

  while (remaining.length > 0) {
    const chunk = remaining.slice(0, DISCORD_MESSAGE_LENGTH_LIMIT);
    remaining = remaining.slice(DISCORD_MESSAGE_LENGTH_LIMIT);
    await updateDiscordMessage(interaction, chunk, threadId);
  }
}

app.post("/api/interactions", async (req: any, res: any) => {
  const signature = req.headers["x-signature-ed25519"] as string;
  const timestamp = req.headers["x-signature-timestamp"] as string;

  if (!signature || !timestamp) {
    return res.status(401).send("Invalid request signature");
  }

  const isValidRequest = await verifyKey(
    Buffer.from(JSON.stringify(req.body)),
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValidRequest) {
    return res.status(401).send("Invalid request signature");
  }
  const interaction = req.body;
  if (interaction.type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }
  const isDM = interaction.channel.type === 1;
  const isThread = interaction.channel.type === 11;
  const userId = isDM ? interaction.user.id : interaction.member.user.id;

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;

    if (name === "cleardm") {
      if (!isDM) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "This command can only be used in DMs." },
        });
      }

      await res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Deleting my messages..." },
      });

      try {
        await clearBotDirectMessages(interaction);
      } catch (error) {
        console.error("Error:", error);
        await updateDiscordMessage(interaction, "Error clearing messages.");
      }
      return;
    }

    if (name === "ask") {
      let threadId;
      try {
        const content = interaction.data.options[0].value;
        const username = isDM
          ? interaction.user.username
          : interaction.member.user.username;

        if (content.length > MAX_MESSAGE_LENGTH) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Sorry, your message is too long (${content.length} characters). Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
            },
          });
        }

        const now = Date.now();
        const cooldownEnd = userCooldowns.get(userId) || 0;

        if (now < cooldownEnd) {
          const remainingTime = Math.ceil((cooldownEnd - now) / 1000);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Please wait ${remainingTime} seconds before sending another message.`,
            },
          });
        }

        userCooldowns.set(userId, now + COOLDOWN_PERIOD);

        if (!isDM && !isThread) {
          // Create thread
          const threadData = await createThread(
            interaction.channel_id,
            username
          );

          if (!threadData?.id) throw new Error("Failed to create thread");
          threadId = threadData.id;

          res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `I've created a thread for our conversation: <#${threadId}>`,
            },
          });

          // Echo the question
          await updateDiscordMessage(interaction, `> ${content}`, threadId);

          await updateDiscordMessage(
            interaction,
            "Thinking about your question...",
            threadId
          );
        } else {
          res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          });

          await updateDiscordMessage(interaction, `> ${content}`);
        }

        const mastraResponse = await generateMastraResponse(content);

        if (!mastraResponse?.text) {
          throw new Error("Invalid response from Mastra");
        }

        await handleResponse(mastraResponse.text, interaction, threadId);
      } catch (error) {
        userCooldowns.delete(userId);
        console.error(`Error processing /ask command for ${userId}:`, error);
        await updateDiscordMessage(
          interaction,
          "Sorry, I encountered an error processing your request.",
          threadId
        );
      }
      res.end();
      return;
    }
  }

  res.status(400).send("Unknown interaction type");
  return;
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;