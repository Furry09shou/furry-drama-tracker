$urls = @(
    @{ name='Episodes'; url='http://localhost:5000/api/episodes' },
    @{ name='Banners'; url='http://localhost:5000/api/banners' },
    @{ name='Categories'; url='http://localhost:5000/api/categories' }
)
foreach ($item in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $item.url -UseBasicParsing -TimeoutSec 5
        $data = $r.Content | ConvertFrom-Json
        $count = 0
        if ($data -is [System.Array]) { $count = $data.Count }
        else { $count = 1 }
        Write-Host "$($item.name) => Status:$($r.StatusCode) Count:$count First100:$($r.Content.Substring(0, [Math]::Min(100, $r.Content.Length)))"
    } catch {
        Write-Host "$($item.name) => ERROR: $($_.Exception.Message)"
    }
}
