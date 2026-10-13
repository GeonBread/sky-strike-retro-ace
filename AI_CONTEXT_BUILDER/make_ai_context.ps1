# Hobanwoo Graduation Operation - AI context packer
# Recommended placement: <PROJECT_ROOT>\AI_CONTEXT_BUILDER\
# The script also supports the legacy layout where it sits next to the project folder.
# Double-click MAKE_AI_CONTEXT.bat.

$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
# User settings
# -----------------------------------------------------------------------------
$PreferredProjectName = 'hobanwoo-graduation-operation'

# If $false, generated/vendor folders are omitted from the tree text.
# Project-owned assets (PNG/JPG/audio/etc.) are STILL listed by filename in the tree.
# Set to $true only if you literally want node_modules/dist names too (usually enormous).
$IncludeGeneratedDirsInTree = $false

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = (Get-Location).Path }
$ScriptDir = (Resolve-Path -LiteralPath $ScriptDir).Path

function Get-RelativePathText {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$FullPath
    )

    $relative = $FullPath.Substring($Root.Length)
    return $relative.TrimStart([char[]]'\/')
}

function Get-FilesPruned {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string[]]$ExcludedDirectories
    )

    $items = @(Get-ChildItem -LiteralPath $Directory -Force -ErrorAction SilentlyContinue)
    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            if ($ExcludedDirectories -contains $item.Name) { continue }
            Get-FilesPruned -Directory $item.FullName -ExcludedDirectories $ExcludedDirectories
        } else {
            $item
        }
    }
}

function Add-TreeLines {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $false)][AllowEmptyString()][string]$Prefix = '',
        [Parameter(Mandatory = $true)][System.Text.StringBuilder]$Builder,
        [Parameter(Mandatory = $true)][string[]]$ExcludedDirectories
    )

    $children = @(
        Get-ChildItem -LiteralPath $Directory -Force -ErrorAction SilentlyContinue |
        Where-Object {
            if ($_.PSIsContainer -and ($ExcludedDirectories -contains $_.Name)) { return $false }
            return $true
        } |
        Sort-Object @{ Expression = { if ($_.PSIsContainer) { 0 } else { 1 } } }, @{ Expression = { $_.Name.ToLowerInvariant() } }
    )

    for ($i = 0; $i -lt $children.Count; $i++) {
        $item = $children[$i]
        $isLast = ($i -eq ($children.Count - 1))
        $branch = if ($isLast) { '`-- ' } else { '|-- ' }
        [void]$Builder.AppendLine($Prefix + $branch + $item.Name)

        if ($item.PSIsContainer) {
            $nextPrefix = $Prefix + $(if ($isLast) { '    ' } else { '|   ' })
            Add-TreeLines -Directory $item.FullName -Prefix $nextPrefix -Builder $Builder -ExcludedDirectories $ExcludedDirectories
        }
    }
}

function Test-IsSecretFile {
    param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

    $name = $File.Name.ToLowerInvariant()
    $ext = $File.Extension.ToLowerInvariant()

    if ($name -eq '.env' -or $name.StartsWith('.env.')) { return $true }
    if ($ext -in @('.pem', '.key', '.p12', '.pfx', '.cer', '.crt', '.der', '.keystore', '.jks')) { return $true }
    if ($name -match 'credential|credentials|service[-_]?account|private[-_]?key|secret') { return $true }

    return $false
}

function Test-IncludeInSourceZip {
    param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

    if (Test-IsSecretFile -File $File) { return $false }

    $allowedExtensions = @(
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.html', '.htm', '.css', '.scss', '.sass', '.less',
        '.json', '.md', '.txt', '.sql', '.toml', '.yaml', '.yml', '.xml',
        '.ini', '.cfg', '.conf',
        '.ps1', '.bat', '.cmd', '.sh',
        '.py', '.java', '.kt', '.kts', '.go', '.rs',
        '.c', '.h', '.cpp', '.hpp', '.cc', '.cs',
        '.vue', '.svelte', '.graphql', '.gql'
    )

    $specialNames = @(
        '.gitignore', '.gitattributes', '.npmrc', '.nvmrc',
        'dockerfile', 'makefile', 'procfile', 'license', 'license.txt'
    )

    $ext = $File.Extension.ToLowerInvariant()
    $name = $File.Name.ToLowerInvariant()

    if ($allowedExtensions -contains $ext) { return $true }
    if ($specialNames -contains $name) { return $true }

    return $false
}

function Invoke-GitText {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    try {
        $output = & git -C $ProjectRoot @Arguments 2>$null
        if ($LASTEXITCODE -ne 0) { return @() }
        return @($output)
    } catch {
        return @()
    }
}

