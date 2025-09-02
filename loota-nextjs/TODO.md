# Loota TODO List

## High Priority Features

### Real-time Pin Collection Updates

**Problem**: When a player collects loot, other players don't see it disappear immediately, leading to potential disputes over who collected it first.

**Solution**: Implement WebSocket system for real-time updates

- Add WebSocket server to Next.js app
- Broadcast pin collection events to all connected clients in the same hunt
- Update iOS client to connect to WebSocket and listen for `PIN_COLLECTED` events
- Server-side atomic operations already prevent race conditions
- Instant UI updates prevent user frustration

**Implementation Notes**:

- Server timestamp is authoritative (prevents disputes)
- Atomic database operations ensure first-come-first-served
- WebSocket broadcasts after successful collection
- iOS client immediately removes collected pins from map/UI

**Files to modify**:

- Create `lib/websocket.ts` for WebSocket manager
- Update `/api/hunts/[huntId]/pins/[pinId]/collect/route.ts` to broadcast
- iOS client WebSocket connection and event handling

---

## Future Enhancements

## TODOs

[] - put some space between the "Loota" title and the slot machine
[] - make the generated link color white or a light blue
[] -

---

## Minor Issues

<!-- Add small bugs and improvements here -->

---

## Completed Items

<!-- Move completed items here for reference -->
