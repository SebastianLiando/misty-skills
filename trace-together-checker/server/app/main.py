from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import robot, trace_together, websocket, info_session
import uvicorn

app = FastAPI()
app.include_router(robot.router)
app.include_router(trace_together.router)
app.include_router(websocket.router)
app.include_router(info_session.router)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def canary():
    return {"Server": True}

if __name__ == "__main__":
    # Run this script on port 8000 (default port number)
    uvicorn.run("main:app", host="0.0.0.0")
