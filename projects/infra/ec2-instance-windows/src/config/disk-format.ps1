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

    (setup_disk $num $label $letter)
}