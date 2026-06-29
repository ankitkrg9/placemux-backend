# Socket.IO real-time notes

## What is included

- Socket.IO is attached to the HTTP server in [src/server.js](src/server.js).
- A dedicated socket manager in [src/socket/socketManager.js](src/socket/socketManager.js) handles connection lifecycle, rooms, ping/pong, and simple broadcast helpers.
- The server can emit application and company updates to targeted clients.

## Rooms and reconnect handling

- Clients can join or leave named rooms with `join-room` and `leave-room` events.
- The server sends a `connected` event on connection and a `pong` response for `ping`.
- Disconnects are logged, and the socket is cleaned up by leaving all rooms.

## Scaling plan

- The current implementation uses in-memory Socket.IO state for a single instance.
- For multi-instance deployment, the next step is to plug in a Redis adapter so rooms and socket state are shared across nodes.

## Verification

- Test command: `npm test -- --runInBand`
- Result: 5/5 test suites passed and 11/11 tests passed.
