FROM python:3.10-bullseye

# docker build --progress=plain -t bamborak_backend .

WORKDIR /usr/app/src

RUN sed -i 's|http://deb.debian.org/debian|https://deb.debian.org/debian|g' /etc/apt/sources.list && find /etc/apt/sources.list.d -type f -exec sed -i 's|http://deb.debian.org/debian|https://deb.debian.org/debian|g' {} +

RUN apt-get update -o Acquire::AllowInsecureRepositories=true -o Acquire::Check-Valid-Until=false && apt-get install -y debian-archive-keyring && apt-get update -o Acquire::AllowInsecureRepositories=true -o Acquire::Check-Valid-Until=false
RUN apt-get install --no-install-recommends -y libsndfile1 sox libsox-fmt-all \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# RUN pip install -U pip

COPY requirements.txt requirements_pinned.txt /

# RUN pip install -r /requirements.txt
# RUN pip freeze

RUN pip install -r /requirements_pinned.txt

RUN mkdir temp
RUN mkdir logs

COPY ./ /usr/app/src/

RUN mkdir /usr/app/src/tts_models

COPY ./tts_models /usr/app/src/tts_models

EXPOSE 8080

RUN chmod u+x start.sh

CMD ["./start.sh", "logs"]
