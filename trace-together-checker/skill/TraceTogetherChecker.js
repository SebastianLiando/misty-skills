function getTTFeedbackSpeechId() {
  return "trace-together-feedback-speech";
}

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

function assignedLocation(location) {
  return getOrSetState("location", location, true);
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

function feedbackConnecting() {
  misty.DisplayText(_params.baseUrl);
  misty.ChangeLED(255, 255, 0);
}

function feedbackIdle() {
  publishState("IDLE");
  misty.DisplayText("Idle...");
  misty.ChangeLED(0, 0, 0);
}

function feedbackPending() {
  publishState("PENDING");
  misty.Speak(
    "Robot location is not set. Please use the administrator app to set the location." +
      "Retrying in 10 seconds."
  );
  misty.ChangeLED(255, 0, 0);
  misty.DisplayText("Set robot location in app");
}

function feedbackDetectedPerson() {
  publishState("ENGAGING");
  misty.DisplayText("Please show TraceTogether");
  misty.TransitionLED(0, 0, 0, 0, 255, 0, "Breathe", 1000);
}

misty.UnregisterAllEvents();
misty.EnableCameraService();
misty.SetDefaultVolume(10);
// Adjust the text layer, so that texts are in the bottom.
misty.SetTextDisplaySettings(
  null,
  false,
  false,
  true,
  1,
  33,
  400,
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

// Set the location display
misty.SetTextDisplaySettings(
  "Location",
  false,
  false,
  true,
  1,
  20,
  400,
  true,
  "Center",
  "Top",
  "Oblique",
  255,
  255,
  255,
  480,
  60
);

// Display the assigned location
function displayLocation(location) {
  misty.DisplayText("\n???? " + location, "Location");
}

// Fetch information of the robot.
misty.GetDeviceInformation();

function _GetDeviceInformation(data) {
  // Get the serial number, and save it to the state.
  const result = data.Result;
  robotSerialNumber(result.SerialNumber);

  callRegisterRobotEndpoint();
}

/**
 * Send GET request to the server's home endpoint.
 * The URL is specified in the parameter of the skill.
 */
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

    if (robotData["location"] == "") {
      // Robot location is not set.
      // Administrator needs to set this value before continuing.
      feedbackPending();
      misty.RegisterTimerEvent("RetryConnection", 20000, false);
      return;
    }

    misty.Debug("Success!");
    misty.Speak("Connected to the Server");
    setupSkill();
  } else {
    // If fail, retry after 10 seconds
    misty.Debug("Error!");
    misty.Debug(data.ErrorMessage);
    misty.Speak("Failed to connect to the server, retrying in 10 seconds");
    misty.RegisterTimerEvent("RetryConnection", 10000, false);
  }
}

function _RetryConnection() {
  callRegisterRobotEndpoint();
}

