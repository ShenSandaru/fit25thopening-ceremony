export const CLIENT_EVENTS = {
  GUEST_ACTIVATE: "guest:activate",
  CLOCK_SYNC: "clock:sync",
} as const;

export const SERVER_EVENTS = {
  EVENT_STATE: "event:state",
  EVENT_ACTIVATION_STARTED: "event:activation-started",
  GUEST_ACTIVATED: "guest:activated",
  EVENT_COUNTDOWN_STARTED: "event:countdown-started",
  EVENT_OPENED: "event:opened",
  EVENT_ABORTED: "event:aborted",
  EVENT_RESET: "event:reset",
  DEVICE_STATUS: "device:status",
  ACTIVITY_LOGGED: "activity:logged",
} as const;
