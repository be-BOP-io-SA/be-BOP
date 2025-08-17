#!/bin/bash

set -e
set -x
set -o pipefail

ENV_LOCAL_PATH=/app/.env.local

if test -z "${DOTENV_LOCAL}" ; then
	if ! test -f "${ENV_LOCAL_PATH}" ; then
		echo "DOTENV_LOCAL was not found in the ENV variables and .env.local is not set using a bind volume. We are using the default .env config."
	fi;
else
	echo "DOTENV_LOCAL was found in the ENV variables. Creating .env.local file."
	cat <<< "$DOTENV_LOCAL" > ${ENV_LOCAL_PATH}
fi;

touch ${ENV_LOCAL_PATH}

if ! grep -q "^${MONGODB_URL}$" ${ENV_LOCAL_PATH}; then
	if test -z "${MONGODB_URL}" ; then
		echo "Error: Missing MONGODB_URL from environment, see README.md for more information. Make sure to have a replica-set-enabled MongoDB.";
		exit 1;
	fi;
fi

if ! grep -q "^${S3_BUCKET}$" ${ENV_LOCAL_PATH}; then
	if test -z "${S3_BUCKET}" ; then
		echo "Error: Missing S3_BUCKET from environment, see README.md for more information";
		exit 1;
	fi;
fi

if ! grep -q "^${S3_ENDPOINT_URL}$" ${ENV_LOCAL_PATH}; then
	if test -z "${S3_ENDPOINT_URL}" ; then
		echo "Error: Missing S3_ENDPOINT_URL from environment, see README.md for more information";
		exit 1;
	fi;
fi

if ! grep -q "^${S3_REGION}$" ${ENV_LOCAL_PATH}; then
	if test -z "${S3_REGION}" ; then
		echo "Error: Missing S3_REGION from environment, see README.md for more information";
		exit 1;
	fi;
fi

if ! grep -q "^${S3_KEY_ID}$" ${ENV_LOCAL_PATH}; then
	if test -z "${S3_KEY_ID}" ; then
		echo "Error: Missing S3_KEY_ID from environment, see README.md for more information";
		exit 1;
	fi;
fi

if ! grep -q "^${S3_KEY_SECRET}$" ${ENV_LOCAL_PATH}; then
	if test -z "${S3_KEY_SECRET}" ; then
		echo "Error: Missing S3_KEY_SECRET from environment, see README.md for more information";
		exit 1;
	fi;
fi
