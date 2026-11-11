"""WebSocket race endpoint and race protocol handler."""
from __future__ import annotations
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.race import RaceSession
from backend.app.maze.grid import MazeGrid
from backend.app.jobs import job_manager
from backend.app.errors import BUSY

router = APIRouter()


@router.websocket("/ws/race")
async def websocket_race(websocket: WebSocket):
    await websocket.accept()
    session: RaceSession | None = None

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                await websocket.send_json({"type": "error", "code": "INVALID_JSON", "message": "Malformed JSON payload."})
                continue

            msg_type = msg.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "race.init":
                if job_manager.is_benchmark_running():
                    await websocket.send_json({
                        "type": "error",
                        "code": BUSY,
                        "message": "Cannot start race session while a benchmark job is running.",
                    })
                    continue

                race_id = msg.get("raceId", "race_1")
                maze_data = msg.get("maze")
                participants = msg.get("participants", [])

                if not maze_data or not participants:
                    await websocket.send_json({
                        "type": "error",
                        "code": "INVALID_PARAMS",
                        "message": "Missing 'maze' or 'participants' in race.init.",
                    })
                    continue

                try:
                    grid = MazeGrid(
                        rows=maze_data["rows"],
                        cols=maze_data["cols"],
                        cells=maze_data["cells"],
                        start=tuple(maze_data["start"]),
                        goal=tuple(maze_data["goal"]),
                        diagonal=maze_data.get("diagonal", False),
                    )
                    grid.validate()
                    session = RaceSession(race_id=race_id, maze=grid, participants=participants)
                    ready_msg = session.get_ready_message()
                    await websocket.send_text(ready_msg.model_dump_json())
                except Exception as e:
                    await websocket.send_json({"type": "error", "code": "INIT_FAILED", "message": str(e)})

            elif msg_type == "race.step":
                if session is None:
                    await websocket.send_json({
                        "type": "error",
                        "code": "NO_SESSION",
                        "message": "Send race.init before race.step.",
                    })
                    continue

                k = int(msg.get("k", 5))
                update_msg = session.step(k)
                await websocket.send_text(update_msg.model_dump_json())

                if update_msg.all_done:
                    summary_msg = session.get_summary_message()
                    await websocket.send_text(summary_msg.model_dump_json())

                    # Auto-record completed race to race_history
                    try:
                        from backend.app.db.base import session_scope
                        from backend.app.db.repo import record_race_history
                        with session_scope() as db_session:
                            record_race_history(
                                session=db_session,
                                maze_data=session.maze.to_dict(),
                                participants=[p.spec for p in session.participants],
                                summary=summary_msg.model_dump(),
                                reachable=(session.c_star is not None),
                                optimal_cost=session.c_star,
                            )
                    except Exception as e:
                        import logging
                        logging.getLogger("pathfinder.ws").warning("Failed to record race history: %s", e)

            elif msg_type == "race.reset":
                session = None
                await websocket.send_json({"type": "race.reset_ok"})

    except WebSocketDisconnect:
        pass

