#!/bin/bash

git pull

cd frontend

npm i
npm run build

cd ../backend

npm i
npm run build
npm run stop
npm run pro

