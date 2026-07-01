#!/bin/sh
set -e

VPN_IFACE=$(ip -o -4 addr show | awk '/10\.20\.20\./ {print $2}')
if [ -n "$VPN_IFACE" ]; then
  echo "Adding route to Dahua subnet via $VPN_IFACE"
  ip route add 10.10.10.0/24 via 10.20.20.2 dev "$VPN_IFACE" || true
else
  echo "WARNING: vpn_net interface not found. Skipping route to 10.10.10.0/24"
fi

npx prisma db push --accept-data-loss
if [ "${RUN_SEED:-0}" = "1" ]; then
  node prisma/seed.js || true
fi
node dist/main.js
