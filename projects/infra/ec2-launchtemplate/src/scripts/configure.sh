#!/bin/bash -xe
date > /tmp/run.log
# OS update
yum update -y
# install
yum install jq awslogs -y
# AWS_DEFAULT_REGION
REGION=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone | sed -e 's/.$//g'`
export AWS_DEFAULT_REGION=${REGION}
# get cfn-stack-name
INSTANCEID=`curl -s http://169.254.169.254/latest/meta-data/instance-id`
STACKNAME=`aws ec2 describe-instances --instance-ids ${INSTANCEID} | jq .Reservations[].Instances[].Tags[] | jq -r 'select(.Key =="aws:cloudformation:stack-name").Value'`
# awslogs setting
LOGGROUPNAME="${STACKNAME}-oslogs"
OSLOGFILES=(/var/log/messages /var/log/cloud-init.log /var/log/cron /var/log/secure /var/log/yum.log)
# backup (conf)
mkdir -p /root/backup/awslogs
/bin/cp -f --backup=numbered /etc/awslogs/awscli.conf /etc/awslogs/awslogs.conf /root/backup/awslogs/
# awscli.conf
/usr/bin/cat /etc/awslogs/awscli.conf | sed "s/^region = us-east-1$/region = ${REGION}/g" | tee /etc/awslogs/awscli.conf.new
if ! diff -q /etc/awslogs/awscli.conf.new /etc/awslogs/awscli.conf &>/dev/null; then
    /usr/bin/cat /etc/awslogs/awscli.conf.new > /etc/awslogs/awscli.conf
fi
# awslogs.conf
echo '[general]' > /etc/awslogs/awslogs.conf
echo 'state_file = /var/lib/awslogs/agent-state' >> /etc/awslogs/awslogs.conf
for LOGFILE in ${OSLOGFILES[@]}; do
    echo -e "[${LOGFILE}] \ndatetime_format = %b %d %H:%M:%S \nfile = ${LOGFILE} \nbuffer_duration = 5000 \nlog_stream_name = {instance_id}_${LOGFILE} \ninitial_position = start_of_file \nlog_group_name = ${LOGGROUPNAME}" | tee -a /etc/awslogs/awslogs.conf
done

if [ -x /usr/bin/systemctl ]; then
    systemctl start awslogsd.service
    systemctl status awslogsd.service
    systemctl enable awslogsd.service
    systemctl is-enabled awslogsd.service
else
    service awslogs start
    chkconfig awslogs on
fi

# /dev/xvdf mount
if [ -e /dev/xvdf ]; then
    if [ ! -e /mnt/xvdf ]; then
    mkfs.xfs /dev/xvdf
    mkdir -p /mnt/xvdf
    echo "/dev/xvdf /mnt/xvdf xfs defaults,noatime 1 1" >> /etc/fstab
    mount /mnt/xvdf
    fi
fi
# swap
if [ ! -f /swapfile ]; then
    dd if=/dev/zero of=/swapfile bs=1M count=128
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
fi            