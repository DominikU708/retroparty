const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'songs.json');

// Tároljuk az éppen játszott zene adatait a Discord RPC-hez és a szinkronhoz
let currentPlayingSong = {
    title: 'Válassz dalt...',
    artist: 'RetroParty',
    startTime: Date.now(),
    duration: 0
};

// Ha nincs még dal fájl, létrehozzuk az alapadatokkal
if (!fs.existsSync(dataFile)) {
    const sampleData = [{
        id: 'sample-1',
        title: 'Retro Party Intro',
        artist: 'Rendszer',
        youtubeId: 'dQw4w9WgXcQ',
        lyrics: '[00:01.00] ÜDVÖZÖLJÜK A PARTYBAN!\n[00:04.00] Használjátok a QR kódot a telefonotokról!'
    }];
    fs.writeFileSync(dataFile, JSON.stringify(sampleData, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Gyökér útvonal, hogy ne adjon 502-es hibát
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API végpontok a dalokhoz
app.get('/api/songs', (req, res) => {
    try {
        const songs = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        res.json(songs);
    } catch (err) { 
        res.status(500).json({ error: 'Hiba a dalok betöltésekor.' }); 
    }
});

// API végpont az éppen játszott zenéhez (Discord RPC-hez vagy külső lekérdezéshez)
app.get('/api/current-song', (req, res) => {
    res.json(currentPlayingSong);
});

// Külső vagy belső hívás a zene frissítésére
app.post('/api/update-current-song', (req, res) => {
    const { title, artist, duration } = req.body;
    if (title && artist) {
        currentPlayingSong = {
            title,
            artist,
            startTime: Date.now(),
            duration: duration || 0
        };
        // Értesítjük a Socket.io klienseket is, ha kell
        io.emit('song-changed', currentPlayingSong);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Hiányzó adatok' });
    }
});

app.post('/api/delete', (req, res) => {
    try {
        const { songId } = req.body;
        let songs = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        songs = songs.filter(s => s.id !== songId);
        fs.writeFileSync(dataFile, JSON.stringify(songs, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Hiba a törlés során.' });
    }
});

app.post('/api/upload', (req, res) => {
    try {
        const { songId, title, artist, youtubeUrl, lyrics } = req.body;
        const songs = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        let yId = '';
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = youtubeUrl ? youtubeUrl.match(ytRegex) : null;
        if(match && match[1]) yId = match[1];
        else yId = youtubeUrl || 'dQw4w9WgXcQ';

        if (songId) {
            const index = songs.findIndex(s => s.id === songId);
            if (index !== -1) {
                songs[index].title = title;
                songs[index].artist = artist;
                songs[index].lyrics = lyrics;
                if(yId) songs[index].youtubeId = yId;
            }
        } else {
            songs.push({
                id: 'song-' + Date.now(),
                title: title || 'Névtelen',
                artist: artist || 'Ismeretlen',
                youtubeId: yId,
                lyrics: lyrics || ''
            });
        }

        fs.writeFileSync(dataFile, JSON.stringify(songs, null, 2));
        res.redirect('/admin.html?status=success');
    } catch (err) {
        res.status(500).send('Hiba történt a mentés során.');
    }
});

// Socket.io kapcsolatok kezelése
io.on('connection', (socket) => {
    // Amikor egy új kliens csatlakozik, átadjuk neki az aktuális dalt
    socket.emit('song-changed', currentPlayingSong);

    // Kliens jelezheti, hogy dal váltódott
    socket.on('set-current-song', (songData) => {
        currentPlayingSong = {
            title: songData.title || 'Ismeretlen',
            artist: songData.artist || 'Ismeretlen',
            startTime: Date.now(),
            duration: songData.duration || 0
        };
        io.emit('song-changed', currentPlayingSong);
    });

    socket.on('request-song', (data) => {
        io.emit('add-to-queue', data);
    });

    socket.on('send-emoji', (emoji) => {
        io.emit('float-emoji', emoji);
    });

    socket.on('send-vote', (voteData) => {
        io.emit('update-vote', voteData);
    });

    socket.on('close-voting', (finalResults) => {
        io.emit('show-final-results', finalResults);
    });

    // ÚJ: Üzenetek továbbítása a kivetítőre[cite: 1]
    socket.on('send-message', (msg) => {
        io.emit('show-message', msg);
    });

    // ÚJ: Hangeffektek triggerezése[cite: 1]
    socket.on('play-sound', (soundType) => {
        io.emit('trigger-sound', soundType);
    });
});

// Add ezt be az io.on('connection', (socket) => { ... }) blokkba:
socket.on('admin-start-voting', () => {
    io.emit('enable-voting'); // Szól minden vendégnek, hogy bekapcsolhatja a szavazást
});
server.listen(PORT, '0.0.0.0', () => {
    console.log('================================================');
    console.log(`🚀 RENDSZER FUT: http://localhost:${PORT}`);
    console.log(`📱 Mobilos Vendégoldal: http://localhost:${PORT}/guest.html`);
    console.log('================================================');
});
