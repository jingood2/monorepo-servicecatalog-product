<powershell>
    mkdir c:\datadog\download;
    Set-Location c:\datadog\download;
    Invoke-WebRequest -Uri 'https://s3.amazonaws.com/ddagent-windows-stable/datadog-agent-7-latest.amd64.msi' -OutFile 'C:\datadog\download\datadog-agent-7-latest.amd64.msi';
    Start-Process -Wait msiexec -ArgumentList '/qn /i datadog-agent-7-latest.amd64.msi APIKEY="XXXXXXXXXXXXXXX"';
    $logs = "logs_enabled: false";
    $default_app_key = "api_key: """;
    $app_key = "api_key: `"XXXXXXXXXXXXXXX";
    (Get-Content "C:\ProgramData\Datadog\datadog.yaml") -replace "log_enabled: false", "$logs" | Set-Content "C:\ProgramData\Datadog\datadog.yaml";
    (Get-Content "C:\ProgramData\Datadog\datadog.yaml") -replace $default_app_key, "$app_key" | Set-Content "C:\ProgramData\Datadog\datadog.yaml";
    & "$env:ProgramFiles\Datadog\Datadog Agent\bin\agent.exe" restart-service;
</powershell>
<persist>true</persist>