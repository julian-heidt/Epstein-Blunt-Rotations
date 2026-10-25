"""Shared rate limiter instance, imported by main.py and route modules.

Every request reaches uvicorn from the frontend nginx container, so the TCP
peer is always that container. The frontend nginx works out the real client
address and sends it in X-Real-IP. This module reads that header only when the
TCP peer is inside TRUSTED_PROXY_CIDRS, so a request from anywhere else cannot
pick its own rate limit bucket by sending the header.
"""

import ipaddress
import os

from slowapi import Limiter
from starlette.requests import Request

# Docker's default Swarm overlay pool. The frontend container reaches the
# backend over ebr-net, an overlay network. Comma-separated CIDRs. An invalid
# value stops the backend at startup. An empty value trusts nothing.
_raw_cidrs = os.environ.get("TRUSTED_PROXY_CIDRS", "10.0.0.0/8")
TRUSTED_PROXY_NETWORKS = [
    ipaddress.ip_network(c.strip(), strict=False)
    for c in _raw_cidrs.split(",")
    if c.strip()
]


def client_key(request: Request) -> str:
    """Rate limit key: the client address that the trusted proxy reported."""
    peer = request.client.host if request.client else "unknown"
    try:
        peer_ip = ipaddress.ip_address(peer)
    except ValueError:
        return peer
    if any(peer_ip in net for net in TRUSTED_PROXY_NETWORKS):
        reported = request.headers.get("x-real-ip", "").strip()
        try:
            return str(ipaddress.ip_address(reported))
        except ValueError:
            pass  # missing or malformed header: fall back to the peer
    return peer


limiter = Limiter(key_func=client_key)
