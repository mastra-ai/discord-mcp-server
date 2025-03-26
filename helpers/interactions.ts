import { retryableFetch } from "./fetch.js";

// Add these interfaces at the top of the file
interface DiscordMessage {
  id: string;
  author: {
    id: string;
  };
}

export interface DiscordThread {
  id: string;
  name: string;
}

export interface MastraResponse {
  text: string;
}

export const MAX_MESSAGE_LENGTH = 2000;
export const DISCORD_MESSAGE_LENGTH_LIMIT = 2000;
export const COOLDOWN_PERIOD = 10000; // 10 seconds
export const userCooldowns = new Map<string, number>();

export async function updateDiscordMessage(
  interaction: any,
  content: string,
  threadId?: string
) {
  try {
    let url;
    const options: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    };

    if (threadId) {
      url = `https://discord.com/api/v10/channels/${threadId}/messages`;
    } else {
      url = `https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages`;
    }

    const response = await retryableFetch<DiscordMessage>(url, options);
    if (!response) throw new Error("Failed to update message");
    return response;
  } catch (error) {
    console.error(
      `Failed to update message${threadId ? ` in thread ${threadId}` : ""}:`,
      error
    );
    throw error;
  }
}

export async function clearBotDirectMessages(interaction: any): Promise<void> {
  let messagesDeleted = 0;
  let lastId;

  try {
    while (true) {
      console.log("Fetching messages batch, lastId:", lastId);

      try {
        const url: string = `https://discord.com/api/v10/channels/${
          interaction.channel_id
        }/messages?limit=100${lastId ? `&before=${lastId}` : ""}`;

        const options = {
          method: "GET", // Explicitly setting the method
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
        };

        const messages = await retryableFetch<DiscordMessage[]>(url, options);
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          break;
        }

        const botMessages = messages.filter(
          (msg) => msg.author.id === interaction.application_id
        );
        console.log(`Found ${botMessages.length} bot messages to delete`);

        for (const message of botMessages) {
          try {
            const deleteUrl = `https://discord.com/api/v10/channels/${interaction.channel_id}/messages/${message.id}`;
            await retryableFetch(deleteUrl, {
              method: "DELETE",
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json",
              },
            });
            messagesDeleted++;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit compliance
          } catch (deleteError) {
            console.error(`Failed to delete message:
              Message ID: ${message.id}
              Channel ID: ${interaction.channel_id}
              Error: ${deleteError}
            `);
          }
        }

        lastId = messages[messages.length - 1].id;
      } catch (batchError) {
        console.error(`Batch processing failed:
          Channel ID: ${interaction.channel_id}
          Last Message ID: ${lastId || "N/A"}
          Messages Deleted So Far: ${messagesDeleted}
          Error: ${batchError}
        `);
        break;
      }
    }
  } catch (error) {
    console.error(`Message cleanup failed:
      Channel ID: ${interaction.channel_id}
      Messages Deleted: ${messagesDeleted}
      Error: ${error}
    `);
    throw error;
  }
}

export async function createThread(channelId: string, name: string) {
  try {
    const response = await retryableFetch<DiscordThread>(
      `https://discord.com/api/v10/channels/${channelId}/threads`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Chat with ${name}`,
          auto_archive_duration: 60,
          type: 11,
        }),
      }
    );
    if (!response?.id) {
      throw new Error(`Failed to create thread:
        Channel ID: ${channelId}
        Thread Name: Chat with ${name}
        Response: ${JSON.stringify(response)}`);
    }

    return response;
  } catch (error) {
    console.error(`Thread creation failed:
      Channel ID: ${channelId}
      Thread Name: Chat with ${name}
      Error: ${error}
    `);
    throw error;
  }
}

export async function generateMastraResponse(content: string) {
  try {
    const response = await retryableFetch<MastraResponse>(
      `${process.env.MASTRA_URL}/api/agents/discordMCPBotAgent/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content }] }),
      }
    );
    return response;
  } catch (error) {
    console.error(`Mastra generation failed:
      Input length: ${content.length} characters
      Error: ${error}
    `);
    throw error;
  }
}
