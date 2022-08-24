#!/bin/bash

if [ $VOLUME_A -gt 0 &&  ]; then
    mkfs.ext4 /dev/sdb
    mkdir -p /mnt/data1
    echo "/dev/sdb /mnt/data1 ext4 defaults,noatime 1 1" >> /etc/fstab
fi

if [ $VOLUME_B -gt 0 &&  ]; then
    mkfs.ext4 /dev/sdc
    mkdir -p /mnt/data2
    echo "/dev/sdc /mnt/data2 ext4 defaults,noatime 1 1" >> /etc/fstab
fi

if [ $VOLUME_C -gt 0 &&  ]; then
    mkfs.ext4 /dev/sdd
    mkdir -p /mnt/data3
    echo "/dev/sdd /mnt/data3 ext4 defaults,noatime 1 1" >> /etc/fstab
fi