<powershell>
#$instanceId = "null"
#while ($instanceId -NotLike "i-*") {
#Start-Sleep -s 3
#$instanceId = Invoke-RestMethod -uri http://169.254.169.254/latest/meta-data/instance-id
#}

#Rename-Computer -NewName ${DomainMember1NetBIOSName} -Force
#Rename-Computer -NewName "NEW_SERVER_NAME" -Force

# Install Chocolatey
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

#Function to format a disk based on the disk number, label and drive letter
function setup_disk {
	param (
			$DiskNumber,
			$Label,
			$DriveLetter
	)
	Initialize-Disk "$DiskNumber" -PartitionStyle MBR
	New-Partition -DiskNumber "$DiskNumber" -DriveLetter "$DriveLetter" -UseMaximumSize
	Format-Volume -DriveLetter "$DriveLetter" -FileSystem NTFS -NewFileSystemLabel "$Label" -Confirm:$false
}

# Create a hashtable of disk numbers and block device mappings
$hash = $null
$hash = @{}

get-disk | where partitionstyle -eq 'raw' | where-object IsSystem -eq $False| select Number | foreach-Object {
	$num = $_.Number

	$label = "Data$($num)"

	$letter = [int][char]'C';
	$letter = $letter+$num;
	$letter = [char]$letter;
	echo $num, $label, $letter

	setup_disk $num $label $letter
}


# Set TimeZone
Set-TimeZone -Name "Korea Standard Time"

Install-WindowsFeature -IncludeAllSubFeature RSAT
Restart-Computer -Force
</powershell>