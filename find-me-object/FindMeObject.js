function randomIntBetween(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

function takeRandom(arr) {
  const randomIndex = randomIntBetween(0, arr.length - 1);

  return arr[randomIndex];
}

function getTargetObject() {
  const objects = ["person", "chair", "cell phone"];
  return takeRandom(objects);
}

function startRound() {
  const targetObject = getTargetObject();
  misty.Set("target", targetObject);
  misty.DisplayText(targetObject.toUpperCase());

  misty.Speak(`Find me ${targetObject}`, true);

  const timeout = 10;
  misty.Set("timeRemaining", timeout);
  misty.DisplayText(timeout, "timer");

  misty.DisplayText(`Score: ${misty.Get("score")}`, "score");

  misty.AddReturnProperty("OnObject", "Description");
  misty.RegisterEvent("OnObject", "ObjectDetection", 500, true);
  misty.StartObjectDetector(0.5, 0, 15);

  misty.RegisterTimerEvent("OnSecondsPassed", 1000, true);
}

function start() {
  misty.UnregisterAllEvents();
  misty.SetDefaultVolume(5);

  // Configure the timer text layer
  misty.SetTextDisplaySettings(
    "timer",
    false,
    false,
    true,
    1,
    50,
    400,
    true,
    "Center",
    "Bottom",
    "Normal",
    255,
    255,
    255,
    480,
    272 * 0.8
  );

  // Configure the score text layer
  misty.SetTextDisplaySettings(
    "score",
    false,
    false,
    true,
    1,
    36,
    700,
    true,
    "Center",
    "Bottom",
    "Normal",
    255,
    255,
    255,
    480,
    40
  );

  misty.Set("score", 0, false);
  startRound();
}

function _OnObject(data) {
  // Person, chair, cellphone
  const [name] = data.AdditionalResults;
  const target = misty.Get("target");

  if (name === target.toLowerCase()) {
    misty.Debug("User found the object");
    misty.UnregisterAllEvents();
    misty.DisplayText("", "timer");
    misty.DisplayText("");

    // Add score
    const prevScore = misty.Get("score");
    misty.Set("score", prevScore + 1);

    // Restart round
    mistyYay(2000);
    startRound();
  } else {
    misty.Debug(`${name} !== ${target}`);
  }
}

function _OnSecondsPassed(data) {
  let remainingTime = misty.Get("timeRemaining") - 1;
  misty.Set("timeRemaining", remainingTime);

  if (remainingTime === 0) {
    misty.DisplayText("");
    endGame();
  } else {
    misty.DisplayText(remainingTime, "timer");
  }
}

function endGame() {
  // Remove the timer and score text layer
  misty.Debug("Game over!");
  misty.UnregisterAllEvents();

  const finalScore = misty.Get("score");
  misty.DisplayText(`Final Score: ${finalScore}`, "score");
  misty.DisplayText("", "timer");
  misty.DisplayImage("e_RemorseShame.jpg");
  misty.PlayAudio("s_PhraseUhOh.wav", 5);
  misty.Pause(2000);

  misty.DisplayText("", "score");
  misty.DisplayImage("e_DefaultContent.jpg");

  // Broadcast event that indicates the game has ended
  misty.TriggerEvent(
    "OnGameEnded",
    "FindMeObject",
    "",
    "" // Allow all skills to listen to this event
  );
}

function mistyYay(durationMs) {
  misty.DisplayImage("e_Admiration.jpg");
  misty.MoveArm("both", -90, 100);
  misty.PlayAudio("s_Joy.wav", 5);
  misty.ChangeLED(0, 255, 0);
  misty.Pause(durationMs);

  misty.DisplayImage("e_DefaultContent.jpg");
  misty.MoveArm("both", 40, 100);
  misty.ChangeLED(255, 255, 255);
  misty.Pause(1000);
}

start();
