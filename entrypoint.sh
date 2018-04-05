#!/bin/sh
PARAM=$@

echo "Entrypoint started with $PARAM"


case "$1" in
        --single-run)
            /singlerun.sh
            ;;
         
        --crond-forever)
            crontab /etc/cron/crontab
            crond  -f
            ;;
         
        --single-run-now-and-crond-forever)
            /singlerun.sh
            crontab /etc/cron/crontab
            crond  -f
            ;;
        *)
            echo "Usage: $0 {--single-run|--crond-forever|--single-run-now-and-crond-forever}"
            exit 1
esac 
