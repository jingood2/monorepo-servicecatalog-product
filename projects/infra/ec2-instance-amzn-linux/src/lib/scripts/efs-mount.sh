#!/bin/bash

yum install -y amazon-efs-utils
yum install -y nfs-utils

if [ -e `${fileSystem.fileSystemId}` ]; then
    file_system_id_1=`${fileSystem.fileSystemId}`
    access_point_id=`${accessPoint.accessPointId}`
    efs_mount_point_1=`${accessPointPath.valueAsString}`
    mkdir -p `${efs_mount_point_1}`
    echo `${file_system_id_1} ${efs_mount_point_1} efs _netdev,noresvport,tls,accesspoint=${access_point_id} 0 0` >> /etc/fstab
fi

mount -a