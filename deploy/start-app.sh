#!/bin/sh
set -eu

/app/server &
server_pid=$!

nginx -g 'daemon off;' &
nginx_pid=$!

cleanup() {
  kill "$server_pid" "$nginx_pid" 2>/dev/null || true
}

trap cleanup INT TERM

while kill -0 "$server_pid" 2>/dev/null && kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 1
done

cleanup
wait "$server_pid" 2>/dev/null || true
wait "$nginx_pid" 2>/dev/null || true
exit 1
