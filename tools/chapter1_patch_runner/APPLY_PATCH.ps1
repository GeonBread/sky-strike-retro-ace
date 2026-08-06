[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$ZipPath,

    [string]$ProjectPath,

    [switch]$NoBuild,

    [switch]$Commit,

    [switch]$Push,

    [switch]$NonInteractive,

    [string]$CommitMessage = "wip(chapter1): apply validated ZIP patch"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnMessage {
    param([string]$Message)
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

function Normalize-RelativePath {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return ""
    }

    return $Path.Replace("\", "/").TrimStart("/")
}

function Assert-SafeRelativePath {
    param([string]$Path)

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

function Test-AutoIncludedPath {
    param([string]$Path)

    $normalized = Normalize-RelativePath $Path

    if ($normalized -match '^(src|public|docs|supabase)/') {
        return $true
    }

    $fileName = [System.IO.Path]::GetFileName($normalized)
    $directoryName = [System.IO.Path]::GetDirectoryName($normalized)

    if ([string]::IsNullOrWhiteSpace($directoryName)) {
        $allowedRootFiles = @(
            'package.json',
            'package-lock.json',
            'pnpm-lock.yaml',
            'pnpm-workspace.yaml',
            'tsconfig.json',
            'vite.config.ts',
            'vite.config.js',
            '.env.example'
        )

        if ($allowedRootFiles -contains $fileName) {
            return $true
        }

        if ($fileName -match '^README.*\.(md|txt)$') {
            return $true
        }
    }

    return $false
}

function Get-FileSha256 {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Find-PatchRoot {
    param([string]$ExtractRoot)

    if ((Test-Path (Join-Path $ExtractRoot 'PATCH_MANIFEST.json')) -or
        (Test-Path (Join-Path $ExtractRoot 'src')) -or
        (Test-Path (Join-Path $ExtractRoot 'public')) -or
        (Test-Path (Join-Path $ExtractRoot 'package.json'))) {
        return $ExtractRoot
    }

    $topDirectories = @(Get-ChildItem -LiteralPath $ExtractRoot -Directory)
    $topFiles = @(Get-ChildItem -LiteralPath $ExtractRoot -File)

    if ($topDirectories.Count -eq 1 -and $topFiles.Count -eq 0) {
        return $topDirectories[0].FullName
    }

    $candidates = @(Get-ChildItem -LiteralPath $ExtractRoot -Directory -Recurse | Where-Object {
        (Test-Path (Join-Path $_.FullName 'PATCH_MANIFEST.json')) -or
        (Test-Path (Join-Path $_.FullName 'src')) -or
        (Test-Path (Join-Path $_.FullName 'public')) -or
        (Test-Path (Join-Path $_.FullName 'package.json'))
    } | Sort-Object { $_.FullName.Length })

    if ($candidates.Count -gt 0) {
        return $candidates[0].FullName
    }

    throw "Could not identify the patch root. The ZIP must contain project-relative files such as src/, public/, or PATCH_MANIFEST.json."
}

function Select-ZipFile {
    Add-Type -AssemblyName System.Windows.Forms

    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = "Select a ZIP patch"
    $dialog.Filter = "ZIP patch (*.zip)|*.zip"
    $dialog.Multiselect = $false

    $downloads = Join-Path ([Environment]::GetFolderPath('UserProfile')) 'Downloads'
    if (Test-Path $downloads) {
        $dialog.InitialDirectory = $downloads
    }

    $result = $dialog.ShowDialog()
    if ($result -ne [System.Windows.Forms.DialogResult]::OK) {
        throw "ZIP selection was cancelled."
    }

    return $dialog.FileName
}

function Validate-ZipEntries {
    param([string]$ArchivePath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)

    try {
        foreach ($entry in $archive.Entries) {
            if ([string]::IsNullOrEmpty($entry.Name)) {
                continue
            }

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

function Get-RepositoryRoot {
    param([string]$PreferredPath)

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($PreferredPath)) {
        $candidates += $PreferredPath
    }
    $candidates += (Get-Location).Path
    $candidates += $PSScriptRoot

    foreach ($candidate in $candidates | Select-Object -Unique) {
        if (-not (Test-Path $candidate)) {
            continue
        }

        $root = & git -C $candidate rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) {
            return ($root | Select-Object -First 1).Trim()
        }
    }

    throw "No Git repository was found. Put this runner inside the project or pass -ProjectPath."
}

function Invoke-Rollback {
    param(
        [string]$BaselineCommit,
        [string]$RepositoryRoot
    )

    Write-WarnMessage "Validation failed. Restoring the clean baseline automatically."
    Set-Location $RepositoryRoot

    & git reset --hard $BaselineCommit | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-WarnMessage "Automatic git reset failed. Use: git reset --hard $BaselineCommit"
        return
    }

    & git clean -fd | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-WarnMessage "Automatic removal of new patch files failed. Use: git clean -fd"
        return
    }

    Write-Ok "The repository was restored to $BaselineCommit"
}

$originalLocation = (Get-Location).Path
$temporaryRoot = $null
$baselineCommit = $null
$backupBranch = $null
$repositoryRoot = $null
$reportPath = $null
$appliedSuccessfully = $false

try {
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
    if (-not [string]::IsNullOrWhiteSpace($workingTreeStatus)) {
        throw "The working tree is not clean. Commit or stash existing changes before applying a ZIP patch.`n$workingTreeStatus"
    }

    Write-Ok "Working tree is clean"

    if ([string]::IsNullOrWhiteSpace($ZipPath)) {
        if ($NonInteractive) {
            throw "-ZipPath is required in non-interactive mode."
        }
        $ZipPath = Select-ZipFile
    }

    $ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
    if ([System.IO.Path]::GetExtension($ZipPath).ToLowerInvariant() -ne '.zip') {
        throw "The selected file is not a ZIP archive: $ZipPath"
    }

    Write-Step "Checking ZIP safety"
    Validate-ZipEntries -ArchivePath $ZipPath
    Write-Ok "ZIP paths are safe"

    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupBranch = "backup/before-zip-patch-$timestamp"
    Invoke-CheckedCommand -Command 'git' -Arguments @('branch', $backupBranch, $baselineCommit) -FailureMessage "Could not create the safety branch."
    Write-Ok "Created safety branch: $backupBranch"

    $temporaryRoot = Join-Path $env:TEMP "sky-strike-zip-patch-$timestamp"
    if (Test-Path $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
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

        if ($manifest.PSObject.Properties.Name -contains 'files') {
            $sourceRelativePaths = @($manifest.files)
        }
        if ($manifest.PSObject.Properties.Name -contains 'delete') {
            $deleteRelativePaths = @($manifest.delete)
        }
        if ($manifest.PSObject.Properties.Name -contains 'commitMessage') {
            $manifestCommitMessage = [string]$manifest.commitMessage
        }
    }
    else {
        Write-Step "No manifest found; comparing supported project files by SHA-256"
        $sourceRelativePaths = @(Get-ChildItem -LiteralPath $patchRoot -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($patchRoot.Length).TrimStart('\', '/')
            $relative = Normalize-RelativePath $relative
            if (Test-AutoIncludedPath $relative) {
                $relative
            }
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

    $plan = @()

    foreach ($relativePath in $sourceRelativePaths) {
        $sourcePath = Join-Path $patchRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "A manifest file entry does not exist in the ZIP: $relativePath"
        }

        $destinationPath = Join-Path $repositoryRoot ($relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        $status = 'NEW'

        if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
            $sourceHash = Get-FileSha256 -Path $sourcePath
            $destinationHash = Get-FileSha256 -Path $destinationPath

            if ($sourceHash -eq $destinationHash) {
                continue
            }
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

    $reportLines = @(
        "ZIP: $ZipPath",
        "Branch: $branchName",
        "Baseline: $baselineCommit",
        "Safety branch: $backupBranch",
        "Patch root: $patchRoot",
        "",
        "Planned changes:"
    )
    $reportLines += @($plan | ForEach-Object { "{0}`t{1}" -f $_.Status, $_.Path })
    Set-Content -LiteralPath $reportPath -Value $reportLines -Encoding UTF8

    Write-Step "Patch plan"
    if ($plan.Count -eq 0) {
        Write-Ok "The ZIP contains no changes compared with the current project."
        $appliedSuccessfully = $true
        return
    }

    $plan | Select-Object Status, Path | Format-Table -AutoSize | Out-Host
    Write-Host "Total changed paths: $($plan.Count)"
    Write-Host "Report: $reportPath"

    Write-Step "Applying changed files"
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

    Write-Step "Scanning source files for merge markers and accidental shell commands"
    $scanFiles = @()
    foreach ($scanRootName in @('src', 'public', 'supabase')) {
        $scanRoot = Join-Path $repositoryRoot $scanRootName
        if (Test-Path $scanRoot) {
            $scanFiles += @(Get-ChildItem -LiteralPath $scanRoot -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.css,*.json,*.html)
        }
    }

    $mergeMarkerMatches = @($scanFiles | Select-String -Pattern '^(<<<<<<<|=======|>>>>>>>)')
    if ($mergeMarkerMatches.Count -gt 0) {
        $mergeMarkerMatches | ForEach-Object { Write-Host $_.ToString() }
        throw "Merge-conflict markers were found in project files."
    }

    $shellCommandMatches = @($scanFiles | Select-String -Pattern '^\s*(git\s+(add|commit|push|pull|switch|status|branch|reset)|npm\.cmd\s+|npx\.cmd\s+|PS\s+[A-Za-z]:\\|Copy-Item\s+|Get-ChildItem\s+|Expand-Archive\s+)')
    if ($shellCommandMatches.Count -gt 0) {
        $shellCommandMatches | ForEach-Object { Write-Host $_.ToString() }
        throw "Possible accidental terminal commands were found inside source files."
    }
    Write-Ok "Source contamination scan passed"

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

    $packageJsonPath = Join-Path $repositoryRoot 'package.json'
    $packageObject = $null
    $scriptNames = @()
    if (Test-Path $packageJsonPath) {
        $packageObject = Get-Content -LiteralPath $packageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($null -ne $packageObject.scripts) {
            $scriptNames = @($packageObject.scripts.PSObject.Properties.Name)
        }
    }

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

    if (-not $NoBuild) {
        if ($scriptNames -contains 'build') {
            Write-Step "Running production build"
            Invoke-CheckedCommand -Command 'npm.cmd' -Arguments @('run', 'build') -FailureMessage "Production build failed."
            Write-Ok "Production build passed"
        }
        else {
            Write-WarnMessage "No npm build script was found; build validation was skipped."
        }
    }
    else {
        Write-WarnMessage "Build validation was skipped by -NoBuild."
    }

    Write-Step "Final Git summary"
    & git status --short --untracked-files=all | Out-Host
    & git diff --stat | Out-Host

    $appliedSuccessfully = $true

    if (-not [string]::IsNullOrWhiteSpace($manifestCommitMessage) -and $CommitMessage -eq 'wip(chapter1): apply validated ZIP patch') {
        $CommitMessage = $manifestCommitMessage
    }

    $shouldCommit = $Commit -or $Push
    $shouldPush = $Push

    if (-not $NonInteractive -and -not $shouldCommit) {
        Write-Host ""
        Write-Host "Validation completed successfully." -ForegroundColor Green
        Write-Host "Press Enter to leave changes uncommitted."
        Write-Host "Enter C to commit, or P to commit and push."
        $choice = (Read-Host "Choice").Trim().ToUpperInvariant()
        if ($choice -eq 'C') {
            $shouldCommit = $true
        }
        elseif ($choice -eq 'P') {
            $shouldCommit = $true
            $shouldPush = $true
        }
    }

    if ($shouldCommit) {
        Write-Step "Creating Git commit"
        Invoke-CheckedCommand -Command 'git' -Arguments @('add', '-A') -FailureMessage "git add failed."

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

    if (-not $shouldCommit) {
        Write-Host ""
        Write-Host "Review and save with:"
        Write-Host "  git status"
        Write-Host "  git diff --stat"
        Write-Host "  git add -A"
        Write-Host "  git commit -m `"$CommitMessage`""
        Write-Host "  git push"
    }
}
catch {
    Write-Host ""
    Write-Host "PATCH FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    if (-not [string]::IsNullOrWhiteSpace($baselineCommit) -and
        -not [string]::IsNullOrWhiteSpace($repositoryRoot) -and
        (Test-Path $repositoryRoot)) {
        try {
            Invoke-Rollback -BaselineCommit $baselineCommit -RepositoryRoot $repositoryRoot
        }
        catch {
            Write-WarnMessage "Rollback also failed: $($_.Exception.Message)"
            Write-WarnMessage "Manual recovery command: git reset --hard $baselineCommit; git clean -fd"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($backupBranch)) {
        Write-Host "Safety branch retained: $backupBranch"
    }
    if (-not [string]::IsNullOrWhiteSpace($reportPath)) {
        Write-Host "Report: $reportPath"
    }

    exit 1
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($temporaryRoot) -and (Test-Path $temporaryRoot)) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (Test-Path $originalLocation) {
        Set-Location $originalLocation
    }
}
