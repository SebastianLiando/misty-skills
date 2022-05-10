function getTarget() {
  return _params.target;
}

const LABEL_TARGET = "cell phone";
misty.ChangeLED(255, 0, 0);

// LSetup listener for target
misty.AddPropertyTest("OnTarget", "Description", "==", getTarget(), "string");
misty.AddReturnProperty("OnTarget", "Description");
misty.AddReturnProperty("OnTarget", "Confidence");
misty.RegisterEvent("OnTarget", "ObjectDetection", 10, true);

// Starts object detection.
misty.StopObjectDetector();
misty.StartObjectDetector(0.55, 0, 5);

function _OnTarget(data) {
  const [name, confidence] = data.AdditionalResults;
  misty.Debug("Found: " + name);
  misty.ChangeLED(0, 255, 0);
  misty.DisplayText(name + ": " + confidence);

  // Timer for detection time out
  misty.UnregisterEvent("OnNoCellPhone");
  misty.RegisterTimerEvent("OnNoCellPhone", 1000, false);
}

function _OnNoCellPhone() {
  misty.ChangeLED(255, 0, 0);
  misty.DisplayText("");
}
