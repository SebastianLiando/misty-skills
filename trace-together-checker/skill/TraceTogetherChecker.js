misty.UnregisterAllEvents();
misty.EnableCameraService();

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
  misty.Debug("File size: " + base64.length);
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
