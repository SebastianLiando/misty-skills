// ----- Local States
function getOrSetState(key, setValue, persistent = false) {
  if (setValue !== undefined) misty.Set(key, setValue, persistent);
  return misty.Get(key);
}

function robotSerialNumber(serial) {
  return getOrSetState("serial-number", serial);
}

// Lock to prevent multiple call of function for 1 cell phone.
function phoneDetectionLock(locked) {
  return getOrSetState("lock", locked);
}

// Latest state of nearby person.
function personNearby(nearby) {
  return getOrSetState("person-nearby", nearby);
}
// -------------------

// ----- Robot Feedbacks
function defaultStance() {
  misty.DisplayImage("e_DefaultContent.jpg"); // Default expression
  misty.MoveHead(0, 0, 0, 100); // Default head position
  misty.MoveArms(45, 45, 100, 100); // Default arms position
  misty.ChangeLED(0, 0, 0); // Default LED
}

function greetUser() {
  misty.DisplayText("");
  misty.PlayAudio("s_PhraseHello.wav", 10);
  misty.DisplayImage("e_Admiration.jpg");
  misty.MoveArm("right", -90, 100);
  // Pitch, roll, yaw
  misty.MoveHead(0, 40, 0, 100);

  // Reset misty movements
  misty.Pause(2000);
  defaultStance();
}

function feedbackConnecting() {
  misty.DisplayText(_params.baseUrl);
  misty.ChangeLED(255, 255, 0);
}

function feedbackIdle() {
  publishState("IDLE");
  misty.DisplayText("Idle...");
  misty.ChangeLED(0, 0, 0);
}

function feedbackDetectedPerson() {
  publishState("ENGAGING");
  misty.DisplayText("Show confirmation email");
  misty.TransitionLED(0, 0, 0, 0, 255, 0, "Breathe", 1000);
}

function feedbackReject(message) {
  publishState("REJECT");
  misty.DisplayImage("e_Sadness.jpg");
  misty.ChangeLED(255, 0, 0);
  misty.Speak(message, 1, 1, "default", false, getTTFeedbackSpeechId());
  misty.MoveHead(0, 0, 20);
  misty.Pause(500);
  misty.MoveHead(0, 0, -20);
  misty.Pause(500);
  misty.MoveHead(0, 0, 0);
}

function publishState(state) {
  misty.SendExternalRequest(
    "POST",
    _params.baseUrl + "/robot/" + robotSerialNumber(),
    null,
    null,
    JSON.stringify({
      state: state.toString(),
    }),
    "false",
    "false",
    "filename.png",
    "application/json"
  );
}
// ----------------------------------------------------

// --------- Start up to server connected
function startUp() {
  misty.UnregisterAllEvents();
  misty.EnableCameraService();
  misty.SetDefaultVolume(20);

  // Clear everything
  misty.DisplayText("");
  misty.DisplayImage("e_DefaultContent.jpg");

  misty.GetDeviceInformation();
}

function _GetDeviceInformation(data) {
  // Get the serial number, and save it to the state.
  const result = data.Result;
  robotSerialNumber(result.SerialNumber);

  callRegisterRobotEndpoint();
}

function callRegisterRobotEndpoint() {
  feedbackConnecting();

  misty.SendExternalRequest(
    "GET",
    _params.baseUrl + "/robot/" + robotSerialNumber(),
    null,
    null,
    JSON.stringify({}),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_RegisterRobotEndpoint" // Name of the callback function
  );
}

function _RegisterRobotEndpoint(data) {
  const status = data.Status;

  if (status === 3) {
    // If successful -> setup the skill
    // Parse the response.
    const robotData = JSON.parse(data.Result.ResponseObject.Data);
    misty.Debug(robotData);
    misty.Debug("Success!");

    misty.Speak("Connected to the Server");
    setupSkill();
  } else {
    // If fail, retry after 10 seconds
    misty.Debug("Error: " + data.ErrorMessage);

    misty.Speak("Failed to connect to the server, retrying in 20 seconds");
    misty.RegisterTimerEvent("RetryConnection", 20000, false);
  }
}

function _RetryConnection() {
  callRegisterRobotEndpoint();
}

// ------------ Setting up skill
function setupSkill() {
  feedbackIdle();

  // Listen to touch sensor on Misty's head -> fallback mechanism
  misty.AddReturnProperty("OnTouch", "sensorPosition");
  misty.RegisterEvent("OnTouch", "TouchSensor", 1000, true);

  // Listen to the last speech completion
  misty.RegisterEvent(
    "OnTraceTogetherFeedbackEnd",
    "TextToSpeechComplete",
    100,
    true
  );

  // Run user detection skill
  misty.RegisterUserEvent("OnUserCloseBy", true);
  misty.RunSkill("29e71806-c2f7-46f4-b185-976dd0da3b27");

  // Start heartbeat
  misty.RegisterTimerEvent("Heartbeat", 5000, true);
}

function _OnTouch(data) {
  const [sensorPos] = data.AdditionalResults;

  // Only respond to front head sensor events.
  if (sensorPos !== "HeadFront") {
    return;
  }

  // Take the lock to block the detection path
  phoneDetectionLock(true);

  // Tilt head up a bit
  misty.MoveHead(-20, 0, 0);
  misty.Pause(1000);

  checkTraceTogether();
}

function _Heartbeat(/* data */) {
  misty.SendExternalRequest(
    "POST",
    _params.baseUrl + "/robot/heartbeat",
    null,
    null,
    JSON.stringify({
      serial: robotSerialNumber(),
    }),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_OnHeartbeatResponse"
  );
}

function _OnHeartbeatResponse(data) {
  const status = data.Status;

  if (status !== 3) misty.Debug("Heartbeat failed!");
}

