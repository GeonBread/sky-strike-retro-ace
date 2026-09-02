[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$ZipPath,

    [string]$ProjectPath,

    [switch]$NoBuild,

    [switch]$Commit,

    [switch]$Push,

    [switch]$NonInteractive,

    [string]$CommitMessage
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnMessage([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$FailureMessage = "Command failed."
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage Exit code: $LASTEXITCODE"
    }
}

function Get-CommandOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & $Command @Arguments 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }
    return ($output | Out-String).Trim()
}

function Normalize-RelativePath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { return "" }
    return $Path.Replace("\", "/").TrimStart("/")
}

function Assert-SafeRelativePath([string]$Path) {
    $normalized = Normalize-RelativePath $Path
    if ([string]::IsNullOrWhiteSpace($normalized)) {
        throw "An empty patch path was found."
    }
    if ([System.IO.Path]::IsPathRooted($normalized)) {
        throw "Absolute paths are not allowed in a patch: $normalized"
    }
    if ($normalized -match '(^|/)\.\.(/|$)') {
        throw "Parent-directory traversal is not allowed: $normalized"
    }
    if ($normalized -match '^(\.git|node_modules|dist|coverage|\.vite)(/|$)') {
        throw "A protected path was included in the patch: $normalized"
    }
    if ($normalized -match '^\.env($|\.)' -and $normalized -ne '.env.example') {
        throw "Environment-secret files are not allowed in the patch: $normalized"
    }
    return $normalized
}

function Test-AutoIncludedPath([string]$Path) {
    $normalized = Normalize-RelativePath $Path
    if ($normalized -match '^(src|public|docs|supabase)/') { return $true }

    $fileName = [System.IO.Path]::GetFileName($normalized)
    $directoryName = [System.IO.Path]::GetDirectoryName($normalized)
    if ([string]::IsNullOrWhiteSpace($directoryName)) {
        $allowedRootFiles = @(
            'package.json', 'package-lock.json', 'pnpm-lock.yaml',
            'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts',
            'vite.config.js', '.env.example'
        )
        if ($allowedRootFiles -contains $fileName) { return $true }
        if ($fileName -match '^README.*\.(md|txt)$') { return $true }
    }
    return $false
}

function Get-FileSha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Get-AutomaticCommitMessage {
    param(
        [Parameter(Mandatory = $true)][string]$PatchRoot,
        [Parameter(Mandatory = $true)][string]$TemporaryRoot,
        [Parameter(Mandatory = $true)][string]$ArchivePath,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot
    )

    $patchFolderName = Split-Path -Leaf $PatchRoot
    $temporaryFolderName = Split-Path -Leaf $TemporaryRoot
    $repositoryFolderName = Split-Path -Leaf $RepositoryRoot
    $zipBaseName = [System.IO.Path]::GetFileNameWithoutExtension($ArchivePath)

    # Browser downloads often append (1), (2), ... to duplicate ZIP files.
    $zipBaseName = ($zipBaseName -replace '\(\d+\)$', '').Trim()

    # Partial patches frequently keep the repository folder as a generic wrapper.
    # Prefer the descriptive ZIP filename when the wrapper adds no useful detail.
    $genericPatchFolder = (
        [string]::IsNullOrWhiteSpace($patchFolderName) -or
        $patchFolderName -eq $temporaryFolderName -or
        $patchFolderName -eq $repositoryFolderName -or
        $patchFolderName -match '^sky-strike[_-]*retro[_-]*ace$' -or
        $patchFolderName -match '^sky-strike-zip-patch-\d{8}-\d{6}$'
    )

    if ($genericPatchFolder) {
        $patchFolderName = $zipBaseName
    }

    if ([string]::IsNullOrWhiteSpace($patchFolderName)) {
        return 'validated ZIP patch'
    }

    return $patchFolderName.Trim()
}

function Get-RelativePathIfInside([string]$ParentPath, [string]$ChildPath) {
    $parentFull = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $childFull = [System.IO.Path]::GetFullPath($ChildPath)
    if (-not $childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }
    return Normalize-RelativePath $childFull.Substring($parentFull.Length)
}

