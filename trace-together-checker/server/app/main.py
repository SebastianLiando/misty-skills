from fastapi import FastAPI
from routers import robot, trace_together
import uvicorn

app = FastAPI()
app.include_router(robot.router)
app.include_router(trace_together.router)


@app.get("/")
async def canary():
    return {"Server": True}

if __name__ == "__main__":
    # Run this script on port 8000 (default port number)
    uvicorn.run("main:app", host="0.0.0.0")