# -----------------------------------------------------------------------------
# Locate project
# -----------------------------------------------------------------------------
Write-Host '==> Locating project' -ForegroundColor Cyan

function Test-ProjectRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (Test-Path -LiteralPath (Join-Path $Path 'package.json') -PathType Leaf) -and
           (Test-Path -LiteralPath (Join-Path $Path 'src') -PathType Container) -and
           (Test-Path -LiteralPath (Join-Path $Path 'public') -PathType Container)
}

function Resolve-ProjectRootFromToolLocation {
    param([Parameter(Mandatory = $true)][string]$StartDirectory)

    # Preferred/current layout:
    #   <project>\AI_CONTEXT_BUILDER\MAKE_AI_CONTEXT.bat
    # Walk upward so the tool may live in any small subfolder inside the project.
    $cursor = (Resolve-Path -LiteralPath $StartDirectory).Path
    for ($depth = 0; $depth -le 8; $depth++) {
        if (Test-ProjectRoot -Path $cursor) {
            return $cursor
        }

        $parent = Split-Path -Parent $cursor
        if (-not $parent -or $parent -eq $cursor) { break }
        $cursor = $parent
    }

    # Legacy layout:
    #   <parent>\MAKE_AI_CONTEXT.bat
    #   <parent>\<project>\
    $preferred = Join-Path $StartDirectory $PreferredProjectName
    if ((Test-Path -LiteralPath $preferred -PathType Container) -and (Test-ProjectRoot -Path $preferred)) {
        return (Resolve-Path -LiteralPath $preferred).Path
    }

    $candidates = @(
        Get-ChildItem -LiteralPath $StartDirectory -Directory -Force -ErrorAction SilentlyContinue |
        Where-Object { Test-ProjectRoot -Path $_.FullName }
    )

    if ($candidates.Count -eq 1) {
        return $candidates[0].FullName
    }

    if ($candidates.Count -gt 1) {
        $names = ($candidates | ForEach-Object { $_.Name }) -join ', '
        throw "Multiple project candidates found next to this tool: $names. Put the tool inside the target project under AI_CONTEXT_BUILDER, or rename the target folder to '$PreferredProjectName'."
    }

    throw "Project root not found. Recommended layout: <project>\AI_CONTEXT_BUILDER\MAKE_AI_CONTEXT.bat (project root must contain package.json, src, and public)."
}

$ProjectRoot = Resolve-ProjectRootFromToolLocation -StartDirectory $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectRoot
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# Keep generated snapshots OUTSIDE the Git repository even when the tool itself
# lives inside <project>\AI_CONTEXT_BUILDER. This avoids dirtying the working tree.
$projectPrefix = $ProjectRoot.TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
$scriptFull = $ScriptDir.TrimEnd([char[]]'\/')
$isToolInsideProject = $scriptFull.Equals($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
                       $scriptFull.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)

if ($isToolInsideProject) {
    $OutputDirectory = Split-Path -Parent $ProjectRoot
} else {
    $OutputDirectory = $ScriptDir
}

$OutputZip = Join-Path $OutputDirectory ("{0}-AI_CONTEXT-{1}.zip" -f $ProjectName, $Stamp)
$TreeTxt = Join-Path $OutputDirectory ("{0}-PROJECT_FILE_INDEX-{1}.txt" -f $ProjectName, $Stamp)

Write-Host ("Project : {0}" -f $ProjectRoot)
Write-Host ("Tool    : {0}" -f $ScriptDir)
Write-Host ("Output  : {0}" -f $OutputZip)
Write-Host ("Tree    : {0}" -f $TreeTxt)

# -----------------------------------------------------------------------------
# Directory policies
# -----------------------------------------------------------------------------
$SourceExcludedDirectories = @(
    '.git', 'node_modules', 'dist', 'build', 'coverage',
    '.vite', '.cache', '.next', 'out', '__pycache__'
)

if ($IncludeGeneratedDirsInTree) {
    $TreeExcludedDirectories = @('.git')
} else {
    $TreeExcludedDirectories = $SourceExcludedDirectories
}

# -----------------------------------------------------------------------------
# Build full project structure text
# -----------------------------------------------------------------------------
Write-Host '==> Building full project file index' -ForegroundColor Cyan