function Get-ParentCandidates([string]$StartPath) {
    $results = @()
    if ([string]::IsNullOrWhiteSpace($StartPath) -or -not (Test-Path $StartPath)) {
        return $results
    }

    $item = Get-Item -LiteralPath $StartPath
    if (-not $item.PSIsContainer) { $item = $item.Directory }

    while ($null -ne $item) {
        $results += $item.FullName
        $item = $item.Parent
    }
    return $results
}

function Select-ProjectFolder {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Select the Git project folder containing .git and package.json"
    $dialog.ShowNewFolderButton = $false
    $result = $dialog.ShowDialog()
    if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
        throw "Project-folder selection was cancelled."
    }
    return $dialog.SelectedPath
}

function Find-GitMarkerRoot([string]$StartPath) {
    if ([string]::IsNullOrWhiteSpace($StartPath) -or -not (Test-Path -LiteralPath $StartPath)) {
        return $null
    }

    $item = Get-Item -LiteralPath $StartPath
    if (-not $item.PSIsContainer) { $item = $item.Directory }

    while ($null -ne $item) {
        $gitMarker = Join-Path $item.FullName '.git'
        if (Test-Path -LiteralPath $gitMarker) {
            return $item.FullName
        }
        $item = $item.Parent
    }
    return $null
}

function Confirm-GitRepository([string]$Candidate) {
    if ([string]::IsNullOrWhiteSpace($Candidate)) { return $null }
    $result = & git -C $Candidate rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $result) {
        return ($result | Select-Object -First 1).Trim()
    }
    return $null
}

function Get-RepositoryRoot([string]$PreferredPath) {
    $searchStarts = @()
    if (-not [string]::IsNullOrWhiteSpace($PreferredPath)) {
        $searchStarts += $PreferredPath
    }
    $searchStarts += (Get-Location).Path
    $searchStarts += $PSScriptRoot

    foreach ($start in @($searchStarts | Select-Object -Unique)) {
        $markerRoot = Find-GitMarkerRoot -StartPath $start
        if (-not [string]::IsNullOrWhiteSpace($markerRoot)) {
            $confirmed = Confirm-GitRepository -Candidate $markerRoot
            if (-not [string]::IsNullOrWhiteSpace($confirmed)) { return $confirmed }
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($PreferredPath)) {
        throw "The supplied project folder is not a Git repository: $PreferredPath"
    }

    if (-not $NonInteractive) {
        $selected = Select-ProjectFolder
        $markerRoot = Find-GitMarkerRoot -StartPath $selected
        $confirmed = Confirm-GitRepository -Candidate $markerRoot
        if (-not [string]::IsNullOrWhiteSpace($confirmed)) { return $confirmed }
        throw "The selected folder is not a Git repository: $selected"
    }

    throw "No Git repository was found. Pass -ProjectPath explicitly."
}

function Select-ZipFile {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = "Select a ZIP patch"
    $dialog.Filter = "ZIP patch (*.zip)|*.zip"
    $dialog.Multiselect = $false
    $downloads = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'
    if (Test-Path $downloads) { $dialog.InitialDirectory = $downloads }
    $result = $dialog.ShowDialog()
    if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
        throw "ZIP selection was cancelled."
    }
    return $dialog.FileName
}

function Validate-ZipEntries([string]$ArchivePath) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        foreach ($entry in $archive.Entries) {
            if ([string]::IsNullOrEmpty($entry.Name)) { continue }
            $name = $entry.FullName.Replace("\", "/")
            if ([System.IO.Path]::IsPathRooted($name) -or $name -match '(^|/)\.\.(/|$)') {
                throw "Unsafe ZIP entry detected: $name"
            }
        }
    }
    finally {
        $archive.Dispose()
    }
}

function Test-PatchRootMarker([string]$CandidatePath) {
    if ([string]::IsNullOrWhiteSpace($CandidatePath) -or -not (Test-Path -LiteralPath $CandidatePath -PathType Container)) {
        return $false
    }

    # Manifest/delete-only patches are valid even when no src/public tree exists.
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'PATCH_MANIFEST.json') -PathType Leaf) { return $true }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'PATCH_DELETE.txt') -PathType Leaf) { return $true }

    # Full project ZIPs and partial ZIPs both qualify when project-relative roots
    # such as src/, public/, docs/, or supabase/ are preserved.
    foreach ($directoryName in @('src', 'public', 'docs', 'supabase')) {
        if (Test-Path -LiteralPath (Join-Path $CandidatePath $directoryName) -PathType Container) {
            return $true
        }
    }

    # Support root-file-only partial patches such as vite.config.ts or README files.
    $directFiles = @(Get-ChildItem -LiteralPath $CandidatePath -File -ErrorAction SilentlyContinue)
    foreach ($file in $directFiles) {
        if (Test-AutoIncludedPath $file.Name) { return $true }
    }

    return $false
}

