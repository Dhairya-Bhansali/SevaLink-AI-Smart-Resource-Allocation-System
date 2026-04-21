import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

# Global In-Memory Metrics
PERFORMANCE_METRICS = {
    "total_requests": 0,
    "failed_requests": 0,
    "average_response_time": 0.0,
    "last_request_duration": 0.0,
    "prediction_latency": 0.0,
    "matching_latency": 0.0
}

class PerformanceMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        start_time = time.perf_counter()

        PERFORMANCE_METRICS["total_requests"] += 1

        response = None  # 🔧 CRITICAL FIX

        try:
            response = await call_next(request)

            if response.status_code >= 400:
                PERFORMANCE_METRICS["failed_requests"] += 1

        except Exception as e:

            PERFORMANCE_METRICS["failed_requests"] += 1

            logger.error(f"API ERROR: {str(e)}")

            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"}
            )

        end_time = time.perf_counter()

        duration = end_time - start_time

        PERFORMANCE_METRICS["last_request_duration"] = duration

        # Update average
        n = PERFORMANCE_METRICS["total_requests"]
        old_avg = PERFORMANCE_METRICS["average_response_time"]

        PERFORMANCE_METRICS["average_response_time"] = (
            (old_avg * (n - 1)) + duration
        ) / n

        # Specialized latency tracking
        path = request.url.path

        if "/predictions" in path:
            PERFORMANCE_METRICS["prediction_latency"] = duration

        elif "/matches" in path:
            PERFORMANCE_METRICS["matching_latency"] = duration

        if duration > 2.0:
            logger.warning(
                f"SLOW API WARNING: {path} took {duration:.2f} seconds."
            )

        return response