misty.UnregisterAllEvents();
misty.EnableCameraService();

// Run user detection skill
misty.RegisterUserEvent("OnUserCloseBy", true);
misty.RunSkill("29e71806-c2f7-46f4-b185-976dd0da3b27");

function _OnUserCloseBy({ closeBy, distance }) {
  // Give instruction to the user.
  if (closeBy) {
    misty.Speak(
      "Hello, please put your phone on the table and then tap my head"
    );
  }
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
    misty.Speak(`Sorry, ${errorDetail}`);
    return;
  }

  // If no error, process the response
  handleTraceTogetherResult(response);
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
    misty.Speak("Sorry! Invalid trace together check-in certificate");
    return;
  }

  // Not fully vaccinated cannot enter
  if (!vaccinated) {
    misty.Speak("Sorry! You are not fully vaccinated");
    return;
  }

  // Check date and location
  if (dateValid && locationValid) {
    misty.Speak("Thank you! Welcome to NTU - N3 AND N4 CLUSTER");
  } else {
    misty.Speak("Sorry! Make sure location and date is valid");
  }
}

function speechToText(base64) {
  misty.SendExternalRequest(
    "POST",
    _params.baseUrl + "/speech",
    null,
    null,
    JSON.stringify({ audio: base64 }),
    "false",
    "false",
    "filename.png",
    "application/json",
    "_SpeechResult"
  );
}

function _SpeechResult(data) {
  const response = JSON.parse(data.Result.ResponseObject.Data);
  misty.Speak(response.speech);

  waitUserSpeech();
}
