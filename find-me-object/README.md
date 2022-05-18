# Find Me Object

This skill is a game based on [Misty's built-in object detection](https://docs.mistyrobotics.com/misty-ii/javascript-sdk/api-reference/#misty-startobjectdetector).

## Game Rules

Misty displays an object name in his display and the remaining time in seconds. The user must bring the object and show it to Misty on time. Misty will actively try to the detect the object, and responded to the user once the object has been detected.

The list of objects that Misty will ask can be found in the script on line 12. The list of all supported objects can be found [here](https://docs.mistyrobotics.com/misty-ii/javascript-sdk/api-reference/#misty-startobjectdetector).

For each object that Misty detected, the user will earn **1 point**. The game ends if the user fails to bring an object on time. There are no winning condition for this game.
