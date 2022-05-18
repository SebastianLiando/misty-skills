# TraceTogether Checking Server

[![Link to Report](https://img.shields.io/badge/Report-DR%20NTU-blueviolet)](https://hdl.handle.net/10356/157337)

This server is required for the Misty skill to check trace together check-in certificate. After the first run, the server can run without making external network request.

This skill is the server component for my final year project for my Bachelors in Computer Science in Nanyang Technological University. There are 2 other components: [the robot](https://github.com/SebastianLiando/misty-skills/tree/main/trace-together-checker/skill) and [the Flutter application](https://github.com/SebastianLiando/misty-tracer). Please find the detailed report [here](https://hdl.handle.net/10356/157337).

## Requirements

- Python 3.7 or above
- Tesseract OCR
- MongoDB

## How to Run

Install the Python packages in the requirements file.

```
pip install -r requirements.txt
```

Run the server.

```
python app/main.py
```
