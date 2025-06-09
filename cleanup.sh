#!/bin/bash

# Remove old MoccetChat components
rm -f src/MoccetChat.jsx
rm -f src/MoccetChat.firebase.jsx

# Remove unused components
rm -f src/components/ChannelStatus.js
rm -f src/components/FeatureToggle.js

echo "Cleanup completed!"