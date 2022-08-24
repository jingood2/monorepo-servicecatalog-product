Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0

--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"

#cloud-config
cloud_config_modules:
    - [runcmd, always]
    - [bootcmd, always]
cloud_final_modules:
    - [bootcmd, runcmd, scripts-user, always]

runcmd:
    - [ sh, -c 'echo "Part 5a" >> /var/log/order1.log' ]
    - sudo echo "Part 5b" >> /var/log/order.log

--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"

#!/bin/bash
/bin/echo "Hello World" >> /tmp/testfile.txt
--//--