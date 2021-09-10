function getScreamOnBumpGuid() {
  return "9ee80f5e-4bfe-4b48-92ef-3cea2ba2ad36";
}
function getForwardOnceGuid() {
  return "2b8d70ff-ca4e-45b8-973f-d9b14c684329";
}

const EVENT_SCREAM_END = "OnScreamEnded";
function getEventTurnEnd() {
  return "OnTurnEnded";
}

function getTurningStateKey() {
  return "isTurning";
}

misty.Debug("Starting skill - StupidWandering");

misty.UnregisterEvent(EVENT_SCREAM_END);
misty.Set(getTurningStateKey(), false);
misty.RunSkill(getScreamOnBumpGuid());
misty.RunSkill(getForwardOnceGuid());

misty.RegisterEvent(EVENT_SCREAM_END, "AudioPlayComplete", 100, true);

/**
 * Return a random integer between the given range (both inclusive).
 * @param {Number} min Minimal integer.
 * @param {Number} max Maximal integer.
 * @returns Random integer in the given range.
 */
function randomIntBetween(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function _OnScreamEnded(data) {
  // If already turning, cancel
  if (misty.Get(getTurningStateKey())) {
    return;
  }

  misty.Set(getTurningStateKey(), true);
  misty.UpdateHazardSettings(false, true, false);

  // Turn a random degrees
  const turnDuration = randomIntBetween(2000, 5000);
  misty.Drive(0, 50);
  misty.RegisterTimerEvent(getEventTurnEnd(), turnDuration, false);
  misty.Debug("Turning for " + turnDuration + " ms");
}

function _OnTurnEnded(data) {
  misty.Debug("Turn Ended");
  misty.Stop();
  misty.UpdateHazardSettings(true);
  misty.Set(getTurningStateKey(), false);
  misty.RunSkill(getForwardOnceGuid());
}
