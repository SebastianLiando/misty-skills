function getTTFeedbackSpeechId() {
  return "trace-together-feedback-speech";
}

misty.UnregisterAllEvents();
misty.EnableCameraService();

misty.GetCameraDetails();

function _GetCameraDetails(data) {
  misty.Debug(JSON.stringify(data));
}
// Run user detection skill
misty.RegisterUserEvent("OnUserCloseBy", true);
misty.RunSkill("29e71806-c2f7-46f4-b185-976dd0da3b27");

function _OnUserCloseBy({ closeBy, distance }) {
  // Give instruction to the user.
  if (closeBy) {
    misty.Speak("Please show your check-in certificate", true);

    misty.AddPropertyTest(
      "OnCellPhone",
      "Description",
      "==",
      "cell phone",
      "string"
    );
    misty.AddReturnProperty("OnCellPhone", "Description");
    misty.RegisterEvent("OnCellPhone", "ObjectDetection", 500, true);
    misty.StartObjectDetector(0.7, 0, 15);
    misty.Set("lock", false);
  } else {
    misty.UnregisterEvent("OnCellPhone");
    misty.StopObjectDetector();
  }
}

function _OnCellPhone(data) {
  const [name] = data.AdditionalResults;

  misty.Debug(name);

  if (!misty.Get("lock")) {
    misty.Set("lock", true);
  } else {
    return;
  }

  misty.Speak("Hold steady", true);
  misty.RegisterTimerEvent("OnTakePicture", 2000, false);
}

function _OnTakePicture() {
  checkTraceTogether();
}

/**
 * Send GET request to the server's home endpoint.
 * The URL is specified in the parameter of the skill.
 */
function callHomeEndpoint() {
  misty.SendExternalRequest(
    "GET",
    _params.baseUrl,
    null,
    null,
    JSON.stringify({}),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_ServerCheck" // Name of the callback function
  );
}

callHomeEndpoint();

function _ServerCheck(data) {
  const status = data.Status;

  if (status === 3) {
    // If successful -> setup the skill
    misty.Debug("Success!");
    misty.Speak("Connected to the Server", true);
    setupSkill();
  } else {
    // If fail -> retry to call the home endpoint.
    misty.Debug("Error!");
    misty.Debug(data.ErrorMessage);
    misty.Speak("Unable to connect to the server, retrying", true);
    callHomeEndpoint();
  }
}

function setupSkill() {
  // Listen to touch sensor on Misty's head.
  misty.AddReturnProperty("OnTouch", "sensorPosition");
  misty.RegisterEvent("OnTouch", "TouchSensor", 1000, true);

  // Listen to feedback
  misty.RegisterEvent(
    "OnTraceTogetherFeedbackEnd",
    "TextToSpeechComplete",
    100,
    true
  );
}

function _OnTouch(data) {
  const [sensorPos] = data.AdditionalResults;

  // Only respond to front head sensor events.
  if (sensorPos !== "HeadFront") {
    return;
  }

  checkTraceTogether();
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
}

function _TakePicture(data) {
  // Reset Misty's facial expression.
  misty.DisplayImage("e_DefaultContent.jpg");

  if (data.Status === 3) {
    // If successful, send the image to server.
    const result = data.Result;
    sendTraceTogetherImage(result.Base64);
  } else {
    // Handle error if any.
    misty.Debug("Failed to take picture!");
    misty.Speak("Failed to take picture! Please try again.");
  }
}

function sendTraceTogetherImage(base64) {
  misty.SendExternalRequest(
    "POST",
    _params.baseUrl + "/check",
    null,
    null,
    JSON.stringify({ image: base64 }),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_TraceTogetherResult"
  );
}

function _TraceTogetherResult(data) {
  // Parse the response.
  const response = JSON.parse(data.Result.ResponseObject.Data);
  misty.Debug(JSON.stringify(response));

  // Check for errors in detection
  const errorDetail = response["detail"];
  if (errorDetail) {
    feedback(false);
  } else {
    // If no error, process the response
    handleTraceTogetherResult(response);
  }

  misty.Set("lock", false);
}

function handleTraceTogetherResult({
  dateValid,
  locationValid,
  checkIn,
  safeEntry,
  vaccinated,
}) {
  // Make sure it is a trace-together check-in certificate
  const isCheckInCert = (checkIn && safeEntry) || vaccinated;
  if (!isCheckInCert) {
    feedback(true, true, "Sorry! Invalid trace together check-in certificate");
    return;
  }

  // Not fully vaccinated cannot enter
  if (!vaccinated) {
    feedback(true, true, "Sorry! You are not fully vaccinated");
    return;
  }

  // Check date and location
  if (dateValid && locationValid) {
    feedback(true, false);
  } else {
    feedback(true, true, "Sorry! Make sure location and date is valid");
  }
}

function feedback(foundPhone, error, reason) {
  const isValidCert = foundPhone && !error;
  let speechFeedback = "";
  if (!foundPhone) {
    speechFeedback = "Please hold your phone like this";
  } else {
    speechFeedback = isValidCert
      ? "Thank you! Welcome to NTU - N3 AND N4 CLUSTER"
      : reason;
  }

  // Speech feedback
  misty.Speak(speechFeedback, 1, 1, "default", false, getTTFeedbackSpeechId());

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
  // Head feedback

  // Arm feedback
}

function _OnTraceTogetherFeedbackEnd(data) {
  // Reset Misty to default stance
  misty.DisplayImage("e_DefaultContent.jpg"); // Default expression
  misty.MoveHead(0, 0, 0, 100); // Default head position
  misty.MoveArms(45, 45, 100, 100); // Default arms position
  misty.ChangeLED(0, 0, 0); // Default LED
}