function Get-PatchRootScore([string]$CandidatePath) {
    $score = 0
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'PATCH_MANIFEST.json') -PathType Leaf) { $score += 100000 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'PATCH_DELETE.txt') -PathType Leaf) { $score += 90000 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'package.json') -PathType Leaf) { $score += 10000 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'src') -PathType Container) { $score += 5000 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'public') -PathType Container) { $score += 3000 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'docs') -PathType Container) { $score += 500 }
    if (Test-Path -LiteralPath (Join-Path $CandidatePath 'supabase') -PathType Container) { $score += 500 }

    $applicableCount = @(Get-ChildItem -LiteralPath $CandidatePath -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $relative = Normalize-RelativePath $_.FullName.Substring($CandidatePath.Length).TrimStart('\', '/')
        Test-AutoIncludedPath $relative
    }).Count

    return $score + $applicableCount
}

function Find-PatchRoot([string]$ExtractRoot) {
    if (Test-PatchRootMarker -CandidatePath $ExtractRoot) {
        return $ExtractRoot
    }

    # Repeatedly unwrap ZIPs that contain only one folder. Unlike v3, do not
    # return that folder until it actually contains a supported project root.
    $current = $ExtractRoot
    for ($depth = 0; $depth -lt 12; $depth++) {
        if (Test-PatchRootMarker -CandidatePath $current) {
            return $current
        }

        $directories = @(Get-ChildItem -LiteralPath $current -Directory -ErrorAction SilentlyContinue)
        $files = @(Get-ChildItem -LiteralPath $current -File -ErrorAction SilentlyContinue)
        if ($directories.Count -eq 1 -and $files.Count -eq 0) {
            $current = $directories[0].FullName
            continue
        }
        break
    }

    # Search every nested directory and choose the strongest project-root
    # candidate rather than blindly selecting the first top-level folder.
    $candidatePaths = @($ExtractRoot)
    $candidatePaths += @(Get-ChildItem -LiteralPath $ExtractRoot -Directory -Recurse -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    $candidates = @($candidatePaths | Select-Object -Unique | Where-Object {
        Test-PatchRootMarker -CandidatePath $_
    } | ForEach-Object {
        [PSCustomObject]@{
            Path = $_
            Score = Get-PatchRootScore -CandidatePath $_
            Length = $_.Length
        }
    } | Sort-Object @{ Expression = 'Score'; Descending = $true }, @{ Expression = 'Length'; Descending = $false })

    if ($candidates.Count -gt 0) {
        if ($candidates.Count -gt 1) {
            Write-WarnMessage "Multiple possible patch roots were found. Using the highest-scoring candidate."
            $candidates | Select-Object -First 5 Path, Score | Format-Table -AutoSize | Out-Host
        }
        return $candidates[0].Path
    }

    Write-WarnMessage "No supported project root was detected. First ZIP entries after extraction:"
    Get-ChildItem -LiteralPath $ExtractRoot -Recurse -File -ErrorAction SilentlyContinue |
        Select-Object -First 40 |
        ForEach-Object { $_.FullName.Substring($ExtractRoot.Length).TrimStart('\', '/') } |
        ForEach-Object { Write-Host "  $_" }

    throw "Could not identify the patch root. Preserve project-relative paths such as src/, public/, docs/, supabase/, supported root files, PATCH_MANIFEST.json, or PATCH_DELETE.txt."
}

function Restore-AppliedPatch {
    param(
        [string]$RepositoryRoot,
        [object[]]$Plan
    )

    Write-WarnMessage "Validation failed after files were applied. Restoring only paths touched by this ZIP."
    Set-Location $RepositoryRoot

    & git restore --staged --worktree -- . | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-WarnMessage "git restore failed. Review git status manually."
    }

    foreach ($item in @($Plan | Where-Object { $_.Status -eq 'NEW' })) {
        if (Test-Path -LiteralPath $item.Destination) {
            Remove-Item -LiteralPath $item.Destination -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Ok "Tracked files were restored and only new files from this ZIP were removed."
    Write-WarnMessage "No git reset --hard and no git clean command was used."
}

$originalLocation = (Get-Location).Path
$temporaryRoot = $null
$repositoryRoot = $null
$baselineCommit = $null
$backupBranch = $null
$reportPath = $null
$plan = @()
$mutationStarted = $false

try {
    if ([string]::IsNullOrWhiteSpace($ZipPath)) {
        if ($NonInteractive) { throw "-ZipPath is required in non-interactive mode." }
        $ZipPath = Select-ZipFile
    }
    $ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
    if ([System.IO.Path]::GetExtension($ZipPath).ToLowerInvariant() -ne '.zip') {
        throw "The selected file is not a ZIP archive: $ZipPath"
    }

    Write-Step "Locating the Git project"
    $repositoryRoot = Get-RepositoryRoot -PreferredPath $ProjectPath
    Set-Location $repositoryRoot

    $branchName = Get-CommandOutput -Command 'git' -Arguments @('branch', '--show-current')
    $baselineCommit = Get-CommandOutput -Command 'git' -Arguments @('rev-parse', 'HEAD')
    if ([string]::IsNullOrWhiteSpace($branchName) -or [string]::IsNullOrWhiteSpace($baselineCommit)) {
        throw "Could not determine the current branch or commit."
    }

    Write-Host "Project : $repositoryRoot"
    Write-Host "Branch  : $branchName"
    Write-Host "Baseline: $baselineCommit"

    $workingTreeStatus = Get-CommandOutput -Command 'git' -Arguments @('status', '--porcelain', '--untracked-files=all')
    $selectedZipRelativePath = Get-RelativePathIfInside -ParentPath $repositoryRoot -ChildPath $ZipPath
    $statusLines = @()
    if (-not [string]::IsNullOrWhiteSpace($workingTreeStatus)) {
        $statusLines = @($workingTreeStatus -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }

    if (-not [string]::IsNullOrWhiteSpace($selectedZipRelativePath)) {
        $quotedZipPath = '"' + $selectedZipRelativePath + '"'
        $statusLines = @($statusLines | Where-Object {
            $linePath = if ($_.Length -gt 3) { $_.Substring(3).Trim() } else { '' }
            -not ($linePath -eq $selectedZipRelativePath -or $linePath -eq $quotedZipPath)
        })
        Write-WarnMessage "The selected ZIP is inside the repository. It will not be staged or committed: $selectedZipRelativePath"
    }

    if ($statusLines.Count -gt 0) {
        $remainingStatus = $statusLines -join "`n"
        throw "The working tree is not clean. No project files were changed by this runner.`nCommit or stash these changes first:`n$remainingStatus"
    }
    Write-Ok "Working tree is clean"

    Write-Step "Checking ZIP safety"
    Validate-ZipEntries -ArchivePath $ZipPath
    Write-Ok "ZIP paths are safe"

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupBranch = "backup/before-zip-patch-$timestamp"
    Invoke-CheckedCommand -Command 'git' -Arguments @('branch', $backupBranch, $baselineCommit) -FailureMessage "Could not create the safety branch."
    Write-Ok "Created safety branch: $backupBranch"

    $temporaryRoot = Join-Path $env:TEMP "sky-strike-zip-patch-$timestamp"
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null

    Write-Step "Extracting ZIP"
    Expand-Archive -LiteralPath $ZipPath -DestinationPath $temporaryRoot -Force
    $patchRoot = Find-PatchRoot -ExtractRoot $temporaryRoot
    Write-Host "Patch root: $patchRoot"

    $manifestPath = Join-Path $patchRoot 'PATCH_MANIFEST.json'
    $deleteListPath = Join-Path $patchRoot 'PATCH_DELETE.txt'
    $sourceRelativePaths = @()
    $deleteRelativePaths = @()
    $manifestCommitMessage = $null

    if (Test-Path $manifestPath) {
        Write-Step "Reading PATCH_MANIFEST.json"
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($manifest.PSObject.Properties.Name -contains 'files') { $sourceRelativePaths = @($manifest.files) }
        if ($manifest.PSObject.Properties.Name -contains 'delete') { $deleteRelativePaths = @($manifest.delete) }
        if ($manifest.PSObject.Properties.Name -contains 'commitMessage') { $manifestCommitMessage = [string]$manifest.commitMessage }
    }
    else {
        Write-Step "No manifest found; comparing full or partial project files by SHA-256"
        $sourceRelativePaths = @(Get-ChildItem -LiteralPath $patchRoot -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($patchRoot.Length).TrimStart('\', '/')
            $relative = Normalize-RelativePath $relative
            if (Test-AutoIncludedPath $relative) { $relative }
        })
    }

    if (Test-Path $deleteListPath) {
        $deleteRelativePaths += @(Get-Content -LiteralPath $deleteListPath -Encoding UTF8 | Where-Object {
            -not [string]::IsNullOrWhiteSpace($_) -and -not $_.TrimStart().StartsWith('#')
        })
    }

    $sourceRelativePaths = @($sourceRelativePaths | ForEach-Object { Assert-SafeRelativePath ([string]$_) } | Sort-Object -Unique)
    $deleteRelativePaths = @($deleteRelativePaths | ForEach-Object { Assert-SafeRelativePath ([string]$_) } | Sort-Object -Unique)
    if ($sourceRelativePaths.Count -eq 0 -and $deleteRelativePaths.Count -eq 0) {
        throw "No applicable project files were found in the ZIP."
    }

    foreach ($relativePath in $sourceRelativePaths) {
        $sourcePath = Join-Path $patchRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "A manifest file entry does not exist in the ZIP: $relativePath"
        }

        $destinationPath = Join-Path $repositoryRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        $status = 'NEW'
        if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
            if ((Get-FileSha256 $sourcePath) -eq (Get-FileSha256 $destinationPath)) { continue }
            $status = 'MODIFIED'
        }

        $plan += [PSCustomObject]@{
            Status = $status
            Path = $relativePath
            Source = $sourcePath
            Destination = $destinationPath
        }
    }

    foreach ($relativePath in $deleteRelativePaths) {
        $destinationPath = Join-Path $repositoryRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if (Test-Path -LiteralPath $destinationPath) {
            $plan += [PSCustomObject]@{
                Status = 'DELETE'
                Path = $relativePath
                Source = $null
                Destination = $destinationPath
            }
        }
    }

    $plan = @($plan | Sort-Object Path, Status)
    $reportDirectory = Join-Path $repositoryRoot '.git\patch-runner'
    New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
    $reportPath = Join-Path $reportDirectory "patch-report-$timestamp.txt"
    @(
        "ZIP: $ZipPath",
        "Project: $repositoryRoot",
        "Branch: $branchName",
        "Baseline: $baselineCommit",
        "Safety branch: $backupBranch",
        "Patch root: $patchRoot",
        "",
        "Planned changes:"
    ) + @($plan | ForEach-Object { "{0}`t{1}" -f $_.Status, $_.Path }) |
        Set-Content -LiteralPath $reportPath -Encoding UTF8

    Write-Step "Patch plan"
    if ($plan.Count -eq 0) {
        Write-Ok "The ZIP contains no changes compared with the current project."
        Write-Host "Report: $reportPath"
        exit 0
    }

    $plan | Select-Object Status, Path | Format-Table -AutoSize | Out-Host
    Write-Host "Total changed paths: $($plan.Count)"
    Write-Host "Report: $reportPath"

    Write-Step "Applying changed files"
    $mutationStarted = $true
    foreach ($item in $plan) {
        if ($item.Status -eq 'DELETE') {
            Remove-Item -LiteralPath $item.Destination -Recurse -Force
            continue
        }
        $destinationDirectory = Split-Path -Parent $item.Destination
        if (-not (Test-Path $destinationDirectory)) {
            New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        }
        Copy-Item -LiteralPath $item.Source -Destination $item.Destination -Force
    }
    Write-Ok "Patch files were applied"

    Write-Step "Checking Git diff integrity"
    Invoke-CheckedCommand -Command 'git' -Arguments @('diff', '--check') -FailureMessage "git diff --check found whitespace or patch errors."
    Write-Ok "git diff --check passed"

    Write-Step "Scanning files touched by this ZIP"

    # Scan only files that this patch actually created or modified.
    # Pre-existing project files outside the current patch must not make an otherwise
    # valid patch fail validation.
    $textExtensions = @('.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.md', '.txt')
    $sourceExtensions = @('.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html')

    $touchedTextFiles = @(
        $plan |
            Where-Object { $_.Status -ne 'DELETE' -and (Test-Path -LiteralPath $_.Destination) } |
            ForEach-Object {
                $extension = [System.IO.Path]::GetExtension($_.Destination).ToLowerInvariant()
                if ($textExtensions -contains $extension) { $_.Destination }
            }
    )

    # Match real Git conflict marker lines only. A decorative separator such as
    # "========================================" is not a conflict marker.
    $mergeMarkerPattern = '^(<<<<<<<(?: .*)?|=======|>>>>>>>(?: .*)?|\|\|\|\|\|\|\|(?: .*)?)\s*$'
    $mergeMarkerMatches = @($touchedTextFiles | Select-String -Pattern $mergeMarkerPattern)
    if ($mergeMarkerMatches.Count -gt 0) {
        $mergeMarkerMatches | ForEach-Object { Write-Host $_.ToString() }
        throw "Merge-conflict markers were found in files touched by this ZIP."
    }

    $touchedSourceFiles = @(
        $touchedTextFiles | Where-Object {
            $sourceExtensions -contains ([System.IO.Path]::GetExtension($_).ToLowerInvariant())
        }
    )

    $shellCommandMatches = @($touchedSourceFiles | Select-String -Pattern '^\s*(git\s+(add|commit|push|pull|switch|status|branch|reset)|npm\.cmd\s+|npx\.cmd\s+|PS\s+[A-Za-z]:\\|Copy-Item\s+|Get-ChildItem\s+|Expand-Archive\s+)')
    if ($shellCommandMatches.Count -gt 0) {
        $shellCommandMatches | ForEach-Object { Write-Host $_.ToString() }
        throw "Possible accidental terminal commands were found inside source files touched by this ZIP."
    }
    Write-Ok "Touched-file contamination scan passed"

    Write-Step "Checking package metadata"
    if (Test-Path (Join-Path $repositoryRoot 'package.json')) {
        Invoke-CheckedCommand -Command 'node' -Arguments @('-e', "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')") -FailureMessage "package.json is not valid JSON."
    }
    if (Test-Path (Join-Path $repositoryRoot 'package-lock.json')) {
        Invoke-CheckedCommand -Command 'node' -Arguments @('-e', "JSON.parse(require('fs').readFileSync('package-lock.json','utf8')); console.log('package-lock.json OK')") -FailureMessage "package-lock.json is not valid JSON."
    }

    $packageFilesChanged = @($plan | Where-Object { $_.Path -in @('package.json', 'package-lock.json', 'pnpm-lock.yaml') }).Count -gt 0
    $nodeModulesPath = Join-Path $repositoryRoot 'node_modules'
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Step "Installing dependencies because node_modules is missing"
        if (Test-Path (Join-Path $repositoryRoot 'package-lock.json')) {
            Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('ci') -FailureMessage "npm ci failed."
        }
        else {
            Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('install') -FailureMessage "npm install failed."
        }
    }
    elseif ($packageFilesChanged) {
        Write-Step "Synchronizing dependencies because package metadata changed"
        Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('install') -FailureMessage "npm install failed after package metadata changes."
    }

    $packageObject = Get-Content -LiteralPath (Join-Path $repositoryRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $scriptNames = @()
    if ($null -ne $packageObject.scripts) { $scriptNames = @($packageObject.scripts.PSObject.Properties.Name) }

    if ($scriptNames -contains 'typecheck') {
        Write-Step "Running npm typecheck"
        Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('run', 'typecheck') -FailureMessage "Type checking failed."
        Write-Ok "Type checking passed"
    }
    if ($scriptNames -contains 'lint') {
        Write-Step "Running npm lint"
        Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('run', 'lint') -FailureMessage "Linting failed."
        Write-Ok "Linting passed"
    }
    if (-not $NoBuild -and $scriptNames -contains 'build') {
        Write-Step "Running production build"
        Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('run', 'build') -FailureMessage "Production build failed."
        Write-Ok "Production build passed"
    }
    elseif ($NoBuild) {
        Write-WarnMessage "Build validation was skipped by -NoBuild."
    }
    else {
        Write-WarnMessage "No npm build script was found."
    }

    Write-Step "Final Git summary"
    & git status --short --untracked-files=all | Out-Host
    & git diff --stat | Out-Host

    # Commit-message priority:
    # 1) explicit -CommitMessage supplied by the user/caller
    # 2) PATCH_MANIFEST.json commitMessage, when present
    # 3) extracted patch folder name
    # 4) ZIP filename when the patch folder name is not meaningful
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        if (-not [string]::IsNullOrWhiteSpace($manifestCommitMessage)) {
            $CommitMessage = $manifestCommitMessage.Trim()
        }
        else {
            $CommitMessage = Get-AutomaticCommitMessage -PatchRoot $patchRoot -TemporaryRoot $temporaryRoot -ArchivePath $ZipPath -RepositoryRoot $repositoryRoot
        }
    }

    Write-Host "Default commit message: $CommitMessage" -ForegroundColor DarkCyan

    $shouldCommit = $Commit -or $Push
    $shouldPush = $Push
    if (-not $NonInteractive -and -not $shouldCommit) {
        Write-Host ""
        Write-Host "Validation completed successfully." -ForegroundColor Green
        Write-Host "Commit message: $CommitMessage" -ForegroundColor Cyan
        Write-Host "Press Enter to leave changes uncommitted."
        Write-Host "Enter C to commit, P to commit and push, or M to enter a custom commit message."
        $choice = (Read-Host "Choice").Trim().ToUpperInvariant()
        if ($choice -eq 'C') { $shouldCommit = $true }
        elseif ($choice -eq 'P') { $shouldCommit = $true; $shouldPush = $true }
        elseif ($choice -eq 'M') {
            $customCommitMessage = (Read-Host "Commit message").Trim()
            if ([string]::IsNullOrWhiteSpace($customCommitMessage)) {
                Write-WarnMessage "No custom message was entered. Using the automatic message: $CommitMessage"
            }
            else {
                $CommitMessage = $customCommitMessage
            }
            $shouldCommit = $true
        }
    }

    if ($shouldCommit) {
        Write-Step "Creating Git commit"
        foreach ($item in $plan) {
            Invoke-CheckedCommand -Command 'git' -Arguments @('add', '-A', '--', $item.Path) -FailureMessage "git add failed for $($item.Path)."
        }
        $stagedStatus = Get-CommandOutput -Command 'git' -Arguments @('diff', '--cached', '--name-only')
        if ([string]::IsNullOrWhiteSpace($stagedStatus)) {
            Write-WarnMessage "There are no staged changes to commit."
        }
        else {
            Invoke-CheckedCommand -Command 'git' -Arguments @('commit', '-m', $CommitMessage) -FailureMessage "git commit failed."
            Write-Ok "Created commit: $CommitMessage"
        }
    }

    if ($shouldPush) {
        Write-Step "Pushing current branch"
        $upstream = Get-CommandOutput -Command 'git' -Arguments @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
        if ([string]::IsNullOrWhiteSpace($upstream)) {
            Invoke-CheckedCommand -Command 'git' -Arguments @('push', '-u', 'origin', $branchName) -FailureMessage "git push failed."
        }
        else {
            Invoke-CheckedCommand -Command 'git' -Arguments @('push') -FailureMessage "git push failed."
        }
        Write-Ok "Push completed"
    }

    Write-Host ""
    Write-Host "PATCH COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "Safety branch: $backupBranch"
    Write-Host "Report       : $reportPath"
    exit 0
}
catch {
    Write-Host ""
    Write-Host "PATCH FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if ($mutationStarted -and -not [string]::IsNullOrWhiteSpace($repositoryRoot) -and (Test-Path $repositoryRoot)) {
        try {
            Restore-AppliedPatch -RepositoryRoot $repositoryRoot -Plan $plan
        }
        catch {
            Write-WarnMessage "Path-scoped restore also failed: $($_.Exception.Message)"
            Write-WarnMessage "No destructive automatic recovery command was run. Review git status manually."
        }
    }
    else {
        Write-WarnMessage "Failure occurred before patch files were applied. The project was not modified."
    }

    if (-not [string]::IsNullOrWhiteSpace($backupBranch)) { Write-Host "Safety branch retained: $backupBranch" }
    if (-not [string]::IsNullOrWhiteSpace($reportPath)) { Write-Host "Report: $reportPath" }
    exit 1
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($temporaryRoot) -and (Test-Path $temporaryRoot)) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $originalLocation) { Set-Location $originalLocation }
}
