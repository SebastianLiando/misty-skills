// ------------------- State management ---------------------
/**
 * Returns the state id of this skill.
 * @returns  The state id of this skill.
 */
function getUserCloseByKey() {
  return "Greeted";
}

/**
 * Reads or updates the state with the id `Greeted`.
 *
 * @param {boolean} closeBy The new value of the state, or null if only reading the state.
 * @returns The current value of the state.
 */
function isUserCloseBy(closeBy = null) {
  // If argument provided, update the state.
  if (closeBy != null) {
    misty.Set(getUserCloseByKey(), closeBy);
    return closeBy;
  }

  // Otherwise, return the current state.
  return misty.Get(getUserCloseByKey());
}

// ------------------ Params ----------------------
function getDistanceThreshold() {
  return _params.distanceThreshold;
}

function getTimeoutMs() {
  return _params.timeoutMs;
}

// ----------------- Utils -----------------
/**
 * Initializes the skill.
 */
function init() {
  const FACE_EVENT = "OnFaceRecognition";
  // Remove any previous face event listeners started by this skill
  misty.UnregisterEvent(FACE_EVENT);
  // Set initial state
  isUserCloseBy(false);

  // Get the distance data for face events
  misty.AddReturnProperty(FACE_EVENT, "Distance");
  // Listen to face events indefinitely with 100 ms notification interval
  misty.RegisterEvent(FACE_EVENT, "FaceRecognition", 100, true);
}

function broadcastEvent(closeBy, distance) {
  // Broadcast event
  misty.TriggerEvent(
    "OnUserCloseBy", // Name
    "OnUserCloseBySkill", // Source
    JSON.stringify({
      closeBy,
      distance,
    }),
    "" // Allow all skills to listen to this event
  );
}

// ---------------------------- Handlers --------------------------
function _OnFaceRecognition(data) {
  // Get the distance between the robot and the user
  let distance = data.AdditionalResults[0];

  // Get current state
  let closeBy = isUserCloseBy();

  // The user comes close by for the first time
  if (!closeBy && distance <= getDistanceThreshold()) {
    // Update state
    isUserCloseBy(true);

    // Broadcast event
    broadcastEvent(true, distance);
  }

  if (closeBy && distance < getDistanceThreshold()) {
    // If the user has been close by, and the face is still detected, restart timer
    misty.UnregisterEvent("OnTimeout");
    misty.RegisterTimerEvent("OnTimeout", getTimeoutMs(), false);
  }
}

function _OnTimeout(/* data */) {
  // Set the state to false.
  isUserCloseBy(false);

  // Tell other skills that the user is no longer close to Misty.
  broadcastEvent(false, -1);
}

// ------------------------ Skill --------------------
misty.Debug("Starting - OnUserCloseBy");
init();
misty.StartFaceRecognition();