$treeBuilder = New-Object System.Text.StringBuilder
[void]$treeBuilder.AppendLine('[Sky Strike / Retro Ace - Project File Index]')
[void]$treeBuilder.AppendLine(('Generated : {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')))
[void]$treeBuilder.AppendLine(('Project   : {0}' -f $ProjectName))
[void]$treeBuilder.AppendLine('')
[void]$treeBuilder.AppendLine('This file lists project-owned folders and EVERY file name, including image/audio/font asset names.')
if (-not $IncludeGeneratedDirsInTree) {
    [void]$treeBuilder.AppendLine(('Generated/vendor directories omitted from this text: {0}' -f ($TreeExcludedDirectories -join ', ')))
    [void]$treeBuilder.AppendLine('Set $IncludeGeneratedDirsInTree = $true in make_ai_context.ps1 if you literally want those directories listed too.')
}
[void]$treeBuilder.AppendLine('')
[void]$treeBuilder.AppendLine('[TREE]')
[void]$treeBuilder.AppendLine($ProjectName)
Add-TreeLines -Directory $ProjectRoot -Builder $treeBuilder -ExcludedDirectories $TreeExcludedDirectories

$treeFiles = @(Get-FilesPruned -Directory $ProjectRoot -ExcludedDirectories $TreeExcludedDirectories)
$treeRelativeFiles = @($treeFiles | ForEach-Object { Get-RelativePathText -Root $ProjectRoot -FullPath $_.FullName } | Sort-Object)

[void]$treeBuilder.AppendLine('')
[void]$treeBuilder.AppendLine('[ALL FILE PATHS]')
foreach ($relative in $treeRelativeFiles) {
    [void]$treeBuilder.AppendLine($relative)
}

[System.IO.File]::WriteAllText($TreeTxt, $treeBuilder.ToString(), (New-Object System.Text.UTF8Encoding($true)))
Write-Host ("[OK] Project index written ({0} files listed)" -f $treeRelativeFiles.Count) -ForegroundColor Green

# -----------------------------------------------------------------------------
# Gather source/code files only
# -----------------------------------------------------------------------------
Write-Host '==> Selecting source/code files' -ForegroundColor Cyan

$projectFiles = @(Get-FilesPruned -Directory $ProjectRoot -ExcludedDirectories $SourceExcludedDirectories)
$includedFiles = @($projectFiles | Where-Object { Test-IncludeInSourceZip -File $_ })
$includedRelative = @($includedFiles | ForEach-Object { Get-RelativePathText -Root $ProjectRoot -FullPath $_.FullName } | Sort-Object)

if ($includedFiles.Count -eq 0) {
    throw 'No source/code files were selected. Nothing to package.'
}

# -----------------------------------------------------------------------------
# Stage source files and generated context metadata
# -----------------------------------------------------------------------------
$TempRoot = Join-Path $env:TEMP ('sky-strike-ai-context-' + [Guid]::NewGuid().ToString('N'))
$StageRoot = Join-Path $TempRoot 'stage'
$ContextDir = Join-Path $StageRoot '__CHAT_CONTEXT__'
New-Item -ItemType Directory -Path $ContextDir -Force | Out-Null

