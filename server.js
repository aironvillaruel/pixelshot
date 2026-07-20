const { createServer } = require('http')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000
const app = next({ dev })
const handle = app.getRequestHandler()

// roomId -> Set of socket ids currently in that room
const rooms = new Map()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res))
  const io = new Server(httpServer)

  io.on('connection', (socket) => {
    let joinedRoom = null

    socket.on('join-room', (roomId) => {
      const existing = rooms.get(roomId) || new Set()

      // A booth, not a party — two people max.
      if (existing.size >= 2) {
        socket.emit('room-full')
        return
      }

      existing.add(socket.id)
      rooms.set(roomId, existing)
      joinedRoom = roomId

      socket.join(roomId)
      // First to join is the WebRTC "initiator" (impolite peer in the
      // perfect-negotiation pattern) — in practice this is almost always
      // the booth creator, since they land on the session page first.
      socket.emit('joined', { roomId, isInitiator: existing.size === 1 })
      socket.to(roomId).emit('peer-joined', { peerId: socket.id })
    })

    // WebRTC signaling relay — offers, answers, ICE candidates
    socket.on('signal', ({ roomId, data }) => {
      socket.to(roomId).emit('signal', { from: socket.id, data })
    })

    // Host hands its chosen shots/orientation to whichever partner just
    // joined without a config of their own.
    socket.on('host-config', ({ roomId, config }) => {
      socket.to(roomId).emit('host-config', config)
    })

    // Either partner can start a shot sequence. Broadcast to the WHOLE
    // room, including the sender, so both sides run the identical local
    // countdown/capture loop off the same signal rather than one side
    // driving it and the other reacting late.
    socket.on('request-session', ({ roomId, config }) => {
      io.to(roomId).emit('session-start', config)
    })

    socket.on('disconnect', () => {
      if (joinedRoom) {
        const set = rooms.get(joinedRoom)
        if (set) {
          set.delete(socket.id)
          if (set.size === 0) rooms.delete(joinedRoom)
        }
        socket.to(joinedRoom).emit('peer-left')
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})