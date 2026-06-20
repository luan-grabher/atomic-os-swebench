#!/usr/bin/env python3
"""
Compatibility entrypoint for external convergence loops.

The implementation lives in run_convergence.py so v1 and v2 share the same
credential handling, model selection, and benchmark behavior.
"""
from run_convergence import main


if __name__ == "__main__":
    main()
