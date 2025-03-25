# Discord MCP Bot - Server Component

A Discord bot server that integrates with [Mastra's MCP Bot component](https://github.com/mastra-ai/discord-mcp-bot) to provide intelligent assistance and answer questions about Mastra.ai.

## Overview

This Discord bot server works with the Mastra MCP component to:
- Handle Discord interactions and message routing
- Manage bot commands and permissions
- Provide Discord-specific functionality like threads and DMs
- Interface with the Mastra component for intelligent responses

## Prerequisites

- Node.js v20.0+
- npm
- Discord bot token
- Access to [discord-mcp-bot](https://github.com/mastra-ai/discord-mcp-bot) component

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/mastra-ai/discord-mcp-server
   cd discord-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Discord credentials:
   ```
   DISCORD_BOT_TOKEN=your_discord_bot_token  
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_PUBLIC_KEY=your_discord_public_key
   MASTRA_URL=your_mastra_url
   ```

4. Run the server:
   ```bash
   npm start
   ```

## Setting Up a Discord Bot

1. Create a Discord application:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" tab and click "Add Bot"

2. Configure bot permissions:
   - Under "Privileged Gateway Intents", enable:
     - Message Content Intent
     - Server Members Intent
     - Direct Message Intent

3. Get your bot token:
   - In the Bot tab, click "Reset Token" or "Copy" to get your bot token
   - Add this token to your `.env` file as `DISCORD_BOT_TOKEN`

4. Invite the bot to your server:
   - Go to the "OAuth2" tab, then "URL Generator"
   - Select "bot" under scopes
   - Select required permissions:
     - Read Messages/View Channels
     - Send Messages
     - Read Message History
   - Copy the generated URL and open it in your browser
   - Select your server and authorize the bot

## Features

- **Direct Message Support**: Users can DM the bot to ask questions
- **Slash Commands**: Uses Discord's slash commands to interact with the bot
   - `/ask`: Ask the bot a question
   - `/cleardm`: Clear the bot messages in the user's DMs
- **Threads**: Uses Discord's threads to provide a better user experience
- **Integration**: Seamless integration with the Mastra MCP component

## Project Structure

- `api/index.ts`: Main bot implementation and Discord client setup
- `scripts/register-commands.ts`: Register the bot commands
- `scripts/delete-commands.ts`: Delete the bot commands
- `scripts/list-commands.ts`: List the bot commands

## Implementation Notes

The server is built with:
- Discord.js for Discord integration
- TypeScript for type safety and better development experience
- Integration with Mastra MCP component for intelligent responses

For production deployment, consider:
- Setting up proper logging
- Implementing rate limiting
- Adding monitoring and error tracking
- Setting up a process manager (PM2, etc.)

## Related Projects

- [discord-mcp-bot](https://github.com/mastra-ai/discord-mcp-bot): Handles Mastra-specific functionality and intelligent responses
