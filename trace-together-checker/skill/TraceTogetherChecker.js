misty.UnregisterAllEvents();
misty.EnableCameraService();

// Run user detection skill
misty.RegisterUserEvent("OnUserCloseBy", true);
misty.RunSkill("29e71806-c2f7-46f4-b185-976dd0da3b27");

function _OnUserCloseBy({ closeBy, distance }) {
  if (closeBy) {
    misty.Speak(
      "Hello, please put your phone on the table and then tap my head"
    );
  } else {
    // TBD
  }
}

// Try to connect to the server
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
  "_ServerCheck"
);

function _ServerCheck(data) {
  const status = data.Status;

  if (status === 3) {
    misty.Debug("Success!");
    misty.Speak("Connected to the Server", true);
    setupSkill();
  } else {
    misty.Debug("Error!");
    misty.Debug(data.ErrorMessage);
    misty.Speak("Unable to connect to the server", true);
  }
}

function setupSkill() {
  // Add touch sensor for head
  misty.AddReturnProperty("OnTouch", "sensorPosition");
  misty.RegisterEvent("OnTouch", "TouchSensor", 1000, true);

  waitUserSpeech();
}

function waitUserSpeech() {
  // Wait until user says "Hey Misty, ...." then send the audio to the server
  misty.AddPropertyTest("OnSpeech", "success", "==", "true", "boolean");
  misty.AddReturnProperty("OnSpeech", "filename");
  misty.RegisterEvent("OnSpeech", "VoiceRecord", 100, false);
  misty.StartKeyPhraseRecognition(true);
}

function _OnSpeech(data) {
  const filename = data.AdditionalResults;

  misty.Debug(filename);
  misty.GetAudioFile(filename);
}

function _GetAudioFile(data) {
  if (data.Status === 3) {
    const result = data.Result;
    speechToText(result.Base64);
  }
}

function _OnTouch(data) {
  const [sensorPos] = data.AdditionalResults;

  misty.Debug(sensorPos);

  if (sensorPos === "Chin") {
    misty.Speak("How may I help you?", true);
    waitUserSpeech();
    return;
  }

  if (sensorPos !== "HeadFront") {
    return;
  }

  checkTraceTogether();
}

function checkTraceTogether() {
  misty.DisplayImage("e_SystemCamera.jpg");
  misty.PlayAudio("s_SystemCameraShutter.wav", 10);
  misty.TakePicture("trace-together", 4160, 3120, false, true);
}

function _TakePicture(data) {
  misty.DisplayImage("e_DefaultContent.jpg");

  if (data.Status === 3) {
    const result = data.Result;
    misty.Debug("Successfully taken picture: " + result.ContentType);
    checkTraceTogetherImage(result.Base64);
  } else {
    misty.Debug("Failed to take picture!");
    misty.Speak("Failed to take picture! Please try again.");
  }
}

function checkTraceTogetherImage(base64) {
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
  const response = JSON.parse(data.Result.ResponseObject.Data);

  misty.Debug(JSON.stringify(response));

  // Check for errors in detection
  const errorDetail = response["detail"];
  if (errorDetail) {
    misty.Speak(`Sorry, ${errorDetail}`);
    return;
  }

  handleTraceTogetherResult(response);
}

function handleTraceTogetherResult({
  dateValid,
  locationValid,
  checkIn,
  safeEntry,
  vaccinated,
}) {
  const isCheckInCert = (checkIn && safeEntry) || vaccinated;

  // Make sure it is a trace-together check-in certificate
  if (!isCheckInCert) {
    misty.Speak("Sorry! Invalid trace together check-in certificate");
    return;
  }

  // Not fully vaccinated cannot enter
  if (!vaccinated) {
    misty.Speak("Sorry! You are not fully vaccinated");
    return;
  }

  // Date or location
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
