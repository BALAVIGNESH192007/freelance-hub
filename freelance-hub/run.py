"""
Entry-point: starts the Freelance Hub Flask server.
Run from project root:
    python run.py
"""
import os
import subprocess
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))

    # Prefer the venv python; fall back to the current interpreter
    venv_python = os.path.join(root_dir, 'venv', 'Scripts', 'python.exe')
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    print(f"Starting Freelance Hub ...")
    print(f"Python : {venv_python}")
    print(f"Open   : http://localhost:5000")

    try:
        # Run as a package module so relative imports work correctly
        subprocess.run(
            [venv_python, '-m', 'backend.app'],
            cwd=root_dir,
            check=True
        )
    except KeyboardInterrupt:
        print("\nFreelance Hub server stopped.")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
