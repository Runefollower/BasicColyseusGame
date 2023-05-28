## Lightsail instance creation

* TODO - configure in code

#### Setup the instance in lightsail
1. Choose the correct region
2. Choose Linux/Unix
3. Choose OS Only
4. Choose Amazon Linux 2
5. Add a launch script (see infrastructure/lightsail/launch_script.sh)
  ``` bash
  #!/bin/bash

# Install security updates
yum -y --security update
```
6. Choose an instance size
7. Name it
8. Create it