function setupSkill() {
  feedbackIdle();

  // Listen to touch sensor on Misty's head.
  misty.AddReturnProperty("OnTouch", "sensorPosition");
  misty.RegisterEvent("OnTouch", "TouchSensor", 1000, true);

  // Listen to speech feedback completion.
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

function _Heartbeat(data) {
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

  if (status !== 3) return;

  const location = JSON.parse(data.Result.ResponseObject.Data)["location"];
  displayLocation(location);
}

function _OnUserCloseBy({ closeBy, distance }) {
  if (closeBy) {
    // Save state locally
    personNearby(true);

    // Greet user and display instruction
    greetUser();
    feedbackDetectedPerson();

    // Give instruction to the user verbally.
    misty.Speak("Please show your check-in certificate", true);

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
    misty.StartObjectDetector(0.7, 0, 15);
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

/**
 * Callback for cell phone detection.
 */
function _OnTakePicture() {
  misty.DisplayText("");
  publishState("CAPTURING");

  // Adjust Misty's head.
  adjustHeadToPhone();
  // Take photo and check TT certificate.
  checkTraceTogether();
}

function _OnTouch(data) {
  const [sensorPos] = data.AdditionalResults;

  // Only respond to front head sensor events.
  if (sensorPos !== "HeadFront") {
    return;
  }

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

/**
 * Misty takes picture and sends it to the local server to validate TraceTogether certificate.
 */
function checkTraceTogether() {
  // Give feedback to the user that Misty is taking picture.
  misty.DisplayImage("e_SystemCamera.jpg");
  misty.PlayAudio("s_SystemCameraShutter.wav", 10);
  // Takes 4K picture. This will invoke the callback function _TakePicture().
  misty.TakePicture("trace-together", 4160, 3120, false, true);

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
    _params.baseUrl + "/trace-together/verify",
    null,
    null,
    JSON.stringify({ image: base64, serial: robotSerialNumber() }),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_TraceTogetherResult"
  );

  // Show processing feedback
  misty.TransitionLED(0, 0, 255, 0, 0, 0, "Breathe", 500);
  publishState("VERIFYING");
  misty.DisplayImage("a_Scanning.gif");
}

function _TraceTogetherResult(data) {
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

  // Check for errors in detection
  const errorDetail = response["detail"];
  if (errorDetail) {
    publishState("REJECT");
    feedback(false);
  } else {
    // If no error, process the response
    handleTraceTogetherResult(response);
  }
}

function handleTraceTogetherResult({
  date_valid,
  location_valid,
  location_actual,
  check_in,
  safe_entry,
  fully_vaccinated,
}) {
  const dateValid = date_valid;
  const locationValid = location_valid;
  const location = location_actual;
  const checkIn = check_in;
  const vaccinated = fully_vaccinated;
  const safeEntry = safe_entry;

  // Make sure it is a trace-together check-in certificate
  const isCheckInCert = (checkIn && safeEntry) || vaccinated;
  if (!isCheckInCert) {
    publishState("REJECT");
    feedback(true, true, "Sorry! Invalid trace together check-in certificate");
    return;
  }

  // Not fully vaccinated feedback. uncomment if visitor must be fully vaccinated.
  // if (!vaccinated) {
  //   publishState('REJECT')
  //   feedback(true, true, "Sorry! You are not fully vaccinated");
  //   return;
  // }

  // Check date and location
  if (dateValid && locationValid) {
    feedback(true, false, location);
  } else {
    feedback(true, true, "Sorry! Make sure location and date is valid");
  }
}

function feedback(foundPhone, error, reasonOrLocation) {
  const isValidCert = foundPhone && !error;
  let speechFeedback = "";
  let textFeedback = "";
  if (!foundPhone) {
    speechFeedback =
      "Cannot find phone. Please hold your phone like this and try again.";
    textFeedback = "Phone not found! Please try again";
  } else {
    speechFeedback = isValidCert
      ? "Thank you! Welcome to " + reasonOrLocation
      : reasonOrLocation;

    textFeedback = isValidCert ? "Welcome!" : reasonOrLocation;
  }

  // Speech feedback
  misty.Speak(speechFeedback, 1, 1, "default", false, getTTFeedbackSpeechId());

  // Display text feedback
  misty.DisplayText(textFeedback);

  // Expression feedback
  let expr = "e_Admiration.jpg";
  if (error) {
    expr = "e_Sadness.jpg";
  } else if (!foundPhone) {
    expr = "e_ApprehensionConcerned.jpg";
  }
  misty.DisplayImage(expr);

  // LED feedback
  const [r, g, b] = !isValidCert || !foundPhone ? [255, 0, 0] : [0, 255, 0];
  misty.ChangeLED(r, g, b);

  // Arm feedback
  if (isValidCert) {
    // Both arms
    misty.MoveArms(20, 20, 100, 100);
  } else if (!foundPhone) {
    // Right arm straight forward
    misty.MoveArm("right", 0, 60);
  }

  // Head feedback
  if (isValidCert) {
    // Bow head
    publishState("ACCEPT");
    misty.MoveHead(20, 0, 0);
    misty.Pause(1000);
    misty.MoveHead(0, 0, 0);
  } else if (foundPhone && error) {
    // Shake head
    publishState("REJECT");
    misty.MoveHead(0, 0, 20);
    misty.Pause(500);
    misty.MoveHead(0, 0, -20);
    misty.Pause(500);
    misty.MoveHead(0, 0, 0);
  }
}

function defaultStance() {
  misty.DisplayImage("e_DefaultContent.jpg"); // Default expression
  misty.MoveHead(0, 0, 0, 100); // Default head position
  misty.MoveArms(45, 45, 100, 100); // Default arms position
  misty.ChangeLED(0, 0, 0); // Default LED
}

function _OnTraceTogetherFeedbackEnd(data) {
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
