function setState(state) {
  misty.Set("State", state);
}

function currentState() {
  return misty.Get("State");
}

function idleState() {
  return "IDLE";
}

function gameSelectState() {
  return "GAME_SELECT";
}

function inGameState() {
  return "IN_GAME";
}

/**
 * Display text in the game text layer.
 *
 * @param {String} text The text to display.
 */
function displayInGameLayer(text) {
  const layerName = "game";

  // Configure the game text layer
  misty.SetTextDisplaySettings(
    layerName,
    false,
    false,
    true,
    1,
    30, // Font Size
    700, // Font Weight
    true,
    "Center", // Horizontal alignment
    "Bottom", // Vertical alignment
    "Normal",
    255,
    255,
    255,
    480,
    40
  );

  misty.DisplayText(text, layerName);
}

misty.UnregisterAllEvents();

// Start with idle state.
setState(idleState());

// Run Misty greet skill.
misty.RunSkill("fd31a278-16f6-4df0-8394-596b054ad1a3");

misty.AddReturnProperty("OnTouch", "sensorPosition");
misty.RegisterEvent("OnTouch", "TouchSensor", 1000, true);

function _OnTouch(data) {
  const [sensorPos] = data.AdditionalResults;

  // If the sensor is not the one interested in
  if (sensorPos !== "HeadFront") {
    return;
  }

  if (currentState() === idleState()) {
    // Set to game select state
    misty.Debug("Opening game selection");
    setState(gameSelectState());

    // Display the game to play
    const text = 'Play "Find Me Object"?';
    displayInGameLayer(text);
    misty.Speak(`Tap my head to ${text}`, true);
    misty.RegisterTimerEvent("OnGameSelectTimeout", 10000, false);
  } else if (currentState() == gameSelectState()) {
    // Set the state to "playing a game"
    misty.Debug("Starting game");
    displayInGameLayer("");
    setState(inGameState());

    // Launch the game skill
    misty.RunSkill("bb78a920-562b-44ef-9f5c-fe05fb77996e");
  }
}

// Called when the user don't choose anything on game selection for too long.
function _OnGameSelectTimeout(data) {
  displayInGameLayer("");
  setState(idleState());
}

misty.RegisterUserEvent("OnGameEnded", true);

function _OnGameEnded(data) {
  setState(idleState());
}
