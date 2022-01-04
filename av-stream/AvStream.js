misty.Debug("Starting - AvStream Skill");

misty.UnregisterAllEvents();

const BUMP_EVENT = "OnBump";
misty.AddPropertyTest(BUMP_EVENT, "isContacted", "==", true, "boolean");
misty.RegisterEvent(BUMP_EVENT, "BumpSensor", 100, true);

function _OnBump() {
  misty.AvStreamingServiceEnabled(); // Calls _GetAvStreamingServiceEnabled
}

function _GetAvStreamingServiceEnabled(data) {
  const avServiceEnabled = data.Result;

  if (avServiceEnabled) {
    // Disable, by enabling camera service
    misty.Debug("Stopping AV Stream");
    misty.Speak("Stopping AV Stream", true);
    misty.StopAvStreaming();
    misty.EnableCameraService();
  } else {
    misty.Debug("Starting AV Stream");
    misty.Speak("Starting AV Stream", true);
    misty.EnableAvStreamingService();
    misty.StartAvStreaming("rtspd:1936");
  }
}
