# TraceTogether Checking Server

This server is required for the Misty skill to check trace together check-in certificate. The server works offline.

## Requirements

- [Swig](http://www.swig.org/)
- [Microsoft Visual C++ Build Tools 14](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- `pocketsphinx` Python module (requires both the requirements above to be installed)
- Tesseract OCR and pytesseract

## Endpoints

### POST `/speech`

Used to do speech recognition.

#### Request Body

| Param   | Type     | Desc                             |
| ------- | -------- | -------------------------------- |
| `audio` | `String` | Base64 string of the audio file. |

#### Response

| Param    | Type     | Desc                   |
| -------- | -------- | ---------------------- |
| `speech` | `String` | The recognized speech. |

### POST `/check`

Used to check the trace together check-in certificate photo.

#### Request Body

| Param   | Type     | Desc                             |
| ------- | -------- | -------------------------------- |
| `image` | `String` | Base64 string of the image file. |

#### Response

| Param        | Type      | Desc                                                      |
| ------------ | --------- | --------------------------------------------------------- |
| `date_valid` | `Boolean` | `true` if the date is a valid date.                       |
| `check_in`   | `Boolean` | `true` if it is a check-in certificate.                   |
| `safe_entry` | `Boolean` | `true` if the certificate is a TraceTogether certificate. |
