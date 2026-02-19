# Installation

## install repo key

curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

## add repo

check the website for instructions

```code
https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html
```

currently list is stored here

```code
https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list
```

and looks like this

```code
deb https://nvidia.github.io/libnvidia-container/stable/deb/$(ARCH) /
#deb https://nvidia.github.io/libnvidia-container/experimental/deb/$(ARCH) /
```

so set up the repo like this

```code
sudo bash
echo "deb https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /" > /etc/apt/sources.list.d/nvidia-container-toolkit.list
```

## add packages

```code
apt update
apt install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
```

