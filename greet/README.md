# Greet

Misty greets you when you come close to her and says goodbye when you leave her. She's happy to see you, and is sad when you leave. This skill is powered by [Misty's built-in face detection/recognition](https://docs.mistyrobotics.com/misty-ii/javascript-sdk/api-reference/#misty-startfacerecognition).

![Demo](Greet.gif)

## Skill Parameters

| Name              | Data Type | Description                                                                                     |
| ----------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `volume`          | `int`     | The audio volume for saying hello and goodbye                                                   |
| `timeoutMs`       | `int`     | How many seconds passed before saying goodbye when Misty doesn't detect any face.               |
| `distanceToGreet` | `int`     | How many centimeters between Misty and the user to say that the user is nearby Misty.           |
| `distanceToBye`   | `int`     | How many centimeters between Misty and the user to say that the user is no longer nearby Misty. |
| `helloFace`       | `String`  | Image name for the face expression when Misty says hello                                        |
| `goodbyeFace`     | `String`  | Image name for the face expression when Misty says goodbye                                      |
| `helloSound`      | `String`  | Misty's hello audio file name.                                                                  |
| `goodbyeSound`    | `String`  | Misty's goodbye audio file name.                                                                |