function _OnUserCloseBy({ closeBy }) {
  if (closeBy) {
    // Save state locally
    personNearby(true);

    // Greet user and display instruction
    greetUser();
    feedbackDetectedPerson();

    // Give instruction to the user verbally.
    misty.Speak("Please show your confirmation email");

    // Listen for cell phone detection events.
    misty.AddPropertyTest(
      "OnCellPhone",
      "Description",
      "==",
      "cell phone",
      "string"
    );
    misty.AddReturnProperty("OnCellPhone", "Description");
    misty.AddReturnProperty("OnCellPhone", "imageLocationBottom");
    misty.RegisterEvent("OnCellPhone", "ObjectDetection", 10, true);

    // Starts object detection.
    misty.StartObjectDetector(0.55, 0, 5);
    phoneDetectionLock(false);
  } else {
    // Save state locally
    personNearby(false);

    // Stop listening and stop detection.
    misty.UnregisterEvent("OnCellPhone");
    misty.StopObjectDetector();

    // Display idle state.
    feedbackIdle();
  }
}

function _OnCellPhone(data) {
  const [name, bboxBottom] = data.AdditionalResults;

  // Always save the bottom position of the cell phone
  misty.Debug(name + ": " + bboxBottom);
  misty.Set("bottom", bboxBottom);

  if (!phoneDetectionLock()) {
    // Latch on the first call
    phoneDetectionLock(true);
  } else {
    return;
  }

  // Ask user to hold steady
  misty.Speak("Hold steady", 1, 1, "default", true);
  misty.DisplayText("Hold steady...");

  // Wait for 2 seconds
  misty.RegisterTimerEvent("OnTakePicture", 2000, false);
}

function _OnTakePicture() {
  misty.DisplayText("");
  publishState("CAPTURING");

  // Adjust Misty's head.
  adjustHeadToPhone();
  // Take photo and check TT certificate.
  checkTraceTogether();
}

function adjustHeadToPhone() {
  // Get latest bottom position of phone
  const bottom = misty.Get("bottom");
  // Ideally, the bottom of the cell phone is at 310
  const idealBottom = 320;
  // Calculate the actual distance to the ideal.
  // This is the amount of distance Misty's head need to move.
  const verticalDistance = idealBottom - bottom;
  misty.Debug("Final cell phone: " + verticalDistance);

  // 1 pitch = x image position unit.
  const pitchToDistance = 5;

  // Calculate the pitch Misty's head need to move
  let headPitch = 0;
  if (verticalDistance > 0) {
    // Phone is too high, move head up
    headPitch = verticalDistance / pitchToDistance;
    if (headPitch > 40) {
      headPitch = 40;
    }
  } else {
    // Phone is too low, move head down
    headPitch = verticalDistance / pitchToDistance;
    if (headPitch > 26) {
      headPitch = 26;
    }
  }
  // Misty's pitch unit is inverted (up is negative, down is positive).
  headPitch = headPitch * -1;

  // Move Misty's head based on calculation.
  misty.MoveHead(headPitch, 0, 0);
  misty.Pause(1000);
}

function checkTraceTogether() {
  // Give feedback to the user that Misty is taking picture.
  misty.DisplayImage("e_SystemCamera.jpg");
  misty.PlayAudio("s_SystemCameraShutter.wav", 10);
  // Takes 4K picture. This will invoke the callback function _TakePicture().
  misty.TakePicture("confirm-email", 4160, 3120, false, true);

  // Reset head position
  misty.Pause(1000);
  misty.MoveHeadRadians(0, 0, 0);
}

function _TakePicture(data) {
  // Reset Misty's facial expression.
  misty.DisplayImage("e_DefaultContent.jpg");

  if (data.Status === 3) {
    // If successful, send the image to server.
    const result = data.Result;
    sendImage(result.Base64);
  } else {
    // Handle error if any.
    misty.Debug("Failed to take picture!");
    misty.Speak("Failed to take picture! Please try again.");
  }
}

function sendImage(base64) {
  // Send POST request to server
  misty.SendExternalRequest(
    "POST",
    _params.baseUrl + "/info-session/verify",
    null,
    null,
    JSON.stringify({ image: base64, serial: robotSerialNumber() }),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_ConfirmEmailResult"
  );

  // Show processing feedback
  misty.TransitionLED(0, 0, 255, 0, 0, 0, "Breathe", 500);
  publishState("VERIFYING");
  misty.DisplayImage("a_Scanning.gif");
}

function _ConfirmEmailResult(data) {
  // Hide processing feedback
  misty.ChangeLED(0, 0, 0);
  misty.DisplayImage("e_DefaultContent.jpg");

  // Handle unexpected error if any
  if (data.Status !== 3) {
    misty.Speak("Server error! Please contact administrator.");
    return;
  }

  // Parse the response.
  const response = JSON.parse(data.Result.ResponseObject.Data);
  misty.Debug(JSON.stringify(response));

  // Handle errors in detection
  const errorDetail = response["detail"];
  if (errorDetail) {
    publishState("REJECT");
    misty.Debug(errorDetail);
    feedbackReject(errorDetail);
    return;
  }

  misty.Speak(
    "Yay! No detection error",
    1,
    1,
    "default",
    false,
    getTTFeedbackSpeechId()
  );
}

function _OnTraceTogetherFeedbackEnd(/* data*/) {
  // Reset Misty to default stance
  defaultStance();

  // Allow the next verification.
  phoneDetectionLock(false);

  // Check the latest person detection state
  if (personNearby()) {
    feedbackDetectedPerson();
  } else {
    feedbackIdle();
  }
}

// ------- Start the skill
startUp();
