const RPC = require('discord-rpc');
const clientId = '1196109159414894612'; // Ezt majd cseréld ki a sajátodra!

const rpc = new RPC.Client({ transport: 'ipc' });

rpc.on('ready', () => {
    console.log('✨ Discord RPC sikeresen csatlakozva és szépítve! ✨');

    // Az RPC állapot frissítése folyamatosan
    setInterval(() => {
        rpc.setActivity({
            details: 'NeonLyrics Ultimate Pro 🎶',
            state: 'Zs dalát hallgatja ❤️',
            startTimestamp: new Date(), // Mutatja, mióta megy a session
            largeImageKey: 'nagy_logo_nev', // A Discord Developer Portal-ban feltöltött kép neve
            largeImageText: 'Zseniális buli hangulat',
            smallImageKey: 'kis_sziv_ikon', // Opcionális kis sarok ikon
            smallImageText: 'Szerelmes mód aktiválva ✨',
            instance: false,
            buttons: [
                { label: '🎵 Zene hallgatása', url: 'https://github.com' },
                { label: '💖 Kedvenc dal', url: 'https://github.com' }
            ]
        }).catch(console.error);
    }, 5 * 1000); // 15 másodpercenként frissíti
});

rpc.login({ clientId }).catch(console.error);