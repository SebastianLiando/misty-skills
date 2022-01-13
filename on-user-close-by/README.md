## OnUserCloseBy

This skill is used to get notified if there is any user close by to the robot. This is done by Misty's [trigger event API](https://docs.mistyrobotics.com/misty-ii/javascript-sdk/api-reference/#misty-triggerevent).

### Get Started

Run the following code in your Misty skill.

```javascript
// Listen to the events indefinitely
misty.RegisterUserEvent("OnUserCloseBy", true);
// Run this skill, which will broadcast the custom event
misty.RunSkill("29e71806-c2f7-46f4-b185-976dd0da3b27");
```

### Parameters

| Name                | Data Type | Description                                                      |
| ------------------- | --------- | ---------------------------------------------------------------- |
| `distanceThreshold` | `number`  | How many centimeters is close by.                                |
| `timeoutMs`         | `number`  | How many milliseconds to define that user is no longer close by. |
