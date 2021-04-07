#!/usr/bin/env bash

# Removing the linked versions
npm uninstall @apollo/federation
npm uninstall @apollo/query-planner

# Installing non-linked versions
npm install @apollo/federation
npm install @apollo/query-planner

echo "Removed local federation link"
