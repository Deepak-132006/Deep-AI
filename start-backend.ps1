$root = $PSScriptRoot

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command",
    "Set-Location '$root\server'; & '.\venv\Scripts\Activate.ps1'; python -m uvicorn deepai.api:app --reload"
)