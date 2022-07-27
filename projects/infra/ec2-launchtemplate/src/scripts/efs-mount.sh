#!/bin/bash -xe
"yum check-update -y",    // Ubuntu: apt-get -y update
"yum upgrade -y",                                 // Ubuntu: apt-get -y upgrade
"yum install -y amazon-efs-utils",                // Ubuntu: apt-get -y install amazon-efs-utils
"yum install -y nfs-utils",                       // Ubuntu: apt-get -y install nfs-common
"file_system_id_1=" + fileSystem.fileSystemId,
"efs_mount_point_1=/mnt/efs/fs1",
"mkdir -p \"${efs_mount_point_1}\"",
"test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
"echo \"${file_system_id_1}.efs." + Stack.of(this).region + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
"mount -a -t efs,nfs4 defaults