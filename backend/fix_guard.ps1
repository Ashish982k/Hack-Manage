$file = '.\controllers\report.ts'
$lines = Get-Content $file  # reads as string array, one per line

$result = [System.Collections.Generic.List[string]]::new()
$i = 0
$patched = 0

while ($i -lt $lines.Count) {
    $line = $lines[$i]
    $result.Add($line)

    # Look for the pattern: inside downloadTeamAnalyticsReport or downloadJudgeAnalyticsReport,
    # after the auth guard closing brace, we find an empty line then "  try {"
    # We detect: line is "  try {" and the previous non-empty line was "  }" (closing the auth check)
    # and there's no hackathonId guard yet (i.e. we haven't already added it)
    if ($line -eq '  try {' -and $i -ge 2) {
        # Check if we are in a context that needs the guard
        # Look back for "  }" with an empty line before "  try {"
        $prevLine = $lines[$i - 1]  # should be empty
        $prevPrevLine = if ($i -ge 2) { $lines[$i - 2] } else { '' }

        # Check there's no hackathonId guard 3-6 lines before
        $alreadyHasGuard = $false
        for ($j = [Math]::Max(0, $i - 10); $j -lt $i; $j++) {
            if ($lines[$j] -match 'Hackathon ID is required') {
                $alreadyHasGuard = $true
                break
            }
        }

        if (!$alreadyHasGuard -and $prevLine -eq '' -and $prevPrevLine -eq '  }') {
            # Check if there's an auth 401 a few lines before
            $hasAuthGuard = $false
            for ($j = [Math]::Max(0, $i - 8); $j -lt $i; $j++) {
                if ($lines[$j] -match '401') {
                    $hasAuthGuard = $true
                    break
                }
            }

            if ($hasAuthGuard) {
                # Remove the "  try {" we just added, insert guard, then re-add try
                $result.RemoveAt($result.Count - 1)
                $result.Add('')
                $result.Add('  if (!hackathonId) {')
                $result.Add('    return c.json({ message: "Hackathon ID is required" }, 400);')
                $result.Add('  }')
                $result.Add('')
                $result.Add('  try {')
                $patched++
            }
        }
    }

    $i++
}

Set-Content -Path $file -Value $result
Write-Host "Patched $patched location(s)."
