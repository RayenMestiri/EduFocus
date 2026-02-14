Daily heartbeat commit — local setup

This repository includes an automated GitHub Actions workflow that updates `.github/daily-heartbeat.txt` daily.
If you prefer the commits to come from your machine (so they appear as your account), use the local scripts below and schedule them.

Scripts
- Windows (Task Scheduler): `scripts/daily-commit.bat`
- Linux / macOS (cron / systemd timer): `scripts/daily-commit.sh`

Quick test (run from repo root):

Windows (PowerShell/CMD):

```powershell
scripts\daily-commit.bat
```

Unix:

```bash
bash scripts/daily-commit.sh
```

Schedule on Windows (Task Scheduler):
1. Open Task Scheduler -> Create Task
2. Name: "Daily Repo Heartbeat"
3. Trigger: Daily at desired time
4. Action: Start a program -> Program/script: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
   - Add arguments: `-NoProfile -ExecutionPolicy Bypass -File "$(RepositoryPath)\\scripts\\daily-commit.bat"`
5. (Optional) Run only when user is logged on / or configure with saved credentials.

Schedule on Linux (cron):
1. Run `crontab -e`
2. Add a line (example: daily at 08:00 UTC):

```
0 8 * * * /bin/bash /path/to/repo/scripts/daily-commit.sh >> /path/to/repo/logs/daily-commit.log 2>&1
```

Notes & best practices
- Use your own name/email in the script `--author="Your Name <you@example.com>"` if you want commits attributed specifically.
- Commits must be pushed to a branch you have write access to. If you schedule this on your machine, ensure your SSH keys or credentials are set up.
- Contribution squares: GitHub shows contributions for commits pushed to the default branch (or merged PRs). If you want the green square effect for your account, push to the default branch or use your account credentials.
- Avoid noisy automation: prefer meaningful commits (generated docs, test results, version bumps). Simple heartbeat commits are fine for private repos, but consider repository hygiene for public projects.
- Rate limits: keep frequency reasonable (daily is fine). Excessive commits may trigger rate limiting or look suspicious.

If you want, I can:
- Create the Task Scheduler XML for Windows to import.
- Add a README section in the project root showing how to enable it.
- Configure the scripts to use an environment variable for author name/email.
