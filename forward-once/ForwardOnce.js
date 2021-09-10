const BUMP_EVENT = "OnBump";

misty.Debug("Starting skill - ForwardOnce");

misty.UnregisterEvent("OnBump");
// 1st -> don't use the default setting
// 2nd -> disable ALL ToF sensor
// 3rd -> disable bump sensors
misty.UpdateHazardSettings(false, true, false);

// Register a single-shot bump event, only when it is contacted
misty.AddPropertyTest(BUMP_EVENT, "isContacted", "==", true, "boolean");
misty.RegisterEvent(BUMP_EVENT, "BumpSensor", 100, false);

function _OnBump() {
  // Stop all robot movements
  misty.Stop();
  // Revert hazard settings to default
  misty.UpdateHazardSettings(true);
  // Cancel this skill
  misty.CancelSkill("2b8d70ff-ca4e-45b8-973f-d9b14c684329");
}

// Go straight

misty.Drive(5, 0);
