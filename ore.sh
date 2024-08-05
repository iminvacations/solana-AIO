# Start the PM2 processes using the pm2.json configuration file
pm2 start ./ore/pm2.json

# Check the status of PM2 processes
while true; do
  # Get the number of processes that are still launching
  LAUNCHING_COUNT=$(pm2 list | grep -c 'launching')

  # If there are no processes still launching, break the loop
  if [ "$LAUNCHING_COUNT" -eq 0 ]; then
    break
  fi

  # Wait for a few seconds before checking again
  sleep 5
done

# Start PM2 monitoring
pm2 monit