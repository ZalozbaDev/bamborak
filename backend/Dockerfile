FROM python:3.10-buster

# docker build --progress=plain -t bamborak_backend .

WORKDIR /usr/app/src

RUN apt update -y
RUN apt-get install libsndfile1 -y
RUN apt install sox -y
RUN apt install libsox-fmt-all -y

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

RUN mkdir tts_models

EXPOSE 8080

RUN chmod u+x start.sh

CMD ["./start.sh", "logs"]
