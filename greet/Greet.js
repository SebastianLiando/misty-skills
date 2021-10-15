misty.Debug("Starting skill - Greet");
_OnReset({});

const FACE_EVENT = "OnFaceRecognition";

function getGreetStateKey() {
  return "Greeted";
}

function getDistanceToGreet() {
  return _params.distanceToGreet;
}

function getDistanceToBye() {
  return _params.distanceToBye;
}

function getGoodByeEvent() {
  return "OnGoodbye";
}

// Remove this skill's event listeners
misty.UnregisterEvent(FACE_EVENT);
// Set initial state
misty.Set(getGreetStateKey(), false);

// Get the distance when recognizing
misty.AddReturnProperty(FACE_EVENT, "Distance");
misty.RegisterEvent(FACE_EVENT, "FaceRecognition", 100, true);
misty.StartFaceDetection();

function _OnFaceRecognition(data) {
  // Get the distance between the robot and the user
  let distance = data.AdditionalResults[0];
  // Get the skill state - has the user been greeted?
  let greeted = misty.Get(getGreetStateKey());
  misty.Debug("Distance: " + distance);

  if (!greeted && distance <= getDistanceToGreet()) {
    // If no user has been greeted, and a user enters into the vicinity of the robot
    misty.PlayAudio(_params.helloSound, _params.volume);
    misty.Set(getGreetStateKey(), true);

    waveHappilyThenReset(_params.helloFace);
  }

  if (greeted && distance < getDistanceToBye()) {
    // If the user has been greeted, and the face is still detected, cancel the restart the timer
    misty.UnregisterEvent(getGoodByeEvent());
    misty.RegisterTimerEvent(getGoodByeEvent(), _params.timeoutMs, false);
  }
}

function _OnGoodbye(data) {
  misty.PlayAudio(_params.goodbyeSound, _params.volume);
  misty.Set(getGreetStateKey(), false);

  waveHappilyThenReset(_params.goodbyeFace);
}

function waveHappilyThenReset(face) {
  misty.ChangeLED(255, 20, 147);
  misty.DisplayImage(face);
  misty.MoveArm("right", -90, 50, 0.2);
  // Pitch, roll, yaw
  misty.MoveHead(0, 40, 0);

  // Reset misty movements
  misty.RegisterTimerEvent("OnReset", 1500, false);
}

function _OnReset(data) {
  misty.DisplayImage("e_ContentLeft.jpg");
  misty.MoveArm("right", 50, 50, 0.2);
  misty.MoveHead(0, 0, 0);
  misty.ChangeLED(255, 255, 255);
  misty.DisplayText("");
}
