#!/bin/bash
# pre-commit hook: run gitleaks before every commit
# Install: cp .gitleaks-precommit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

if command -v gitleaks &> /dev/null; then
  gitleaks protect --staged --config .gitleaks.toml -v
  if [ $? -ne 0 ]; then
    echo "❌ gitleaks found secrets! Commit blocked."
    echo "   Fix the issues above or add to allowlist in .gitleaks.toml"
    exit 1
  fi
else
  echo "⚠️  gitleaks not installed — install with: brew install gitleaks"
  echo "   Skipping secret scan (UNSAFE). Install gitleaks before committing secrets."
fi
