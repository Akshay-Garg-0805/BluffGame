// Socket.IO event handlers

const { v4: uuidv4 } = require('uuid');
const Room = require('./Room');

const rooms = new Map();
const socketToRoom = new Map();
const socketToPlayer = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function cleanupEmptyRooms() {
  for (const [id, room] of rooms) {
    const connectedPlayers = room.players.filter(p => p.connected !== false);
    if (connectedPlayers.length === 0 && Date.now() - room.createdAt > 60000) {
      rooms.delete(id);
    }
  }
}

setInterval(cleanupEmptyRooms, 5 * 60 * 1000);

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-room', ({ playerName, avatar, email }) => {
      const roomCode = generateRoomCode();
      const playerId = uuidv4();
      const player = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        avatar: avatar || '😀',
        email: email || '',
        cards: [],
        connected: true,
      };

      const room = new Room(roomCode, player);
      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socketToPlayer.set(socket.id, playerId);

      socket.join(roomCode);
      socket.emit('room-created', { roomId: roomCode, playerId });
      socket.emit('room-update', room.getLobbyState());
    });

    socket.on('join-room', ({ roomId, playerName, avatar, email }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error-message', { message: 'Room not found. Check the code and try again.' });
        return;
      }

      if (room.status !== 'lobby') {
        socket.emit('error-message', { message: 'Game already in progress.' });
        return;
      }

      const playerId = uuidv4();
      const player = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        avatar: avatar || '😀',
        email: email || '',
        cards: [],
        connected: true,
      };

      const result = room.addPlayer(player);
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      socketToRoom.set(socket.id, roomId);
      socketToPlayer.set(socket.id, playerId);

      socket.join(roomId);
      socket.emit('room-joined', { roomId, playerId });
      io.to(roomId).emit('room-update', room.getLobbyState());
    });

    socket.on('start-game', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      if (room.hostId !== playerId) {
        socket.emit('error-message', { message: 'Only the host can start the game.' });
        return;
      }

      const result = room.startGame();
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.emit('game-started', room.getStateForPlayer(player.id));
        }
      });
    });

    socket.on('set-rank', ({ roomId, rank }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      const result = room.setRank(playerId, rank);
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      broadcastGameState(io, room);
    });

    socket.on('play-cards', ({ roomId, cardIds }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      const result = room.playCards(playerId, cardIds);
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      // Broadcast updated state (turn already advanced in Room.playCards)
      broadcastGameState(io, room);
    });

    socket.on('call-bluff', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      const result = room.callBluff(playerId);
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      io.to(roomId).emit('bluff-result', {
        wasBluff: result.wasBluff,
        actualCards: result.actualCards,
        callerName: result.callerName,
        blufferName: result.blufferName,
        pickUpPlayerName: result.pickUpPlayerName,
        pickUpPlayerId: result.pickUpPlayerId,
        pileSize: result.pileSize,
      });

      // After a short delay, send updated game state
      setTimeout(() => {
        broadcastGameState(io, room);
      }, 3000);
    });

    socket.on('pass-turn', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      const result = room.pass(playerId);
      if (result.error) {
        socket.emit('error-message', { message: result.error });
        return;
      }

      // Send the drawn card info to the player who passed
      if (result.drawnCard) {
        socket.emit('card-drawn', { card: result.drawnCard, reserveLeft: result.reserveLeft });
      }

      broadcastGameState(io, room);
    });

    socket.on('send-emoji', ({ roomId, emoji }) => {
      const playerId = socketToPlayer.get(socket.id);
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        io.to(roomId).emit('emoji-received', {
          playerId,
          playerName: player.name,
          emoji,
        });
      }
    });

    socket.on('play-again', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const playerId = socketToPlayer.get(socket.id);
      if (room.hostId !== playerId) {
        socket.emit('error-message', { message: 'Only the host can restart.' });
        return;
      }

      room.status = 'lobby';
      room.currentTurnIndex = 0;
      room.currentRank = null;
      room.centerPile = [];
      room.reserveDeck = [];
      room.lastPlay = null;
      room.canCallBluff = false;
      room.winner = null;
      room.gameLog = [];
      room.players.forEach(p => { p.cards = []; });

      io.to(roomId).emit('room-update', room.getLobbyState());
      io.to(roomId).emit('back-to-lobby', {});
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      const roomId = socketToRoom.get(socket.id);
      const playerId = socketToPlayer.get(socket.id);

      if (roomId && playerId) {
        const room = rooms.get(roomId);
        if (room) {
          room.removePlayer(playerId);

          if (room.status === 'lobby') {
            io.to(roomId).emit('room-update', room.getLobbyState());
          } else {
            broadcastGameState(io, room);
          }
        }
      }

      socketToRoom.delete(socket.id);
      socketToPlayer.delete(socket.id);
    });
  });
}

function broadcastGameState(io, room) {
  room.players.forEach(player => {
    const playerSocket = io.sockets.sockets.get(player.socketId);
    if (playerSocket && player.connected) {
      playerSocket.emit('game-update', room.getStateForPlayer(player.id));
    }
  });
}

module.exports = { setupSocketHandlers };
