const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
    REST,
    Routes,
    SlashCommandBuilder,
    AttachmentBuilder
} = require('discord.js');

// ================== ENV CONFIG ==================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TEAM_ROLE_ID = process.env.TEAM_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ================== CLIENT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================== STATS ==================
let stats = { support: 0, ideas: 0, reports: 0, apps: 0 };

// ================== SLASH COMMANDS ==================
const commands = [
    new SlashCommandBuilder()
        .setName('setup-tickets')
        .setDescription('Erstellt das Ticket Panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ticket-stats')
        .setDescription('Zeigt Ticket Statistiken')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Slash Commands registriert");
    } catch (err) {
        console.error(err);
    }
});

// ================== READY ==================
client.once('ready', () => {
    console.log(`${client.user.tag} ist online`);
});

// ================== INTERACTIONS ==================
client.on('interactionCreate', async (interaction) => {

    // ===== SLASH =====
    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === 'setup-tickets') {

            const embed = new EmbedBuilder()
                .setTitle('🎫 Ticketsystem')
                .setDescription('Wähle eine Kategorie')
                .setColor('#2F3136');

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket-select')
                    .setPlaceholder('Kategorie wählen')
                    .addOptions([
                        { label: 'Support', value: 'support', emoji: '🛠️' },
                        { label: 'Ideen', value: 'ideas', emoji: '💡' },
                        { label: 'Report', value: 'reports', emoji: '🚨' },
                        { label: 'Bewerbung', value: 'apps', emoji: '📝' }
                    ])
            );

            return interaction.reply({ embeds: [embed], components: [menu] });
        }

        if (interaction.commandName === 'ticket-stats') {
            return interaction.reply({
                content: `Support: ${stats.support}\nIdeas: ${stats.ideas}\nReports: ${stats.reports}\nApps: ${stats.apps}`,
                ephemeral: true
            });
        }
    }

    // ===== MENU =====
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-select') {

        const option = interaction.values[0];
        const user = interaction.user;
        const guild = interaction.guild;

        stats[option]++;

        const channel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: TEAM_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('Ticket erstellt')
            .setDescription(`Hallo ${user}`)
            .setColor('Green');

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`close-${option}-${user.id}`)
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('claim')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({
            content: `<@&${TEAM_ROLE_ID}> ${user}`,
            embeds: [embed],
            components: [buttons]
        });

        return interaction.reply({ content: `Ticket erstellt: ${channel}`, ephemeral: true });
    }

    // ===== BUTTONS =====
    if (interaction.isButton()) {

        if (interaction.customId === 'claim') {
            return interaction.reply({ content: 'Ticket übernommen', ephemeral: false });
        }

        if (interaction.customId.startsWith('close-')) {
            await interaction.reply({ content: 'Ticket wird geschlossen...' });
            setTimeout(() => interaction.channel.delete(), 3000);
        }
    }
});

// ================== LOGIN ==================
client.login(BOT_TOKEN);