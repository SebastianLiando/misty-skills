# Info Session

This skill is used for automatic registration for Nanyang Technological University's SCSE Information Session 2022. This skill is based on [TraceTogetherChecker skill](https://github.com/SebastianLiando/misty-skills/tree/main/trace-together-checker/skill) but with a different verification logic in the server side.

## How it Works

Attendees of the event receives a confirmation email like the following example.
![Example email](/info-session/email-example.jpg)

Attendees zoom in the salutation section on the email and show it to Misty. Misty takes a picture, send it to a local server, and responds to the user based on the verification result. Please refer to [TraceTogetherChecker skill](https://github.com/SebastianLiando/misty-skills/tree/main/trace-together-checker/skill) for more details.