try {
    Write-Host '==> Copying selected source/code files to temporary staging' -ForegroundColor Cyan

    foreach ($file in $includedFiles) {
        $relative = Get-RelativePathText -Root $ProjectRoot -FullPath $file.FullName
        $destination = Join-Path $StageRoot $relative
        $destinationDirectory = Split-Path -Parent $destination
        if (-not (Test-Path -LiteralPath $destinationDirectory)) {
            New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
    }

    # Git metadata, if Git is installed and the project is a repository.
    $gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
    $gitBranch = ''
    $gitHead = ''
    $gitStatus = @()
    $gitLog = @()

    if ($gitAvailable -and (Test-Path -LiteralPath (Join-Path $ProjectRoot '.git'))) {
        $gitBranch = (Invoke-GitText -Arguments @('rev-parse', '--abbrev-ref', 'HEAD') | Select-Object -First 1)
        $gitHead = (Invoke-GitText -Arguments @('rev-parse', 'HEAD') | Select-Object -First 1)
        $gitStatus = Invoke-GitText -Arguments @('status', '--short')
        $gitLog = Invoke-GitText -Arguments @('log', '-10', '--oneline')
    }

    $startMessage = @"
[Sky Strike / Retro Ace - AI_CONTEXT]

This ZIP is a SOURCE-ONLY snapshot for continuing development in a new ChatGPT conversation.

IMPORTANT RULES FOR THE NEXT CHAT:
1. The files in THIS ZIP are the current code baseline and take priority over older chats, patches, memories, or Git states.
2. Binary assets such as PNG/JPG/WebP/audio/video/font files are intentionally NOT included to keep the ZIP small.
3. The complete project-owned file/folder structure and asset filenames are recorded in 03_PROJECT_FILE_INDEX.txt.
4. Do not recreate or replace omitted assets just because their binary files are absent from this ZIP. Use the paths/names in the file index as reference.
5. Preserve all existing changes already present in these source files. Make only the minimum edits required by the new request.
6. If another parallel chat changes the same shared file after this snapshot was created, create a NEW AI_CONTEXT ZIP before editing that shared file again.
7. Environment/secrets (.env, private keys, credentials) are intentionally excluded from the ZIP.

Project: $ProjectName
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')
"@
    [System.IO.File]::WriteAllText((Join-Path $ContextDir '00_START_MESSAGE.txt'), $startMessage, (New-Object System.Text.UTF8Encoding($true)))

    $gitStateBuilder = New-Object System.Text.StringBuilder
    [void]$gitStateBuilder.AppendLine('[GIT STATE]')
    [void]$gitStateBuilder.AppendLine(('Project: {0}' -f $ProjectName))
    if ($gitAvailable -and (Test-Path -LiteralPath (Join-Path $ProjectRoot '.git'))) {
        [void]$gitStateBuilder.AppendLine(('Branch : {0}' -f $gitBranch))
        [void]$gitStateBuilder.AppendLine(('HEAD   : {0}' -f $gitHead))
        [void]$gitStateBuilder.AppendLine('')
        [void]$gitStateBuilder.AppendLine('[git status --short]')
        if ($gitStatus.Count -eq 0) {
            [void]$gitStateBuilder.AppendLine('(clean)')
        } else {
            foreach ($line in $gitStatus) { [void]$gitStateBuilder.AppendLine($line) }
        }
        [void]$gitStateBuilder.AppendLine('')
        [void]$gitStateBuilder.AppendLine('[git log -10 --oneline]')
        foreach ($line in $gitLog) { [void]$gitStateBuilder.AppendLine($line) }
    } else {
        [void]$gitStateBuilder.AppendLine('Git metadata unavailable (Git not installed or .git directory not found).')
    }
    [System.IO.File]::WriteAllText((Join-Path $ContextDir '01_GIT_STATE.txt'), $gitStateBuilder.ToString(), (New-Object System.Text.UTF8Encoding($true)))

    $includedBuilder = New-Object System.Text.StringBuilder
    [void]$includedBuilder.AppendLine('[INCLUDED SOURCE/CODE FILES]')
    [void]$includedBuilder.AppendLine(('Count: {0}' -f $includedRelative.Count))
    [void]$includedBuilder.AppendLine('')
    foreach ($relative in $includedRelative) {
        [void]$includedBuilder.AppendLine($relative)
    }
    [System.IO.File]::WriteAllText((Join-Path $ContextDir '02_INCLUDED_FILES.txt'), $includedBuilder.ToString(), (New-Object System.Text.UTF8Encoding($true)))

    Copy-Item -LiteralPath $TreeTxt -Destination (Join-Path $ContextDir '03_PROJECT_FILE_INDEX.txt') -Force

    $manifest = [ordered]@{
        project = $ProjectName
        generatedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK')
        branch = $gitBranch
        head = $gitHead
        includedSourceFileCount = $includedRelative.Count
        indexedProjectFileCount = $treeRelativeFiles.Count
        binaryAssetsIncluded = $false
        secretsIncluded = $false
        sourceExcludedDirectories = $SourceExcludedDirectories
        note = 'Binary assets are represented by path/name in __CHAT_CONTEXT__/03_PROJECT_FILE_INDEX.txt but are not stored in this ZIP.'
    }
    $manifestJson = $manifest | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText((Join-Path $ContextDir 'AI_CONTEXT_MANIFEST.json'), $manifestJson, (New-Object System.Text.UTF8Encoding($true)))

    # -------------------------------------------------------------------------
    # Create ZIP
    # -------------------------------------------------------------------------
    Write-Host '==> Creating ZIP' -ForegroundColor Cyan

    if (Test-Path -LiteralPath $OutputZip) {
        Remove-Item -LiteralPath $OutputZip -Force
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $StageRoot,
        $OutputZip,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )

    $zipSizeMB = [math]::Round((Get-Item -LiteralPath $OutputZip).Length / 1MB, 2)

    Write-Host ''
    Write-Host '[OK] AI context created successfully' -ForegroundColor Green
    Write-Host ("ZIP              : {0}" -f $OutputZip)
    Write-Host ("Project index    : {0}" -f $TreeTxt)
    Write-Host ("Source files     : {0}" -f $includedRelative.Count)
    Write-Host ("Indexed files    : {0}" -f $treeRelativeFiles.Count)
    Write-Host ("ZIP size         : {0} MB" -f $zipSizeMB)
    Write-Host ''
    Write-Host 'Upload the ZIP and the separate PROJECT_FILE_INDEX txt to the new chat.' -ForegroundColor Yellow
} finally {
    if (Test-Path -LiteralPath $TempRoot) {
        Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
