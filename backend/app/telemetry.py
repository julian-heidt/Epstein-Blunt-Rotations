"""OpenTelemetry setup: traces, metrics, and JSON logs with trace correlation."""

import logging
import os
import socket

os.environ.setdefault("OTEL_SEMCONV_STABILITY_OPT_IN", "http")
os.environ.setdefault("OTEL_PYTHON_LOG_CORRELATION", "true")

from opentelemetry import metrics, trace  # noqa: E402
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter  # noqa: E402
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter  # noqa: E402
from opentelemetry.instrumentation.logging import LoggingInstrumentor  # noqa: E402
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor  # noqa: E402
from opentelemetry.sdk.metrics import MeterProvider  # noqa: E402
from opentelemetry.sdk.metrics.export import (  # noqa: E402
    ConsoleMetricExporter,
    PeriodicExportingMetricReader,
)
from opentelemetry.sdk.resources import Resource  # noqa: E402
from opentelemetry.sdk.trace import TracerProvider  # noqa: E402
from opentelemetry.sdk.trace.export import (  # noqa: E402
    BatchSpanProcessor,
    ConsoleSpanExporter,
)
from pythonjsonlogger.json import JsonFormatter  # noqa: E402

LOG_FORMAT = (
    "%(asctime)s %(levelname)s %(name)s %(message)s "
    "%(otelTraceID)s %(otelSpanID)s %(otelServiceName)s"
)

_configured = False


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter(LOG_FORMAT))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = [handler]
        lg.propagate = False
    LoggingInstrumentor().instrument(set_logging_format=False, inject_trace_context=True)


def setup_telemetry() -> None:
    global _configured
    if _configured:
        return
    _configured = True

    resource = Resource.create(
        {
            "service.name": os.environ.get("OTEL_SERVICE_NAME", "evil-blunts-backend"),
            "service.version": os.environ.get("GIT_SHA", "dev")[:12] or "dev",
            "service.instance.id": f"{socket.gethostname()}-{os.getpid()}",
        }
    )

    if os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        span_exporter = OTLPSpanExporter()
        metric_exporter = OTLPMetricExporter()
    else:
        span_exporter = ConsoleSpanExporter()
        metric_exporter = ConsoleMetricExporter()

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    trace.set_tracer_provider(tracer_provider)

    reader = PeriodicExportingMetricReader(metric_exporter)
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[reader]))

    _configure_logging()
    PymongoInstrumentor().instrument()
