misty.Debug("Starting skill ScreamOnBump");
misty.UnregisterAllEvents();

const BUMP_EVENT = "OnBump";
const BUMP_SENSOR = "BumpSensor";

// Call the listener only if the bump sensor is contacted.
misty.AddPropertyTest(BUMP_EVENT, "isContacted", "==", true, "boolean");
misty.AddReturnProperty(BUMP_EVENT, "isContacted");

// Listen to bump sensor indefinitely.
// First argument -> event name of your choice. Callback function will be this name with prepended underscore.
// Second argument -> what is sensor to listen to
// Third argument -> debounce in ms
// (Optional) Fourth argument -> keep alive. If true means that it will keep on listening to events
//                              until unregistered. Otherwise, will be one-shot.
misty.RegisterEvent(BUMP_EVENT, BUMP_SENSOR, 100, true);
misty.Debug("Listening to bump sensor");

// Add skill state

// Weird issue: event callback doesn't seem to be able to retrieve variable from its parent scope.
// Solution -> use function instead
function getBumpedStateKey() {
  return "Bumped";
}

// Set initial state of bumped
misty.Set(getBumpedStateKey(), false);

/**
 * Return a random integer between the given range (both inclusive).
 * @param {Number} min Minimal integer.
 * @param {Number} max Maximal integer.
 * @returns Random integer in the given range.
 */
function randomIntBetween(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function takeRandom(arr) {
  const randomIndex = randomIntBetween(0, arr.length - 1);

  return arr[randomIndex];
}

function getRandomAngerAudio() {
  const audios = [
    "s_Anger.wav",
    "s_Anger2.wav",
    "s_Anger3.wav",
    "s_Anger4.wav",
  ];
  return takeRandom(audios);
}

function getRandomAngerExpression() {
  const expressions = [
    "e_Anger.jpg",
    "e_Disgust.jpg",
    "e_Aggressiveness.jpg",
    "e_Fear.jpg",
    "e_Disoriented.jpg",
    "e_Sadness.jpg",
    "e_Rage.jpg",
    "e_Rage2.jpg",
    "e_Rage3.jpg",
    "e_Rage4.jpg",
  ];
  return takeRandom(expressions);
}

function _OnBump(data) {
  if (misty.Get(getBumpedStateKey()) === false) {
    misty.Set(getBumpedStateKey(), true);
    misty.Debug("Bumped!");

    // Play audio
    misty.DisplayImage(getRandomAngerExpression());
    misty.PlayAudio(getRandomAngerAudio(), 10);

    // After 1 seconds, do a one-shot reset operation
    misty.RegisterTimerEvent("OnReset", 1000, false);

    // Raise both hands up
    misty.MoveArm("both", -90, 50, 0.2);
  }
}

function _OnReset(data) {
  // Reset face
  misty.DisplayImage("e_ContentLeft.jpg");

  // Reset state
  misty.Set(getBumpedStateKey(), false);

  // Reset hands
  misty.MoveArm("both", 50, 50, 0.2);
}
