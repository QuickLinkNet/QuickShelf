FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y --no-install-recommends tesseract-ocr poppler-utils python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY server.py /app/server.py
EXPOSE 7070
CMD ["python3", "/app/server.py"]
