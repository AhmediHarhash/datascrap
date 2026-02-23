import { AUTOMATION_STATES, LIFECYCLE_TRANSITIONS } from "../../shared/src/events.mjs";

const ALLOWED_TRANSITIONS = Object.freeze({
  [AUTOMATION_STATES.IDLE]: {
    [LIFECYCLE_TRANSITIONS.START]: AUTOMATION_STATES.RUNNING
  },
  [AUTOMATION_STATES.RUNNING]: {
    [LIFECYCLE_TRANSITIONS.STOP_REQUEST]: AUTOMATION_STATES.STOPPING,
    [LIFECYCLE_TRANSITIONS.COMPLETE]: AUTOMATION_STATES.COMPLETED,
    [LIFECYCLE_TRANSITIONS.FAIL]: AUTOMATION_STATES.ERROR
  },
  [AUTOMATION_STATES.STOPPING]: {
    [LIFECYCLE_TRANSITIONS.STOP]: AUTOMATION_STATES.STOPPED,
    [LIFECYCLE_TRANSITIONS.FAIL]: AUTOMATION_STATES.ERROR
  },
  [AUTOMATION_STATES.STOPPED]: {
    [LIFECYCLE_TRANSITIONS.RESET]: AUTOMATION_STATES.IDLE
  },
  [AUTOMATION_STATES.COMPLETED]: {
    [LIFECYCLE_TRANSITIONS.RESET]: AUTOMATION_STATES.IDLE
  },
  [AUTOMATION_STATES.ERROR]: {
    [LIFECYCLE_TRANSITIONS.RESET]: AUTOMATION_STATES.IDLE
  }
});

export function createLifecycleMachine(initialState = AUTOMATION_STATES.IDLE) {
  let state = initialState;

  return {
    getState() {
      return state;
    },
    can(transition) {
      const allowedForState = ALLOWED_TRANSITIONS[state] || {};
      return Boolean(allowedForState[transition]);
    },
    transition(transition) {
      const allowedForState = ALLOWED_TRANSITIONS[state] || {};
      const nextState = allowedForState[transition];
      if (!nextState) {
        throw new Error(`Invalid lifecycle transition '${transition}' from state '${state}'`);
      }
      state = nextState;
      return state;
    }
  };
}
